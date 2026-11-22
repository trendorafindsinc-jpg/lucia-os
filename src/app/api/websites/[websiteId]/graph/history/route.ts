import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getWebsiteGraphVersionSnapshot, GraphServiceError, listWebsiteGraphVersions } from "@/lib/graph/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ websiteId: string }> };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(request: Request, context: Context) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return json({ error: "Sign in with LUCIA ID." }, 401);
  const account = request.headers.get("x-lucia-workspace-account");
  if (account && account !== user.id) return json({ error: "Account changed. Reload the workspace." }, 409);
  const { websiteId } = await context.params;
  if (!z.uuid().safeParse(websiteId).success) return json({ error: "Invalid website ID." }, 400);
  const organizationId = request.headers.get("x-lucia-workspace-organization");
  if (!z.uuid().safeParse(organizationId).success) return json({ error: "Select a valid workspace." }, 400);
  try {
    const versionId = new URL(request.url).searchParams.get("versionId");
    if (versionId) {
      if (!z.uuid().safeParse(versionId).success) return json({ error: "Invalid graph version ID." }, 400);
      const version = await getWebsiteGraphVersionSnapshot(organizationId!, websiteId, versionId);
      return json({ version });
    }
    const versions = await listWebsiteGraphVersions(organizationId!, websiteId);
    return json({ versions: versions.slice(-100).reverse().map(({ id, revision, contentHash, createdAt }) => ({ id, revision, contentHash, createdAt })) });
  } catch (error) {
    if (error instanceof GraphServiceError) return json({ error: error.message }, error.code === "FORBIDDEN" ? 403 : error.code === "NOT_FOUND" ? 404 : 422);
    return json({ error: "Revision history could not be loaded." }, 500);
  }
}
