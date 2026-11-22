import { describe, expect, it, vi } from "vitest";
import { composeWebsite } from "@/lib/composition/compose";
import { resolveRenderReferences } from "./references";

const websiteId = "00000000-0000-4000-8000-000000000001";
const mediaId = "00000000-0000-4000-8000-000000000099";
const sharedId = "00000000-0000-4000-8000-000000000098";

function graphWithReferences() {
  let next = 2;
  const composed = composeWebsite({
    schemaVersion: 1,
    website: { id: websiteId, name: "Example", industryCategory: "professional-services" },
    foundation: { id: "lucia.foundation.core", version: 1 },
    pages: [{ key: "home", title: "Home", path: "/", sections: [
      { key: "hero", category: "introduction", content: { heading: "Welcome" } },
    ] }],
  }, { idFactory: () => "00000000-0000-4000-8000-" + String(next++).padStart(12, "0") });
  if (!composed.ok) throw new Error(JSON.stringify(composed.diagnostics));
  const section = composed.graph.nodes.find((node) => node.type === "section")!;
  return {
    section,
    graph: {
      ...composed.graph,
      nodes: [...composed.graph.nodes,
        { id: mediaId, graphId: websiteId, type: "media_reference" as const, schemaVersion: 1, properties: { assetId: "00000000-0000-4000-8000-000000000097" }, lifecycleStatus: "active" as const },
        { id: sharedId, graphId: websiteId, type: "shared_data" as const, schemaVersion: 1, properties: { dataSchemaId: "lucia.profile", dataSchemaVersion: 1 }, lifecycleStatus: "active" as const },
      ],
      edges: [...composed.graph.edges,
        { id: "00000000-0000-4000-8000-000000000096", graphId: websiteId, sourceNodeId: section.id, targetNodeId: mediaId, type: "references_media" as const, schemaVersion: 1, properties: {} },
        { id: "00000000-0000-4000-8000-000000000095", graphId: websiteId, sourceNodeId: section.id, targetNodeId: sharedId, type: "binds_shared_data" as const, schemaVersion: 1, properties: {} },
      ],
    },
  };
}

describe("secure render reference resolution", () => {
  it("resolves media and shared data with the website security scope", async () => {
    const { graph, section } = graphWithReferences();
    const mediaResolver = { resolve: vi.fn(async (assetId: string, _scope: string) => ({
      assetId, url: "https://cdn.example.test/asset.webp", altText: "Team at work", decorative: false, width: 640, height: 480,
    })) };
    const sharedDataResolver = { resolve: vi.fn(async (_referenceId: string, _scope: string) => ({ displayName: "Lucia" })) };
    const result = await resolveRenderReferences(graph, [section], mediaResolver, sharedDataResolver);
    expect(result.ok, JSON.stringify(result)).toBe(true);
    expect(mediaResolver.resolve).toHaveBeenCalledWith("00000000-0000-4000-8000-000000000097", websiteId);
    expect(sharedDataResolver.resolve).toHaveBeenCalledWith(sharedId, websiteId);
    if (result.ok) {
      expect(result.media.size).toBe(1);
      expect(result.sharedData.get(sharedId)?.displayName).toBe("Lucia");
    }
  });

  it("rejects unsafe resolver URLs and missing alternative text", async () => {
    const { graph, section } = graphWithReferences();
    const result = await resolveRenderReferences(graph, [section], {
      resolve: async (assetId) => ({ assetId, url: "javascript:alert(1)", altText: null, decorative: false }),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("MEDIA_FORBIDDEN");
  });

  it("fails closed when authorization or data resolution fails", async () => {
    const { graph, section } = graphWithReferences();
    const denied = await resolveRenderReferences(graph, [section], { resolve: async () => { throw new Error("denied"); } });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.code).toBe("MEDIA_FORBIDDEN");
  });

  it("rejects non-plain or oversized shared data", async () => {
    const { graph, section } = graphWithReferences();
    const mediaResolver = { resolve: async (assetId: string) => ({ assetId, url: "/media/asset.webp", altText: "Asset", decorative: false }) };
    const result = await resolveRenderReferences(graph, [section], mediaResolver, {
      resolve: async () => ({ nested: new Date() }) as unknown as Readonly<Record<string, unknown>>,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("UNSUPPORTED_FEATURE");
  });
});
