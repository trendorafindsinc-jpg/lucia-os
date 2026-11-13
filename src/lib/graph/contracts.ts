import { z } from "zod";

/** Stable identifiers for the first Graph Engine contract version. */
export const GRAPH_SCHEMA_VERSION = 1 as const;
export const GRAPH_NODE_SCHEMA_VERSION = 1 as const;
export const GRAPH_EDGE_SCHEMA_VERSION = 1 as const;
export const GRAPH_OPERATION_SCHEMA_VERSION = 1 as const;

export const graphNodeTypes = [
  "website",
  "page",
  "section",
  "component",
  "design_token",
  "shared_data",
  "interaction",
  "responsive_config",
  "media_reference",
] as const;
export const graphEdgeTypes = [
  "contains_page",
  "contains_section",
  "contains_component",
  "uses_design_token",
  "binds_shared_data",
  "references_media",
  "configures_interaction",
  "has_responsive_config",
] as const;

export const graphNodeTypeSchema = z.enum(graphNodeTypes);
export const graphEdgeTypeSchema = z.enum(graphEdgeTypes);

function isGraphJsonValue(value: unknown, depth = 0, ancestors = new WeakSet<object>()): boolean {
  if (depth > 20) return false;
  if (value === null || typeof value === "boolean") return true;
  if (typeof value === "string") return value.length <= 100_000;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "object") return false;

  if (ancestors.has(value)) return false;
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      if (value.length > 1000) return false;
      for (let index = 0; index < value.length; index += 1) {
        if (!(index in value) || !isGraphJsonValue(value[index], depth + 1, ancestors)) return false;
      }
      return true;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return false;
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length > 500) return false;
    for (const [key, child] of entries) {
      if (key.length > 120 || key === "__proto__" || key === "prototype" || key === "constructor") return false;
      if (!isGraphJsonValue(child, depth + 1, ancestors)) return false;
    }
    return true;
  } catch {
    // Proxies and objects with hostile accessors are not persistable JSON values.
    return false;
  } finally {
    ancestors.delete(value);
  }
}

const graphJsonValueSchema = z.custom<unknown>(
  (value) => isGraphJsonValue(value),
  { message: "Value must be bounded, plain, acyclic JSON data." },
);

export const graphPropertiesSchema = z.record(z.string().max(120), graphJsonValueSchema).superRefine((value, ctx) => {
  if (Object.keys(value).length > 500) ctx.addIssue({ code: "custom", message: "Graph properties may contain at most 500 keys." });
  for (const key of Object.keys(value)) {
    if (key === "__proto__" || key === "prototype" || key === "constructor") {
      ctx.addIssue({ code: "custom", path: [key], message: "Unsafe JSON object key." });
    }
  }
});
export const graphNodeSchema = z.object({
  id: z.string().uuid(),
  graphId: z.string().uuid(),
  type: graphNodeTypeSchema,
  schemaVersion: z.number().int().positive(),
  properties: graphPropertiesSchema,
  lifecycleStatus: z.enum(["active", "deleted"]).default("active"),
}).strict();

export const graphEdgeSchema = z.object({
  id: z.string().uuid(),
  graphId: z.string().uuid(),
  sourceNodeId: z.string().uuid(),
  targetNodeId: z.string().uuid(),
  type: graphEdgeTypeSchema,
  schemaVersion: z.number().int().positive(),
  order: z.number().int().nonnegative().optional(),
  properties: graphPropertiesSchema.default({}),
}).strict();

export const graphDocumentSchema = z.object({
  id: z.string().uuid(),
  schemaVersion: z.number().int().positive(),
  revision: z.number().int().nonnegative(),
  nodes: z.array(graphNodeSchema).max(10_000),
  edges: z.array(graphEdgeSchema).max(20_000),
}).strict();

export const graphOperationSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("CREATE_NODE"), node: graphNodeSchema }).strict(),
  z.object({
    type: z.literal("UPDATE_NODE"),
    nodeId: z.string().uuid(),
    properties: graphPropertiesSchema,
  }).strict(),
  z.object({ type: z.literal("DELETE_NODE"), nodeId: z.string().uuid() }).strict(),
  z.object({
    type: z.literal("CONNECT_NODES"),
    edge: graphEdgeSchema,
  }).strict(),
  z.object({ type: z.literal("DISCONNECT_NODES"), edgeId: z.string().uuid() }).strict(),
  z.object({
    type: z.literal("REORDER_CHILDREN"),
    parentNodeId: z.string().uuid(),
    edgeType: graphEdgeTypeSchema,
    orderedEdgeIds: z.array(z.string().uuid()).min(1),
  }).strict(),
  z.object({
    type: z.literal("RESTORE_VERSION"),
    versionId: z.string().uuid(),
  }).strict(),
]);

/** Canvas state is deliberately outside graph-content revision batches. */
export const canvasPositionMutationSchema = z.object({
  nodeId: z.string().uuid(),
  x: z.number().finite().min(-1_000_000).max(1_000_000),
  y: z.number().finite().min(-1_000_000).max(1_000_000),
  locked: z.boolean().optional(),
}).strict();

export const graphMutationBatchSchema = z.object({
  websiteId: z.string().uuid(),
  expectedRevision: z.number().int().nonnegative(),
  idempotencyKey: z.string().trim().min(8).max(200),
  operationSchemaVersion: z.literal(GRAPH_OPERATION_SCHEMA_VERSION),
  operations: z.array(graphOperationSchema).min(1).max(100),
}).strict();

export const graphDiagnosticSchema = z.object({
  code: z.string().min(1),
  severity: z.enum(["error", "warning", "info"]),
  message: z.string().min(1),
  nodeId: z.string().uuid().optional(),
  edgeId: z.string().uuid().optional(),
  propertyPath: z.array(z.union([z.string(), z.number()])).optional(),
}).strict();

export type GraphNodeType = z.infer<typeof graphNodeTypeSchema>;
export type GraphEdgeType = z.infer<typeof graphEdgeTypeSchema>;
export type GraphNode = z.infer<typeof graphNodeSchema>;
export type GraphEdge = z.infer<typeof graphEdgeSchema>;
export type GraphDocument = z.infer<typeof graphDocumentSchema>;
export type GraphOperation = z.infer<typeof graphOperationSchema>;
export type GraphMutationBatch = z.infer<typeof graphMutationBatchSchema>;
export type CanvasPositionMutation = z.infer<typeof canvasPositionMutationSchema>;
export type GraphDiagnostic = z.infer<typeof graphDiagnosticSchema>;
