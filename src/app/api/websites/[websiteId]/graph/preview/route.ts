import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getWebsiteGraph, GraphServiceError } from "@/lib/graph/service";
import { renderWebsite } from "@/lib/rendering/render";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ websiteId: string }> };
const requestSchema = z.object({
  pageNodeId: z.string().uuid(),
  viewport: z.enum(["mobile", "tablet", "desktop"]),
}).strict();
const json = (body: unknown, status = 200) => NextResponse.json(body, {
  status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
});

export async function GET(request: Request, context: Context) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return json({ error: "Sign in with LUCIA ID." }, 401);
  const account = request.headers.get("x-lucia-workspace-account");
  if (account && account !== user.id) return json({ error: "Account changed. Reload the workspace." }, 409);
  const { websiteId } = await context.params;
  if (!z.uuid().safeParse(websiteId).success) return json({ error: "Invalid website ID." }, 400);
  const organizationId = request.headers.get("x-lucia-workspace-organization");
  if (!z.uuid().safeParse(organizationId).success) return json({ error: "Select a valid workspace." }, 400);
  const url = new URL(request.url);
  const parsed = requestSchema.safeParse({
    pageNodeId: url.searchParams.get("pageNodeId"),
    viewport: url.searchParams.get("viewport") ?? "desktop",
  });
  if (!parsed.success) return json({ error: "Preview request is invalid." }, 400);
  try {
    const graph = await getWebsiteGraph(organizationId!, websiteId);
    if (!graph) return json({ error: "Website graph has not been created." }, 404);
    const page = graph.document.nodes.find((node) => node.id === parsed.data.pageNodeId && node.type === "page" && node.lifecycleStatus === "active");
    if (!page || typeof page.properties.path !== "string") {
      return json({ error: "The selected page is not part of this website graph." }, 404);
    }
    const result = await renderWebsite({
      graph: graph.document,
      pageNodeId: page.id,
      route: page.properties.path,
      viewport: parsed.data.viewport,
    });
    return json({ revision: graph.document.revision, pageNodeId: page.id, route: page.properties.path, ...result });
  } catch (error) {
    if (error instanceof GraphServiceError) {
      const status = error.code === "FORBIDDEN" ? 403 : error.code === "NOT_FOUND" ? 404 : 422;
      return json({ error: error.message, code: error.code }, status);
    }
    return json({ error: "Website preview could not be rendered." }, 500);
  }
}
