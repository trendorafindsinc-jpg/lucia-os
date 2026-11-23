import { getCurrentUser } from "@/lib/auth/session";
import { CommerceError, createCommerceProduct, listCommerceProducts } from "@/lib/commerce/catalogue";
import { websiteMutationAllowed } from "@/lib/websites/draft-revision";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ websiteId: string }> };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
const productInput = z.object({
  name: z.string().trim().min(1).max(180),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(180),
  description: z.string().max(10000).default(""),
  currency: z.enum(["NGN", "GHS", "KES", "ZAR", "USD"]),
  priceMinor: z.number().int().safe().min(0).max(9_000_000_000_000),
  compareAtPriceMinor: z.number().int().safe().min(0).max(9_000_000_000_000).nullable().default(null),
}).refine(v => v.compareAtPriceMinor === null || v.compareAtPriceMinor >= v.priceMinor, {
  message: "Compare-at price must be at least the product price.", path: ["compareAtPriceMinor"],
});

async function authorize(request: Request) {
  const user = await getCurrentUser();
  if (!user) return { error: json({ error: "Sign in with LUCIA ID." }, 401) } as const;
  const account = request.headers.get("x-lucia-workspace-account");
  if (account && account !== user.id) return { error: json({ error: "Account changed. Reload Studio." }, 409) } as const;
  return { user } as const;
}

export async function GET(request: Request, context: Context) {
  const auth = await authorize(request);
  if ("error" in auth) return auth.error;
  const { websiteId } = await context.params;
  if (!z.uuid().safeParse(websiteId).success) return json({ error: "Invalid website." }, 400);
  try {
    return json({ products: await listCommerceProducts(auth.user.id, websiteId) });
  } catch (error) {
    return json({ error: error instanceof CommerceError ? error.message : "Products could not be loaded." },
      error instanceof CommerceError ? error.status : 503);
  }
}

export async function POST(request: Request, context: Context) {
  const auth = await authorize(request);
  if ("error" in auth) return auth.error;
  if (!websiteMutationAllowed(request)) return json({ error: "Request origin denied." }, 403);
  const { websiteId } = await context.params;
  if (!z.uuid().safeParse(websiteId).success) return json({ error: "Invalid website." }, 400);
  let raw: unknown;
  try {
    const body = await request.text();
    if (body.length > 12000) return json({ error: "Product request too large." }, 413);
    raw = JSON.parse(body);
  } catch { return json({ error: "Invalid product request." }, 400); }
  const parsed = productInput.safeParse(raw);
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Invalid product details." }, 422);
  try {
    const product = await createCommerceProduct(auth.user.id, websiteId, parsed.data);
    return json({ product }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/commerce_products_site_slug_uq|duplicate key|unique constraint/i.test(message)) {
      return json({ error: "A product with that slug already exists on this website." }, 409);
    }
    return json({ error: error instanceof CommerceError ? error.message : "Product could not be saved." },
      error instanceof CommerceError ? error.status : 503);
  }
}
