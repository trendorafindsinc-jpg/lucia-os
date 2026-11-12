import { z } from "zod";

/** Stable identifiers for the first Graph Engine contract version. */
export const GRAPH_SCHEMA_VERSION = 1 as const;
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

export const graphNodeSchema = z.object({
  id: z.string().uuid(),
  graphId: z.string().uuid(),
  type: graphNodeTypeSchema,
  schemaVersion: z.number().int().positive(),
  properties: z.record(z.string(), z.unknown()),
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
  properties: z.record(z.string(), z.unknown()).default({}),
}).strict();

export const graphDocumentSchema = z.object({
  id: z.string().uuid(),
  schemaVersion: z.number().int().positive(),
  revision: z.number().int().nonnegative(),
  nodes: z.array(graphNodeSchema),
  edges: z.array(graphEdgeSchema),
}).strict();

export const graphOperationSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("CREATE_NODE"), node: graphNodeSchema }).strict(),
  z.object({
    type: z.literal("UPDATE_NODE"),
    nodeId: z.string().uuid(),
    properties: z.record(z.string(), z.unknown()),
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
    type: z.literal("MOVE_CANVAS_NODE"),
    nodeId: z.string().uuid(),
    x: z.number().finite(),
    y: z.number().finite(),
    locked: z.boolean().optional(),
  }).strict(),
  z.object({
    type: z.literal("RESTORE_VERSION"),
    versionId: z.string().uuid(),
  }).strict(),
]);

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
export type GraphDiagnostic = z.infer<typeof graphDiagnosticSchema>;
