import { describe, expect, it } from "vitest";
import { canvasPositionMutationSchema, graphDocumentSchema, graphOperationSchema } from "./contracts";
import { canonicalGraphStringify, validateGraphDocument } from "./validate";

const graphId = "00000000-0000-4000-8000-000000000001";
const websiteId = "00000000-0000-4000-8000-000000000002";
const pageId = "00000000-0000-4000-8000-000000000003";
const sectionId = "00000000-0000-4000-8000-000000000004";
const root = {
  id: websiteId, graphId, type: "website" as const, schemaVersion: 1,
  properties: { name: "Example" }, lifecycleStatus: "active" as const,
};
const page = {
  id: pageId, graphId, type: "page" as const, schemaVersion: 1,
  properties: { title: "Home", path: "/" }, lifecycleStatus: "active" as const,
};
const section = {
  id: sectionId, graphId, type: "section" as const, schemaVersion: 1,
  properties: {}, lifecycleStatus: "active" as const,
};
const validGraph = {
  id: graphId, schemaVersion: 1, revision: 0,
  nodes: [root, page, section],
  edges: [
    { id: "00000000-0000-4000-8000-000000000005", graphId, sourceNodeId: websiteId, targetNodeId: pageId, type: "contains_page" as const, schemaVersion: 1, order: 0, properties: {} },
    { id: "00000000-0000-4000-8000-000000000006", graphId, sourceNodeId: pageId, targetNodeId: sectionId, type: "contains_section" as const, schemaVersion: 1, order: 0, properties: {} },
  ],
};

describe("Graph Engine contracts", () => {
  it("accepts the initial graph document contract", () => {
    expect(graphDocumentSchema.safeParse(validGraph).success).toBe(true);
    expect(validateGraphDocument(validGraph)).toEqual([]);
  });

  it("rejects malformed node property payloads", () => {
    const invalid = {
      ...validGraph,
      nodes: [{ ...root, properties: { name: "" } }, page, section],
    };
    expect(validateGraphDocument(invalid).some((item) => item.code === "GRAPH_NODE_PROPERTIES_INVALID")).toBe(true);
  });

  it("rejects invalid edge endpoint type combinations", () => {
    const invalid = {
      ...validGraph,
      edges: [{
        ...validGraph.edges[0],
        sourceNodeId: pageId,
        targetNodeId: websiteId,
      }, validGraph.edges[1]],
    };
    expect(validateGraphDocument(invalid).some((item) => item.code === "GRAPH_EDGE_TYPE_INVALID")).toBe(true);
  });

  it("detects containment cycles between valid component nodes", () => {
    const componentA = "00000000-0000-4000-8000-000000000008";
    const componentB = "00000000-0000-4000-8000-000000000009";
    const invalid = {
      ...validGraph,
      nodes: [
        ...validGraph.nodes,
        { id: componentA, graphId, type: "component" as const, schemaVersion: 1, properties: {}, lifecycleStatus: "active" as const },
        { id: componentB, graphId, type: "component" as const, schemaVersion: 1, properties: {}, lifecycleStatus: "active" as const },
      ],
      edges: [
        ...validGraph.edges,
        { id: "00000000-0000-4000-8000-000000000010", graphId, sourceNodeId: sectionId, targetNodeId: componentA, type: "contains_component" as const, schemaVersion: 1, order: 0, properties: {} },
        { id: "00000000-0000-4000-8000-000000000011", graphId, sourceNodeId: componentA, targetNodeId: componentB, type: "contains_component" as const, schemaVersion: 1, order: 0, properties: {} },
        { id: "00000000-0000-4000-8000-000000000012", graphId, sourceNodeId: componentB, targetNodeId: componentA, type: "contains_component" as const, schemaVersion: 1, order: 0, properties: {} },
      ],
    };
    expect(validateGraphDocument(invalid).some((item) => item.code === "GRAPH_CONTAINMENT_CYCLE")).toBe(true);
  });

  it("serializes identical graph content deterministically despite input ordering", () => {
    const reversed = { ...validGraph, nodes: [...validGraph.nodes].reverse(), edges: [...validGraph.edges].reverse() };
    expect(canonicalGraphStringify(validGraph)).toBe(canonicalGraphStringify(reversed));
  });


  it("allows reusable reference nodes without structural containment parents", () => {
    const mediaId = "00000000-0000-4000-8000-000000000013";
    const withMedia = {
      ...validGraph,
      nodes: [
        ...validGraph.nodes,
        { id: mediaId, graphId, type: "media_reference" as const, schemaVersion: 1, properties: { assetId: "00000000-0000-4000-8000-000000000014" }, lifecycleStatus: "active" as const },
      ],
    };
    expect(validateGraphDocument(withMedia)).toEqual([]);
  });

  it("keeps canvas movement outside graph content operations", () => {
    const canvasMove = { nodeId: pageId, x: 120, y: 240, locked: true };
    expect(canvasPositionMutationSchema.safeParse(canvasMove).success).toBe(true);
    expect(graphOperationSchema.safeParse({ type: "MOVE_CANVAS_NODE", ...canvasMove }).success).toBe(false);
  });

  it("does not accept duplicate node IDs", () => {
    const invalid = { ...validGraph, nodes: [root, page, { ...section, id: pageId }] };
    expect(validateGraphDocument(invalid).some((item) => item.code === "GRAPH_DUPLICATE_NODE")).toBe(true);
  });
});
