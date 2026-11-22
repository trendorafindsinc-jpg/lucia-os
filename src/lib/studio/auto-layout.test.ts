import { describe, expect, it } from "vitest";
import type { GraphDocument, GraphEdge, GraphNode } from "@/lib/graph/contracts";
import { computeStudioAutoLayout, MAX_STUDIO_LAYOUT_NODES } from "./auto-layout";

const graphId = "00000000-0000-4000-8000-000000000001";
const id = (value: number) => "00000000-0000-4000-8000-" + String(value).padStart(12, "0");

function node(value: number, type: GraphNode["type"], properties: Record<string, unknown>, lifecycleStatus: GraphNode["lifecycleStatus"] = "active"): GraphNode {
  return { id: id(value), graphId, type, schemaVersion: 1, properties, lifecycleStatus };
}
function edge(value: number, source: number, target: number, type: GraphEdge["type"], order?: number): GraphEdge {
  return {
    id: id(value), graphId, sourceNodeId: id(source), targetNodeId: id(target),
    type, schemaVersion: 1, ...(order === undefined ? {} : { order }), properties: {},
  };
}

function fixture(): GraphDocument {
  return {
    id: graphId,
    schemaVersion: 1,
    revision: 4,
    nodes: [
      node(2, "website", { name: "Example Studio" }),
      node(3, "page", { title: "Home", path: "/" }),
      node(4, "page", { title: "About", path: "/about" }),
      node(5, "section", { category: "introduction" }),
      node(6, "section", { category: "features" }),
      node(7, "component", { name: "Feature card" }),
      node(8, "component", { name: "Icon" }),
      node(9, "media_reference", { assetId: id(90) }),
      node(10, "design_token", { namespace: "color", key: "primary" }),
      node(11, "shared_data", { dataSchemaId: "lucia.profile", dataSchemaVersion: 1 }),
      node(12, "interaction", { trigger: "click", action: "navigate" }),
      node(13, "responsive_config", {}),
    ],
    edges: [
      edge(20, 2, 3, "contains_page", 0),
      edge(21, 2, 4, "contains_page", 1),
      edge(22, 3, 5, "contains_section", 0),
      edge(23, 4, 6, "contains_section", 0),
      edge(24, 5, 7, "contains_component", 0),
      edge(25, 7, 8, "contains_component", 0),
      edge(26, 5, 9, "references_media"),
      edge(27, 5, 10, "uses_design_token"),
      edge(28, 5, 11, "binds_shared_data"),
      edge(29, 5, 12, "configures_interaction"),
      edge(30, 5, 13, "has_responsive_config"),
    ],
  };
}

describe("deterministic Studio canvas auto-layout", () => {
  it("places website, ordered pages, sections, nested components and reference nodes", () => {
    const result = computeStudioAutoLayout(fixture());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const positions = new Map(result.positions.map((position) => [position.nodeId, position]));
    expect(positions.get(id(2))?.y).toBe(60);
    expect(positions.get(id(3))?.x).toBe(160);
    expect(positions.get(id(4))!.x).toBeGreaterThan(positions.get(id(3))!.x);
    expect(positions.get(id(5))?.y).toBe(520);
    expect(positions.get(id(7))!.x).toBeGreaterThan(positions.get(id(5))!.x);
    expect(positions.get(id(8))!.x).toBeGreaterThan(positions.get(id(7))!.x);
    for (const referenceId of [9, 10, 11, 12, 13]) {
      expect(positions.get(id(referenceId))!.x).toBeGreaterThan(positions.get(id(8))!.x);
    }
    expect(result.positions.map((position) => position.nodeId)).toEqual(
      [...result.positions.map((position) => position.nodeId)].sort(),
    );
  });

  it("produces identical positions when graph node and edge arrays are reordered", () => {
    const document = fixture();
    const first = computeStudioAutoLayout(document);
    const reversed = computeStudioAutoLayout({
      ...document,
      nodes: [...document.nodes].reverse(),
      edges: [...document.edges].reverse(),
    });
    expect(first.ok).toBe(true);
    expect(reversed.ok).toBe(true);
    if (first.ok && reversed.ok) expect(reversed.positions).toEqual(first.positions);
  });

  it("does not mutate graph content or revision while calculating positions", () => {
    const document = fixture();
    const before = JSON.stringify(document);
    const result = computeStudioAutoLayout(document);
    expect(result.ok).toBe(true);
    expect(JSON.stringify(document)).toBe(before);
    expect(document.revision).toBe(4);
  });

  it("omits deleted nodes from the active canvas layout", () => {
    const document = fixture();
    document.nodes.push(node(50, "media_reference", { assetId: id(91) }, "deleted"));
    const result = computeStudioAutoLayout(document);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.positions.some((position) => position.nodeId === id(50))).toBe(false);
  });

  it("fails closed for invalid graphs and active-node counts above the layout budget", () => {
    const invalid = computeStudioAutoLayout({ ...fixture(), edges: [] });
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) expect(invalid.diagnostics.length).toBeGreaterThan(0);

    const document = fixture();
    const extraCount = MAX_STUDIO_LAYOUT_NODES + 1 - document.nodes.length;
    for (let index = 0; index < extraCount; index += 1) {
      const sequence = 10_000 + index;
      document.nodes.push({
        id: "10000000-0000-4000-8000-" + String(sequence).padStart(12, "0"),
        graphId,
        type: "media_reference",
        schemaVersion: 1,
        properties: {
          assetId: "20000000-0000-4000-8000-" + String(sequence).padStart(12, "0"),
        },
        lifecycleStatus: "active",
      });
    }
    const oversized = computeStudioAutoLayout(document);
    expect(oversized.ok).toBe(false);
    if (!oversized.ok) expect(oversized.diagnostics[0].code).toBe("STUDIO_LAYOUT_LIMIT_EXCEEDED");
  });
});
