import { describe, expect, it } from "vitest";
import type { GraphDocument } from "@/lib/graph/contracts";
import { compareGraphRevisions } from "./history-diff";

const graphId = "10000000-0000-4000-8000-000000000001";
const websiteId = "20000000-0000-4000-8000-000000000001";
const pageId = "30000000-0000-4000-8000-000000000001";
const sectionId = "40000000-0000-4000-8000-000000000001";
const edgeId = "50000000-0000-4000-8000-000000000001";
function node(id: string, type: "website" | "page" | "section", properties: Record<string, unknown>) {
  return { id, graphId, type, schemaVersion: 1, properties, lifecycleStatus: "active" as const };
}
function document(revision: number, nodes: GraphDocument["nodes"], edges: GraphDocument["edges"] = []): GraphDocument {
  return { id: graphId, schemaVersion: 1, revision, nodes, edges };
}
describe("compareGraphRevisions", () => {
  it("identifies added, removed and changed nodes without treating canvas state as content", () => {
    const prior = document(1, [node(websiteId, "website", { name: "Old" }), node(pageId, "page", { title: "Home" })]);
    const current = document(2, [node(websiteId, "website", { name: "New" }), node(sectionId, "section", { heading: "Intro" })]);
    const diff = compareGraphRevisions(current, prior);
    expect(diff.addedNodes.map((item) => item.id)).toEqual([sectionId]);
    expect(diff.removedNodes.map((item) => item.id)).toEqual([pageId]);
    expect(diff.changedNodes).toHaveLength(1);
    expect(diff.changedNodes[0].before.properties).toEqual({ name: "Old" });
    expect(diff.changedNodes[0].after.properties).toEqual({ name: "New" });
    expect(diff.addedEdges).toBe(0);
    expect(diff.removedEdges).toBe(0);
  });
  it("counts relationship additions and removals deterministically", () => {
    const website = node(websiteId, "website", {});
    const page = node(pageId, "page", {});
    const edge = { id: edgeId, graphId, sourceNodeId: websiteId, targetNodeId: pageId, type: "contains_page" as const, schemaVersion: 1, order: 0, properties: {} };
    const before = document(1, [website, page]);
    const after = document(2, [website, page], [edge]);
    expect(compareGraphRevisions(after, before)).toMatchObject({ addedEdges: 1, removedEdges: 0 });
    expect(compareGraphRevisions(before, after)).toMatchObject({ addedEdges: 0, removedEdges: 1 });
  });
  it("does not report changes when node order alone differs", () => {
    const first = node(websiteId, "website", { name: "Site" });
    const second = node(pageId, "page", { title: "Home" });
    expect(compareGraphRevisions(document(2, [first, second]), document(1, [second, first]))).toMatchObject({
      addedNodes: [], removedNodes: [], changedNodes: [], addedEdges: 0, removedEdges: 0,
    });
  });
});
