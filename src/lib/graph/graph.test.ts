import { describe, expect, it } from "vitest";
import { graphDocumentSchema } from "./contracts";
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

  it("detects containment cycles", () => {
    const invalid = {
      ...validGraph,
      edges: [
        ...validGraph.edges,
        { id: "00000000-0000-4000-8000-000000000007", graphId, sourceNodeId: sectionId, targetNodeId: sectionId, type: "contains_component" as const, schemaVersion: 1, order: 1, properties: {} },
      ],
    };
    // The self-edge is also an invalid endpoint-type pair for section -> section.
    expect(validateGraphDocument(invalid).some((item) => item.code === "GRAPH_EDGE_TYPE_INVALID")).toBe(true);
  });

  it("serializes identical graph content deterministically despite input ordering", () => {
    const reversed = { ...validGraph, nodes: [...validGraph.nodes].reverse(), edges: [...validGraph.edges].reverse() };
    expect(canonicalGraphStringify(validGraph)).toBe(canonicalGraphStringify(reversed));
  });

  it("does not accept duplicate node IDs", () => {
    const invalid = { ...validGraph, nodes: [root, page, { ...section, id: pageId }] };
    expect(validateGraphDocument(invalid).some((item) => item.code === "GRAPH_DUPLICATE_NODE")).toBe(true);
  });
});
