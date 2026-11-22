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

  it("deduplicates repeated stable references within one render", async () => {
    const { graph, section } = graphWithReferences();
    const mediaResolver = { resolve: vi.fn(async (assetId: string) => ({
      assetId, url: "/media/team.webp", altText: "Team", decorative: false,
    })) };
    const repeated = {
      ...graph,
      edges: [...graph.edges, {
        id: "00000000-0000-4000-8000-000000000094", graphId: websiteId,
        sourceNodeId: section.id, targetNodeId: mediaId, type: "references_media" as const,
        schemaVersion: 1, properties: {},
      }],
    };
    const result = await resolveRenderReferences(repeated, [section], mediaResolver, { resolve: async () => ({ displayName: "Lucia" }) });
    expect(result.ok).toBe(true);
    expect(mediaResolver.resolve).toHaveBeenCalledTimes(1);
  });

  it("rejects traversal media paths and resolver objects with executable getters", async () => {
    const { graph, section } = graphWithReferences();
    const traversal = await resolveRenderReferences(graph, [section], {
      resolve: async (assetId) => ({ assetId, url: "/media/%2e%2e/private.webp", altText: "Asset", decorative: false }),
    });
    expect(traversal.ok).toBe(false);
    if (!traversal.ok) expect(traversal.code).toBe("MEDIA_FORBIDDEN");

    let getterCalls = 0;
    const unsafe = Object.defineProperty({}, "displayName", {
      enumerable: true,
      get() { getterCalls += 1; return "should not execute"; },
    });
    const shared = await resolveRenderReferences(graph, [section], { resolve: async (assetId) => ({ assetId, url: "/media/team.webp", altText: "Team", decorative: false }) }, {
      resolve: async () => unsafe as Readonly<Record<string, unknown>>,
    });
    expect(shared.ok).toBe(false);
    expect(getterCalls).toBe(0);
    if (!shared.ok) expect(shared.code).toBe("UNSUPPORTED_FEATURE");
  });

  it("distinguishes shared-data authorization failure from missing data", async () => {
    const { graph, section } = graphWithReferences();
    const result = await resolveRenderReferences(graph, [section], {
      resolve: async (assetId) => ({ assetId, url: "/media/team.webp", altText: "Team", decorative: false }),
    }, {
      resolve: async () => { throw new Error("denied"); },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("SHARED_DATA_FORBIDDEN");
  });

  it("enforces the per-render unique reference budget before resolver calls", async () => {
    const { graph, section } = graphWithReferences();
    const extraNodes = Array.from({ length: 64 }, (_, index) => ({
      id: "10000000-0000-4000-8000-" + String(index + 1).padStart(12, "0"),
      graphId: websiteId, type: "media_reference" as const, schemaVersion: 1,
      properties: { assetId: "20000000-0000-4000-8000-" + String(index + 1).padStart(12, "0") },
      lifecycleStatus: "active" as const,
    }));
    const extraEdges = extraNodes.map((node, index) => ({
      id: "30000000-0000-4000-8000-" + String(index + 1).padStart(12, "0"),
      graphId: websiteId, sourceNodeId: section.id, targetNodeId: node.id,
      type: "references_media" as const, schemaVersion: 1, properties: {},
    }));
    const resolver = { resolve: vi.fn(async () => null) };
    const result = await resolveRenderReferences({
      ...graph, nodes: [...graph.nodes, ...extraNodes], edges: [...graph.edges, ...extraEdges],
    }, [section], resolver);
    expect(result.ok).toBe(false);
    expect(resolver.resolve).not.toHaveBeenCalled();
    if (!result.ok) expect(result.code).toBe("RENDER_LIMIT_EXCEEDED");
  });

});
