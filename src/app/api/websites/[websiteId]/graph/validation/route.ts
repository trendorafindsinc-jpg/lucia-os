import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getWebsiteGraph, GraphServiceError } from "@/lib/graph/service";
import { validateGraphDocument } from "@/lib/graph/validate";
import { renderWebsiteElement } from "@/lib/rendering/render-core";

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
    const result = await getWebsiteGraph(organizationId!, websiteId);
    if (!result) return json({ error: "Website graph has not been created." }, 404);
    const graph = result.document;
    type StudioFinding = { code: string; severity: "error" | "warning" | "info"; message: string; nodeId?: string; edgeId?: string; propertyPath?: Array<string | number>; source: "graph" | "composition" | "rendering" };
    const diagnostics: StudioFinding[] = validateGraphDocument(graph).map((item) => ({ ...item, source: "graph" }));
    const pages = graph.nodes.filter((node) => node.type === "page" && node.lifecycleStatus === "active");
    if (!pages.length) diagnostics.push({ code: "PAGE_REQUIRED", severity: "warning" as const, message: "Add a page to enable website preview and navigation.", nodeId: graph.nodes.find((node) => node.type === "website")?.id, source: "composition" as const });
    for (const page of pages) {
      const route = page.properties.path;
      if (typeof route !== "string") continue;
      const rendered = await renderWebsiteElement({ graph, pageNodeId: page.id, route, viewport: "desktop" });
      if (!rendered.ok) diagnostics.push(...rendered.diagnostics.map((item) => ({ ...item, source: "rendering" as const })));
    }
    const unique = new Map<string, typeof diagnostics[number]>();
    for (const item of diagnostics) unique.set([item.code, item.nodeId ?? "", item.edgeId ?? "", item.message].join("|"), item);
    const findings = [...unique.values()].sort((a, b) => {
      const rank = (value: string) => value === "error" ? 0 : value === "warning" ? 1 : 2;
      return rank(a.severity) - rank(b.severity) || a.code.localeCompare(b.code) || (a.nodeId ?? "").localeCompare(b.nodeId ?? "");
    });
    return json({ revision: graph.revision, diagnostics: findings, counts: {
      errors: findings.filter((item) => item.severity === "error").length,
      warnings: findings.filter((item) => item.severity === "warning").length,
      info: findings.filter((item) => item.severity === "info").length,
    } });
  } catch (error) {
    if (error instanceof GraphServiceError) return json({ error: error.message }, error.code === "FORBIDDEN" ? 403 : error.code === "NOT_FOUND" ? 404 : 422);
    return json({ error: "Website validation could not be completed." }, 500);
  }
}
