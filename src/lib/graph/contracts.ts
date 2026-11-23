/** Canonical, transport-safe graph contracts shared by Studio and Graph Engine. */
export const GRAPH_NODE_TYPES = ["website","page","section","component","design_token","shared_data","interaction","responsive_config","media_reference"] as const;
export type GraphNodeType = typeof GRAPH_NODE_TYPES[number];
export const GRAPH_EDGE_TYPES = ["contains_page","contains_section","contains_component","uses_design_token","binds_shared_data","references_media","configures_interaction","has_responsive_config"] as const;
export type GraphEdgeType = typeof GRAPH_EDGE_TYPES[number];
export type GraphLifecycleStatus = "active" | "archived" | "deleted";
export type GraphProperties = Readonly<Record<string, unknown>>;
export interface GraphNode {
  id: string;
  type: GraphNodeType;
  lifecycleStatus: GraphLifecycleStatus;
  properties: GraphProperties;
}
export interface GraphEdge {
  id: string;
  type: GraphEdgeType;
  sourceNodeId: string;
  targetNodeId: string;
}
export interface GraphDocument {
  id: string;
  websiteId: string;
  revision: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
}
export interface GraphDiagnostic {
  code: string;
  message: string;
  severity: "error" | "warning" | "info";
  nodeId?: string;
  edgeId?: string;
}
export function isGraphNodeType(value: unknown): value is GraphNodeType {
  return typeof value === "string" && (GRAPH_NODE_TYPES as readonly string[]).includes(value);
}
export function isGraphEdgeType(value: unknown): value is GraphEdgeType {
  return typeof value === "string" && (GRAPH_EDGE_TYPES as readonly string[]).includes(value);
}
export function validateGraphDocument(value: unknown): value is GraphDocument {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const graph = value as Record<string, unknown>;
  if (typeof graph.id !== "string" || !graph.id || typeof graph.websiteId !== "string" || !graph.websiteId ||
      !Number.isSafeInteger(graph.revision) || (graph.revision as number) < 1 ||
      !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) return false;
  const ids = new Set<string>();
  for (const raw of graph.nodes) {
    if (!raw || typeof raw !== "object") return false;
    const node = raw as Record<string, unknown>;
    if (typeof node.id !== "string" || !node.id || ids.has(node.id) || !isGraphNodeType(node.type) ||
        !["active","archived","deleted"].includes(String(node.lifecycleStatus)) ||
        !node.properties || typeof node.properties !== "object" || Array.isArray(node.properties)) return false;
    ids.add(node.id);
  }
  const edgeIds = new Set<string>();
  for (const raw of graph.edges) {
    if (!raw || typeof raw !== "object") return false;
    const edge = raw as Record<string, unknown>;
    if (typeof edge.id !== "string" || !edge.id || edgeIds.has(edge.id) || !isGraphEdgeType(edge.type) ||
        typeof edge.sourceNodeId !== "string" || typeof edge.targetNodeId !== "string" ||
        !ids.has(edge.sourceNodeId) || !ids.has(edge.targetNodeId) || edge.sourceNodeId === edge.targetNodeId) return false;
    edgeIds.add(edge.id);
  }
  return true;
}
