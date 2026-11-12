import { getCurrentUser } from "@/lib/auth/session";
import { websiteMutationAllowed } from "@/lib/websites/draft-revision";
import { listMedia, uploadMedia, removeMedia, MediaError } from "@/lib/media/service";
import { MAX_UPLOAD_BYTES } from "@/lib/media/image";
import { z } from "zod";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ websiteId: string }> };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
async function handle(request: Request, context: Context, method: string) {
  const user = await getCurrentUser();
  if (!user) return json({ error: "Sign in with LUCIA ID." }, 401);
  const account = request.headers.get("x-lucia-workspace-account");
  if (account && account !== user.id) return json({ error: "Account changed. Reload Studio." }, 409);
  if (method !== "GET" && !websiteMutationAllowed(request)) return json({ error: "Request origin denied." }, 403);
  const { websiteId } = await context.params;
  if (!z.uuid().safeParse(websiteId).success) return json({ error: "Invalid website." }, 400);
  try {
    if (method === "GET") return json(await listMedia(user.id, websiteId));
    if (method === "DELETE") {
      const id = new URL(request.url).searchParams.get("id");
      if (!z.uuid().safeParse(id).success) return json({ error: "Invalid image." }, 400);
      await removeMedia(user.id, websiteId, id!);
      return json({ removed: true });
    }
    const length = Number(request.headers.get("content-length"));
    if (length > MAX_UPLOAD_BYTES + 8192 || !request.headers.get("content-type")?.startsWith("multipart/form-data")) return json({ error: "Use the supported image uploader (4 MB maximum)." }, 413);
    // Bound actual bytes even when Content-Length is absent or dishonest.
    const reader = request.body?.getReader();
    if (!reader) return json({ error: "Choose an image." }, 400);
    const chunks: Uint8Array[] = []; let bytes = 0;
    while (true) { const next = await reader.read(); if (next.done) break; bytes += next.value.length; if (bytes > MAX_UPLOAD_BYTES + 8192) { await reader.cancel(); return json({ error: "Image too large." }, 413); } chunks.push(next.value); }
    const form = await new Request(request.url, { method: "POST", headers: { "content-type": request.headers.get("content-type")! }, body: Buffer.concat(chunks) }).formData();
    const file = form.get("file"), alt = z.string().trim().min(1).max(200).safeParse(form.get("alt"));
    if (!(file instanceof File) || !alt.success) return json({ error: "Choose an image and describe it in 1–200 characters." }, 422);
    const image = await uploadMedia(user.id, websiteId, Buffer.from(await file.arrayBuffer()), file.type, alt.data);
    return json({ image }, 201);
  } catch (error) { return json({ error: error instanceof MediaError ? error.message : "Image operation could not be completed. Your saved website is unchanged." }, error instanceof MediaError ? error.status : 503); }
}
export const GET = (request: Request, context: Context) => handle(request, context, "GET");
export const POST = (request: Request, context: Context) => handle(request, context, "POST");
export const DELETE = (request: Request, context: Context) => handle(request, context, "DELETE");
