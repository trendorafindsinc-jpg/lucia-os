import { z } from "zod";
import { graphNodeTypes } from "@/lib/graph/contracts";

const slug = z.string().regex(/^[a-z][a-zA-Z0-9-]{1,62}$/);
const recipeId = z.string().regex(/^lucia\.design\.(?:component|section|page|industry)\.[a-z][a-z0-9-]{1,62}$/);
const tokenPath = z.string().regex(/^(?:color|typography|spacing|radius|shadow|breakpoint|motion)\.[a-z][a-z0-9-]{0,62}$/);

export const designFoundationSchema = z.object({
  id: z.string().regex(/^lucia\.foundation\.[a-z][a-z0-9-]{1,62}$/),
  version: z.number().int().positive(),
  colors: z.record(slug, z.string().regex(/^#[0-9a-fA-F]{6}$/)),
  typography: z.object({
    bodyFont: z.string().trim().min(1).max(120),
    headingFont: z.string().trim().min(1).max(120),
    scale: z.record(slug, z.number().positive().max(128)),
    lineHeight: z.record(slug, z.number().min(1).max(2.5)),
  }).strict(),
  spacing: z.record(slug, z.number().positive().max(512)),
  radius: z.record(slug, z.number().min(0).max(1000)),
  shadows: z.record(slug, z.string().max(160)),
  breakpoints: z.object({
    mobile: z.number().int().positive(),
    tablet: z.number().int().positive(),
    desktop: z.number().int().positive(),
  }).strict().refine(v => v.mobile < v.tablet && v.tablet < v.desktop, "Breakpoints must increase"),
  motion: z.object({
    durationFastMs: z.number().int().min(0).max(2000),
    durationNormalMs: z.number().int().min(0).max(3000),
    reducedMotionByDefault: z.boolean(),
  }).strict(),
}).strict();

export const recipeLayerSchema = z.enum(["component", "section", "page", "industry"]);
const jsonValueSchema: z.ZodType<unknown> = z.lazy(() => z.union([
  z.string().max(2000),
  z.number().finite(),
  z.boolean(),
  z.null(),
  z.array(jsonValueSchema).max(100),
  z.record(z.string().max(120), jsonValueSchema),
]));

const prohibitedDefaultKeys = new Set([
  "html", "rawhtml", "css", "stylesheet", "script", "javascript",
  "jsx", "component", "componentname", "module", "modulepath",
  "import", "imports", "url", "src", "href", "onclick", "onload",
  "eventhandler",
]);

function findProhibitedDefaultKey(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    for (const item of value) {
      const key = findProhibitedDefaultKey(item);
      if (key) return key;
    }
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (prohibitedDefaultKeys.has(key.toLowerCase().replace(/[-_]/g, ""))) return key;
      const nested = findProhibitedDefaultKey(child);
      if (nested) return nested;
    }
  }
  return undefined;
}

export const designRecipeSchema = z.object({
  id: recipeId,
  version: z.number().int().positive(),
  layer: recipeLayerSchema,
  category: slug,
  supportedNodeTypes: z.array(z.enum(graphNodeTypes)).min(1),
  requiredTokens: z.array(tokenPath).default([]),
  capabilities: z.array(slug).default([]),
  tags: z.array(slug).default([]),
  responsive: z.object({
    mobileFirst: z.boolean(),
    breakpoints: z.array(z.enum(["mobile", "tablet", "desktop"])).min(1),
    behavior: z.enum(["stack", "reflow", "scroll", "adaptive"]),
  }).strict(),
  accessibility: z.object({
    semanticRole: z.string().trim().min(1).max(80),
    keyboardOperable: z.literal(true),
    contrastTarget: z.enum(["AA", "AAA"]),
    reducedMotionAware: z.literal(true),
  }).strict(),
  defaults: z.record(z.string().max(120), jsonValueSchema).default({}),
}).strict().superRefine((recipe, ctx) => {
  if (!recipe.id.startsWith(`lucia.design.${recipe.layer}.`)) {
    ctx.addIssue({ code: "custom", path: ["id"], message: "Recipe ID prefix must match its layer." });
  }
  if (new Set(recipe.supportedNodeTypes).size !== recipe.supportedNodeTypes.length) {
    ctx.addIssue({ code: "custom", path: ["supportedNodeTypes"], message: "Node types must be unique." });
  }
  const prohibitedKey = findProhibitedDefaultKey(recipe.defaults);
  if (prohibitedKey) {
    ctx.addIssue({
      code: "custom",
      path: ["defaults"],
      message: `Recipe defaults contain a prohibited executable or external-reference field: ${prohibitedKey}.`,
    });
  }
  if (new Set(recipe.requiredTokens).size !== recipe.requiredTokens.length) {
    ctx.addIssue({ code: "custom", path: ["requiredTokens"], message: "Required tokens must be unique." });
  }
});

export type DesignFoundation = z.infer<typeof designFoundationSchema>;
export type RecipeLayer = z.infer<typeof recipeLayerSchema>;
export type DesignRecipe = z.infer<typeof designRecipeSchema>;
export type DesignRecipeInput = z.input<typeof designRecipeSchema>;
export type DesignTokenPath = z.infer<typeof tokenPath>;
