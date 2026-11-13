import { z } from "zod";
import { graphPropertiesSchema, type GraphEdgeType, type GraphNodeType } from "./contracts";

/**
 * Initial versioned registry. These schemas deliberately validate the minimum
 * stable contract; recipe-specific and renderer-specific detail belongs to
 * later Design Intelligence and Rendering contracts.
 */
const properties = graphPropertiesSchema;

export const nodePropertySchemas: Record<GraphNodeType, z.ZodType> = {
  website: z.object({\n    name: z.string().trim().min(1).max(120),\n    recipeId: z.string().trim().min(1).max(160).optional(),\n    recipeVersion: z.number().int().positive().optional(),\n  }).strict().refine((value) => (value.recipeId === undefined) === (value.recipeVersion === undefined), { message: "Recipe ID and version must be provided together." }),
  page: z.object({
    title: z.string().trim().min(1).max(120),
    path: z.string().trim().min(1).max(240),
  }).strict(),
  section: properties,
  component: properties,
  design_token: z.object({
    namespace: z.string().trim().min(1).max(80),
    key: z.string().trim().min(1).max(120),
  }).strict(),
  shared_data: z.object({
    dataSchemaId: z.string().trim().min(1).max(160),
    dataSchemaVersion: z.number().int().positive(),
  }).strict(),
  interaction: z.object({
    trigger: z.string().trim().min(1).max(80),
    action: z.string().trim().min(1).max(80),
  }).strict(),
  responsive_config: properties,
  media_reference: z.object({
    assetId: z.string().uuid(),
  }).strict(),
};

export interface GraphEdgeRule {
  source: readonly GraphNodeType[];
  target: readonly GraphNodeType[];
  containment: boolean;
  ordered: boolean;
  uniquePair: boolean;
}

export const edgeRules: Record<GraphEdgeType, GraphEdgeRule> = {
  contains_page: {
    source: ["website"], target: ["page"], containment: true, ordered: true, uniquePair: true,
  },
  contains_section: {
    source: ["page"], target: ["section"], containment: true, ordered: true, uniquePair: true,
  },
  contains_component: {
    source: ["section", "component"], target: ["component"], containment: true, ordered: true, uniquePair: true,
  },
  uses_design_token: {
    source: ["section", "component"], target: ["design_token"], containment: false, ordered: false, uniquePair: true,
  },
  binds_shared_data: {
    source: ["section", "component"], target: ["shared_data"], containment: false, ordered: false, uniquePair: true,
  },
  references_media: {
    source: ["section", "component"], target: ["media_reference"], containment: false, ordered: false, uniquePair: true,
  },
  configures_interaction: {
    source: ["section", "component"], target: ["interaction"], containment: false, ordered: false, uniquePair: true,
  },
  has_responsive_config: {
    source: ["section", "component"], target: ["responsive_config"], containment: false, ordered: false, uniquePair: true,
  },
};

export function validateNodeProperties(type: GraphNodeType, value: unknown) {
  return nodePropertySchemas[type].safeParse(value);
}
