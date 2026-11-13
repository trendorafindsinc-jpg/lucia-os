import type { ReactNode } from "react";
import { z } from "zod";
import type { GraphDocument, GraphNode } from "@/lib/graph/contracts";
import { graphNodeTypes } from "@/lib/graph/contracts";
import type { DesignFoundation } from "@/lib/design-intelligence/contracts";

export const renderViewportSchema = z.enum(["mobile", "tablet", "desktop"]);
export const renderDiagnosticCodeSchema = z.enum([
  "GRAPH_INVALID",
  "PAGE_NOT_FOUND",
  "PAGE_ROUTE_MISMATCH",
  "RECIPE_REFERENCE_INVALID",
  "RECIPE_NOT_FOUND",
  "RECIPE_VERSION_UNSUPPORTED",
  "RECIPE_NODE_TYPE_INCOMPATIBLE",
  "RENDERER_NOT_REGISTERED",
  "RENDERER_REGISTRY_INVALID",
  "TOKEN_NOT_FOUND",
  "TOKEN_VALUE_UNSUPPORTED",
  "MEDIA_NOT_FOUND",
  "MEDIA_FORBIDDEN",
  "SHARED_DATA_NOT_FOUND",
  "UNSUPPORTED_FEATURE",
]);
export const renderDiagnosticSchema = z.object({
  code: renderDiagnosticCodeSchema,
  severity: z.enum(["error", "warning", "info"]),
  message: z.string().trim().min(1).max(1000),
  nodeId: z.string().uuid().optional(),
  edgeId: z.string().uuid().optional(),
  propertyPath: z.array(z.union([z.string(), z.number()])).optional(),
}).strict();

export const renderRequestSchema = z.object({
  route: z.string().trim().min(1).max(240),
  viewport: renderViewportSchema,
  pageNodeId: z.string().uuid(),
}).strict();

export interface ResolvedMediaAsset {
  assetId: string;
  url: string;
  altText: string | null;
  decorative: boolean;
  width?: number;
  height?: number;
}

export interface MediaResolver {
  resolve(assetId: string, websiteId: string): Promise<ResolvedMediaAsset | null>;
}

export type ResolvedSharedData = Readonly<Record<string, unknown>>;
export interface SharedDataResolver {
  resolve(referenceId: string, websiteId: string): Promise<ResolvedSharedData | null>;
}

export interface RenderContext {
  graph: GraphDocument;
  websiteId: string;
  pageNodeId: string;
  route: string;
  viewport: z.infer<typeof renderViewportSchema>;
  foundation: DesignFoundation;
  mediaResolver: MediaResolver;
  sharedDataResolver: SharedDataResolver;
}

export interface RendererDefinition {
  recipeId: string;
  recipeVersion: number;
  nodeType: (typeof graphNodeTypes)[number];
  render(node: GraphNode, context: RenderContext): ReactNode;
}

export type RenderDiagnostic = z.infer<typeof renderDiagnosticSchema>;
