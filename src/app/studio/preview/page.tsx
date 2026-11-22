import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getWebsiteGraph, GraphServiceError } from "@/lib/graph/service";
import { renderWebsiteElement } from "@/lib/rendering/render-core";

export const dynamic = "force-dynamic";
export const metadata = { title: "Website preview", robots: { index: false, follow: false } };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const requestSchema = z.object({
  websiteId: z.string().uuid(),
  organizationId: z.string().uuid(),
  pageNodeId: z.string().uuid(),
  viewport: z.enum(["mobile", "tablet", "desktop"]),
}).strict();

function PreviewMessage({ title, message, diagnostics }: {
  title: string; message: string; diagnostics?: Array<{ code: string; message: string; nodeId?: string }>;
}) {
  return <main style={{ fontFamily: "system-ui,sans-serif", maxWidth: 760, margin: "48px auto", padding: 24, color: "#182238" }}>
    <h1>{title}</h1><p>{message}</p>
    {diagnostics?.length ? <ul>{diagnostics.map((item, index) => <li key={index} style={{ marginBlock: 12 }}>
      <strong>{item.code}</strong> — {item.message}
      {item.nodeId ? <p><button type="button" data-lucia-node-id={item.nodeId}>Inspect affected graph node</button></p> : null}
    </li>)}</ul> : null}
  </main>;
}

export default async function LuciaStudioPreviewPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const parsed = requestSchema.safeParse({
    websiteId: typeof params.websiteId === "string" ? params.websiteId : "",
    organizationId: typeof params.organizationId === "string" ? params.organizationId : "",
    pageNodeId: typeof params.pageNodeId === "string" ? params.pageNodeId : "",
    viewport: typeof params.viewport === "string" ? params.viewport : "desktop",
  });
  if (!parsed.success) return <PreviewMessage title="Preview unavailable" message="The preview request is incomplete or invalid." />;
  const user = await getCurrentUser().catch(() => null);
  if (!user) return <PreviewMessage title="Sign in required" message="Sign in to Lucia OS to preview this website." />;
  try {
    const graph = await getWebsiteGraph(parsed.data.organizationId, parsed.data.websiteId);
    if (!graph) return <PreviewMessage title="Preview unavailable" message="This website does not have a graph yet." />;
    const page = graph.document.nodes.find((node) => node.id === parsed.data.pageNodeId && node.type === "page" && node.lifecycleStatus === "active");
    if (!page || typeof page.properties.path !== "string") {
      return <PreviewMessage title="Page unavailable" message="The selected page is not part of this website graph." />;
    }
    const result = await renderWebsiteElement({
      graph: graph.document, pageNodeId: page.id, route: page.properties.path, viewport: parsed.data.viewport,
    });
    if (!result.ok) return <PreviewMessage title="Preview needs attention" message="The saved graph could not be rendered. Review the linked diagnostics in Lucia Studio." diagnostics={result.diagnostics} />;
    return <div className="lucia-studio-preview">
      <style>{result.css}</style>
      {result.body}
    </div>;
  } catch (error) {
    if (error instanceof GraphServiceError) {
      const message = error.code === "FORBIDDEN" ? "You do not have permission to preview this website." :
        error.code === "NOT_FOUND" ? "The website or graph could not be found." : "The website graph could not be loaded.";
      return <PreviewMessage title="Preview unavailable" message={message} />;
    }
    return <PreviewMessage title="Preview unavailable" message="The website preview could not be rendered." />;
  }
}
