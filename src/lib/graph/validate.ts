import { graphDocumentSchema, type GraphDiagnostic, type GraphDocument } from "./contracts";
import { edgeRules, validateNodeProperties } from "./registry";

function diagnostic(
  code: string,
  message: string,
  details: Pick<GraphDiagnostic, "nodeId" | "edgeId"> = {},
): GraphDiagnostic {
  return { code, severity: "error", message, ...details };
}

/** Canonical JSON serialization with recursively sorted object keys. */
function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => [key, canonicalValue(child)]),
    );
  }
  return value;
}

export function canonicalGraphStringify(input: GraphDocument): string {
  const parsed = graphDocumentSchema.parse(input);
  const normalized = {
    ...parsed,
    nodes: [...parsed.nodes].sort((a, b) => a.id.localeCompare(b.id)),
    edges: [...parsed.edges].sort((a, b) => a.id.localeCompare(b.id)),
  };
  return JSON.stringify(canonicalValue(normalized));
}

export function validateGraphDocument(input: unknown): GraphDiagnostic[] {
  const parsed = graphDocumentSchema.safeParse(input);
  if (!parsed.success) {
    return parsed.error.issues.map((issue) => ({
      code: "GRAPH_SCHEMA_INVALID",
      severity: "error" as const,
      message: issue.message,
      propertyPath: issue.path.filter((part): part is string | number =>
        typeof part === "string" || typeof part === "number"),
    }));
  }

  const graph = parsed.data;
  const diagnostics: GraphDiagnostic[] = [];
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const edgeIds = new Set<string>();
  const nodeIds = new Set<string>();

  for (const node of graph.nodes) {
    if (nodeIds.has(node.id)) diagnostics.push(diagnostic("GRAPH_DUPLICATE_NODE", "Node IDs must be unique.", { nodeId: node.id }));
    nodeIds.add(node.id);
    if (node.graphId !== graph.id) diagnostics.push(diagnostic("GRAPH_NODE_SCOPE_MISMATCH", "Node belongs to a different graph.", { nodeId: node.id }));
    if (node.schemaVersion !== 1) diagnostics.push(diagnostic("GRAPH_NODE_VERSION_UNSUPPORTED", "Node schema version is not supported by this registry.", { nodeId: node.id }));
    const propertiesResult = validateNodeProperties(node.type, node.properties);
    if (!propertiesResult.success) diagnostics.push(diagnostic("GRAPH_NODE_PROPERTIES_INVALID", "Node properties do not match the registered schema.", { nodeId: node.id }));
  }

  const activeRoots = graph.nodes.filter((node) => node.type === "website" && node.lifecycleStatus === "active");
  if (activeRoots.length !== 1) diagnostics.push(diagnostic("GRAPH_ROOT_COUNT_INVALID", "A graph must contain exactly one active website root."));

  const containment = new Map<string, string[]>();
  const uniquePairs = new Set<string>();
  const incomingContainment = new Map<string, number>();

  for (const edge of graph.edges) {
    if (edgeIds.has(edge.id)) diagnostics.push(diagnostic("GRAPH_DUPLICATE_EDGE", "Edge IDs must be unique.", { edgeId: edge.id }));
    edgeIds.add(edge.id);
    if (edge.graphId !== graph.id) diagnostics.push(diagnostic("GRAPH_EDGE_SCOPE_MISMATCH", "Edge belongs to a different graph.", { edgeId: edge.id }));

    const source = nodesById.get(edge.sourceNodeId);
    const target = nodesById.get(edge.targetNodeId);
    if (!source || !target) {
      diagnostics.push(diagnostic("GRAPH_EDGE_ENDPOINT_MISSING", "Both edge endpoints must exist in this graph.", { edgeId: edge.id }));
      continue;
    }
    const rule = edgeRules[edge.type];
    if (!rule.source.includes(source.type) || !rule.target.includes(target.type)) {
      diagnostics.push(diagnostic("GRAPH_EDGE_TYPE_INVALID", "Edge type is not valid for its source and target node types.", { edgeId: edge.id }));
      continue;
    }
    if (rule.ordered && edge.order === undefined) {
      diagnostics.push(diagnostic("GRAPH_EDGE_ORDER_REQUIRED", "This relationship requires an explicit order.", { edgeId: edge.id }));
    }
    const pairKey = [edge.type, edge.sourceNodeId, edge.targetNodeId].join(":");
    if (rule.uniquePair && uniquePairs.has(pairKey)) diagnostics.push(diagnostic("GRAPH_DUPLICATE_RELATIONSHIP", "This relationship already exists.", { edgeId: edge.id }));
    uniquePairs.add(pairKey);

    if (rule.containment) {
      const children = containment.get(source.id) ?? [];
      children.push(target.id);
      containment.set(source.id, children);
      incomingContainment.set(target.id, (incomingContainment.get(target.id) ?? 0) + 1);
    }
  }

  for (const node of graph.nodes) {
    if (node.type !== "website" && node.lifecycleStatus === "active" && (incomingContainment.get(node.id) ?? 0) !== 1) {
      diagnostics.push(diagnostic("GRAPH_CONTAINMENT_PARENT_COUNT_INVALID", "Every active non-root node must have exactly one containment parent.", { nodeId: node.id }));
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (nodeId: string): boolean => {
    if (visiting.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;
    visiting.add(nodeId);
    for (const childId of containment.get(nodeId) ?? []) {
      if (visit(childId)) return true;
    }
    visiting.delete(nodeId);
    visited.add(nodeId);
    return false;
  };
  for (const node of graph.nodes) {
    if (node.type === "website" && visit(node.id)) {
      diagnostics.push(diagnostic("GRAPH_CONTAINMENT_CYCLE", "Containment relationships must be acyclic.", { nodeId: node.id }));
      break;
    }
  }

  return diagnostics;
}
