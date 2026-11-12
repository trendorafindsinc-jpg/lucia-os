import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { GraphServiceError, mutateWebsiteGraph } from "@/lib/graph/service";
import { websiteMutationAllowed } from "@/lib/websites/draft-revision";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ websiteId: string }> };
const json = (body: unknown, status = 200) => NextResponse.json(body, {
  status, headers: { "Cache-Control": "no-store" },
});

export async function POST(request: Request, context: Context) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return json({ error: "Sign in with LUCIA ID." }, 401);
  if (!websiteMutationAllowed(request)) return json({ error: "Request origin denied." }, 403);
  const account = request.headers.get("x-lucia-workspace-account");
  if (account && account !== user.id) return json({ error: "Account changed. Reload the workspace." }, 409);
  const { websiteId } = await context.params;
  if (!z.uuid().safeParse(websiteId).success) return json({ error: "Invalid website ID." }, 400);
  const organizationId = request.headers.get("x-lucia-workspace-organization");
  if (!z.uuid().safeParse(organizationId).success) return json({ error: "Select a valid workspace." }, 400);

  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 300_000) return json({ error: "Graph operation batch is too large." }, 413);
    body = JSON.parse(raw);
  } catch {
    return json({ error: "Submit valid JSON." }, 400);
  }
  if (!body || typeof body !== "object" || !("websiteId" in body) || body.websiteId !== websiteId) {
    return json({ error: "Website ID does not match this route." }, 400);
  }
  try {
    return json(await mutateWebsiteGraph(organizationId!, body));
  } catch (error) {
    if (error instanceof GraphServiceError) {
      const status = error.code === "FORBIDDEN" ? 403
        : error.code === "NOT_FOUND" ? 404
        : error.code === "CONFLICT" || error.code === "IDEMPOTENCY_MISMATCH" ? 409 : 422;
      return json({ error: error.message, code: error.code }, status);
    }
    if (error instanceof z.ZodError) return json({ error: "Graph operation batch is invalid.", issues: error.flatten() }, 422);
    return json({ error: "Graph mutation could not be completed." }, 500);
  }
}
