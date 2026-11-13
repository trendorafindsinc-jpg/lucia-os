import { z } from "zod";

const requestKeySchema = z.string().trim().min(1).max(80).regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/);
const categorySchema = z.string().trim().min(2).max(63).regex(/^[a-z][a-z0-9-]*$/);

export const COMPOSITION_REQUEST_SCHEMA_VERSION = 1 as const;

export const compositionSectionRequestSchema = z.object({
  key: requestKeySchema,
  category: categorySchema,
  requiredCapabilities: z.array(categorySchema).max(20).default([]),
  recipePreference: z.object({
    id: z.string().trim().min(1).max(160),
    version: z.number().int().positive(),
  }).strict().optional(),
  content: z.object({
    heading: z.string().trim().max(240).optional(),
    description: z.string().trim().max(4000).optional(),
    actionLabel: z.string().trim().max(100).optional(),
  }).strict().default({}),
}).strict();

export const compositionPageRequestSchema = z.object({
  key: requestKeySchema,
  title: z.string().trim().min(1).max(120),
  path: z.string().trim().min(1).max(240),
  recipePreference: z.object({
    id: z.string().trim().min(1).max(160),
    version: z.number().int().positive(),
  }).strict().optional(),
  sections: z.array(compositionSectionRequestSchema).min(1).max(40),
}).strict();

export const compositionRequestSchema = z.object({
  schemaVersion: z.literal(COMPOSITION_REQUEST_SCHEMA_VERSION),
  website: z.object({
    id: z.string().uuid(),
    name: z.string().trim().min(1).max(120),
    industryCategory: categorySchema,
  }).strict(),
  foundation: z.object({
    id: z.string().trim().min(1).max(120),
    version: z.number().int().positive(),
  }).strict(),
  pages: z.array(compositionPageRequestSchema).min(1).max(50),
}).strict();

export const compositionDiagnosticCodeSchema = z.enum([
  "INVALID_REQUEST",
  "INVALID_PAGE_PATH",
  "DUPLICATE_REQUEST_KEY",
  "DUPLICATE_PAGE_PATH",
  "EMPTY_PAGE_SET",
  "FOUNDATION_NOT_FOUND",
  "FOUNDATION_VERSION_UNSUPPORTED",
  "RECIPE_NOT_FOUND",
  "RECIPE_VERSION_UNSUPPORTED",
  "RECIPE_INCOMPATIBLE",
  "MISSING_CAPABILITY",
  "MISSING_REQUIRED_TOKEN",
  "MISSING_CUSTOMER_FACT",
  "UNSUPPORTED_FEATURE",
  "GRAPH_INVALID",
]);

export const compositionDiagnosticSchema = z.object({
  code: compositionDiagnosticCodeSchema,
  severity: z.enum(["error", "warning", "info"]),
  message: z.string().trim().min(1).max(1000),
  requestKey: requestKeySchema.optional(),
  pageKey: requestKeySchema.optional(),
  sectionKey: requestKeySchema.optional(),
  nodeId: z.string().uuid().optional(),
  edgeId: z.string().uuid().optional(),
}).strict();

export type CompositionSectionRequest = z.infer<typeof compositionSectionRequestSchema>;
export type CompositionPageRequest = z.infer<typeof compositionPageRequestSchema>;
export type CompositionRequest = z.infer<typeof compositionRequestSchema>;
export type CompositionDiagnostic = z.infer<typeof compositionDiagnosticSchema>;
