import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { websiteMutationAllowed } from "@/lib/websites/draft-revision";
import {
  createWebsiteGraph,
  getWebsiteGraph,
  listWebsiteGraphVersions,
  GraphServiceError,
} from "@/lib/graph/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ websiteId: string }> };
const json = (body: unknown, status = 200) => NextResponse.json(body, {
  status, headers: { "Cache-Control": "no-store" },
});

function scope(request: Request) {
  const organizationId = request.headers.get("x-lucia-workspace-organization");
  return z.uuid().safeParse(organizationId).success ? organizationId! : null;
}

function serviceError(error: unknown) {
  if (error instanceof GraphServiceError) {
    const status = error.code === "FORBIDDEN" ? 403
      : error.code === "NOT_FOUND" ? 404
      : error.code === "CONFLICT" || error.code === "IDEMPOTENCY_MISMATCH" ? 409 : 422;
    return json({ error: error.message, code: error.code }, status);
  }
  return json({ error: "Graph request could not be completed." }, 500);
}

export async function GET(request: Request, context: Context) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return json({ error: "Sign in with LUCIA ID." }, 401);
  const account = request.headers.get("x-lucia-workspace-account");
  if (account && account !== user.id) return json({ error: "Account changed. Reload the workspace." }, 409);
  const { websiteId } = await context.params;
  if (!z.uuid().safeParse(websiteId).success) return json({ error: "Invalid website ID." }, 400);
  const organizationId = scope(request);
  if (!organizationId) return json({ error: "Select a valid workspace." }, 400);
  try {
    const graph = await getWebsiteGraph(organizationId, websiteId);
    const versions = graph ? await listWebsiteGraphVersions(organizationId, websiteId) : [];
    return json({ graph, versions });
  } catch (error) {
    return serviceError(error);
  }
}

export async function POST(request: Request, context: Context) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return json({ error: "Sign in with LUCIA ID." }, 401);
  if (!websiteMutationAllowed(request)) return json({ error: "Request origin denied." }, 403);
  const account = request.headers.get("x-lucia-workspace-account");
  if (account && account !== user.id) return json({ error: "Account changed. Reload the workspace." }, 409);
  const { websiteId } = await context.params;
  if (!z.uuid().safeParse(websiteId).success) return json({ error: "Invalid website ID." }, 400);
  const organizationId = scope(request);
  if (!organizationId) return json({ error: "Select a valid workspace." }, 400);
  try {
    return json({ graph: await createWebsiteGraph(organizationId, websiteId) }, 201);
  } catch (error) {
    return serviceError(error);
  }
}
