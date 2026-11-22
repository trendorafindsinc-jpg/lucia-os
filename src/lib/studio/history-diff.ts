import type { GraphDocument, GraphNode } from "@/lib/graph/contracts";

export interface GraphRevisionDiff {
  addedNodes: GraphNode[];
  removedNodes: GraphNode[];
  changedNodes: Array<{ before: GraphNode; after: GraphNode }>;
  addedEdges: number;
  removedEdges: number;
}
function stable(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]";
  if (value && typeof value === "object") return "{" + Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => JSON.stringify(key) + ":" + stable(child)).join(",") + "}";
  return JSON.stringify(value);
}
export function compareGraphRevisions(current: GraphDocument, prior: GraphDocument): GraphRevisionDiff {
  const currentNodes = new Map(current.nodes.map((node) => [node.id, node]));
  const priorNodes = new Map(prior.nodes.map((node) => [node.id, node]));
  const addedNodes = current.nodes.filter((node) => !priorNodes.has(node.id));
  const removedNodes = prior.nodes.filter((node) => !currentNodes.has(node.id));
  const changedNodes = current.nodes.flatMap((node) => {
    const before = priorNodes.get(node.id);
    return before && stable({ type: before.type, properties: before.properties, lifecycleStatus: before.lifecycleStatus }) !==
      stable({ type: node.type, properties: node.properties, lifecycleStatus: node.lifecycleStatus }) ? [{ before, after: node }] : [];
  });
  const edgeKey = (edge: GraphDocument["edges"][number]) => stable(edge);
  const currentEdges = new Set(current.edges.map(edgeKey));
  const priorEdges = new Set(prior.edges.map(edgeKey));
  return { addedNodes, removedNodes, changedNodes,
    addedEdges: current.edges.filter((edge) => !priorEdges.has(edgeKey(edge))).length,
    removedEdges: prior.edges.filter((edge) => !currentEdges.has(edgeKey(edge))).length };
}
