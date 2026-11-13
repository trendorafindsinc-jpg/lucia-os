import {
  designFoundationSchema,
  designRecipeSchema,
  type DesignRecipe,
  type DesignRecipeInput,
  type RecipeLayer,
} from "./contracts";
import type { GraphDocument, GraphNode } from "@/lib/graph/contracts";

export const coreFoundation = deepFreeze(designFoundationSchema.parse({
  id: "lucia.foundation.core",
  version: 1,
  colors: {
    canvas: "#FFFFFF",
    surface: "#F7F8FA",
    text: "#17202A",
    muted: "#667085",
    primary: "#315C72",
    onPrimary: "#FFFFFF",
    border: "#D9E0E5",
    focus: "#246BCE",
  },
  typography: {
    bodyFont: "system-sans",
    headingFont: "system-sans",
    scale: { xs: 12, sm: 14, md: 16, lg: 20, xl: 28, display: 40 },
    lineHeight: { compact: 1.25, normal: 1.5, relaxed: 1.7 },
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 40, xxl: 64 },
  radius: { none: 0, sm: 4, md: 8, lg: 16, pill: 999 },
  shadows: { none: "none", subtle: "0 1px 3px rgba(0,0,0,0.08)" },
  breakpoints: { mobile: 640, tablet: 900, desktop: 1200 },
  motion: { durationFastMs: 120, durationNormalMs: 220, reducedMotionByDefault: false },
  contentWidth: { narrow: 680, standard: 960, wide: 1200, full: 1600 },
}));

const recipes: DesignRecipeInput[] = [
  {
    id: "lucia.design.component.button", version: 1, layer: "component", category: "action",
    supportedNodeTypes: ["component"], requiredTokens: ["color.primary", "color.onPrimary", "radius.md", "spacing.md"],
    capabilities: ["action", "keyboard-navigation"], tags: ["interactive", "form"],
    responsive: { mobileFirst: true, breakpoints: ["mobile", "tablet", "desktop"], behavior: "adaptive" },
    accessibility: { semanticRole: "button", keyboardOperable: true, contrastTarget: "AA", reducedMotionAware: true },
    defaults: { variant: "primary", size: "medium" },
  },
  {
    id: "lucia.design.component.card", version: 1, layer: "component", category: "content",
    supportedNodeTypes: ["component"], requiredTokens: ["color.surface", "color.text", "radius.md", "spacing.md"],
    capabilities: ["content-container"], tags: ["content", "layout"],
    responsive: { mobileFirst: true, breakpoints: ["mobile", "tablet", "desktop"], behavior: "reflow" },
    accessibility: { semanticRole: "group", keyboardOperable: true, contrastTarget: "AA", reducedMotionAware: true },
    defaults: { emphasis: "subtle" },
  },
  {
    id: "lucia.design.section.hero", version: 1, layer: "section", category: "introduction",
    supportedNodeTypes: ["section"], requiredTokens: ["color.canvas", "color.text", "color.primary", "spacing.xl"],
    capabilities: ["primary-message", "optional-call-to-action"], tags: ["homepage", "landing"],
    responsive: { mobileFirst: true, breakpoints: ["mobile", "tablet", "desktop"], behavior: "stack" },
    accessibility: { semanticRole: "region", keyboardOperable: true, contrastTarget: "AA", reducedMotionAware: true },
    defaults: { alignment: "start", mediaPlacement: "aside" },
  },
  {
    id: "lucia.design.section.contact", version: 1, layer: "section", category: "conversion",
    supportedNodeTypes: ["section"], requiredTokens: ["color.surface", "color.text", "spacing.lg"],
    capabilities: ["contact-details", "enquiry-action"], tags: ["contact", "conversion"],
    responsive: { mobileFirst: true, breakpoints: ["mobile", "tablet", "desktop"], behavior: "stack" },
    accessibility: { semanticRole: "region", keyboardOperable: true, contrastTarget: "AA", reducedMotionAware: true },
    defaults: { layout: "split" },
  },
  {
    id: "lucia.design.page.home", version: 1, layer: "page", category: "home",
    supportedNodeTypes: ["page"], requiredTokens: ["color.canvas", "typography.headingFont", "spacing.xl"],
    capabilities: ["navigation", "primary-message"], tags: ["homepage", "marketing"],
    responsive: { mobileFirst: true, breakpoints: ["mobile", "tablet", "desktop"], behavior: "adaptive" },
    accessibility: { semanticRole: "main", keyboardOperable: true, contrastTarget: "AA", reducedMotionAware: true },
    defaults: { sectionOrder: ["hero", "features", "contact"] },
  },
  {
    id: "lucia.design.industry.professional-services", version: 1, layer: "industry", category: "professional-services",
    supportedNodeTypes: ["website", "page", "section"], requiredTokens: ["color.primary", "typography.bodyFont", "spacing.lg"],
    capabilities: ["services", "trust-content", "contact"], tags: ["consulting", "agency", "studio"],
    responsive: { mobileFirst: true, breakpoints: ["mobile", "tablet", "desktop"], behavior: "reflow" },
    accessibility: { semanticRole: "document", keyboardOperable: true, contrastTarget: "AA", reducedMotionAware: true },
    defaults: { tone: "clear", contentPriority: ["services", "trust", "contact"] },
  },
];

function createRecipe(id: string, layer: RecipeLayer, category: string, nodeType: DesignRecipe["supportedNodeTypes"][number], requiredTokens: string[], capabilities: string[], tags: string[], defaults: Record<string, unknown> = {}, semanticRole = "region"): DesignRecipeInput {
  return { id: "lucia.design." + layer + "." + id, version: 1, layer, category, supportedNodeTypes: [nodeType], requiredTokens, capabilities, tags, responsive: { mobileFirst: true, breakpoints: ["mobile", "tablet", "desktop"], behavior: "reflow" }, accessibility: { semanticRole, keyboardOperable: true, contrastTarget: "AA", reducedMotionAware: true }, defaults };
}
const catalogueAdditions: DesignRecipeInput[] = [
  createRecipe("link", "component", "navigation", "component", ["color.primary", "typography.bodyFont", "spacing.sm"], ["navigation", "keyboard-navigation"], ["interactive", "navigation"], { emphasis: "inline" }, "link"),
  createRecipe("navigation", "component", "navigation", "component", ["color.surface", "color.text", "spacing.md"], ["navigation", "keyboard-navigation"], ["header", "navigation"], { placement: "header", collapsibleOnMobile: true }, "navigation"),
  createRecipe("form-field", "component", "form", "component", ["color.text", "color.border", "color.focus", "radius.sm", "spacing.sm"], ["form-input", "labelled-control", "validation-state"], ["form", "input"], { labelPosition: "above" }, "group"),
  createRecipe("feature-grid", "section", "features", "section", ["color.canvas", "color.text", "spacing.lg", "contentWidth.standard"], ["feature-list", "content-container"], ["features", "marketing"], { columns: 3 }),
  createRecipe("services", "section", "services", "section", ["color.surface", "color.text", "spacing.lg", "contentWidth.wide"], ["service-list", "content-container"], ["services", "business"], { presentation: "cards" }),
  createRecipe("testimonials", "section", "testimonials", "section", ["color.canvas", "color.text", "spacing.lg"], ["social-proof", "quote-content"], ["trust", "reviews"], { presentation: "quotes" }),
  createRecipe("pricing", "section", "pricing", "section", ["color.surface", "color.text", "color.primary", "spacing.lg"], ["pricing-options", "comparison"], ["pricing", "conversion"], { presentation: "tiers" }),
  createRecipe("gallery", "section", "gallery", "section", ["color.canvas", "spacing.md", "radius.md"], ["media-gallery", "responsive-images"], ["media", "portfolio"], { columns: 3 }),
  createRecipe("faq", "section", "faq", "section", ["color.surface", "color.text", "spacing.md"], ["questions-and-answers", "keyboard-navigation"], ["support", "content"], { presentation: "accordion" }),
  createRecipe("about", "page", "about", "page", ["color.canvas", "typography.headingFont", "contentWidth.standard"], ["navigation", "story-content"], ["about", "company"], { sectionOrder: ["introduction", "story", "team", "contact"] }, "main"),
  createRecipe("services", "page", "services", "page", ["color.canvas", "typography.headingFont", "contentWidth.wide"], ["navigation", "service-list"], ["services", "business"], { sectionOrder: ["hero", "services", "process", "contact"] }, "main"),
  createRecipe("contact", "page", "contact", "page", ["color.canvas", "typography.headingFont", "spacing.lg"], ["navigation", "contact-details", "enquiry-action"], ["contact", "conversion"], { sectionOrder: ["introduction", "contact-details", "form"] }, "main"),
  createRecipe("blog-index", "page", "blog", "page", ["color.canvas", "color.text", "contentWidth.wide"], ["navigation", "article-list"], ["blog", "content"], { presentation: "article-list" }, "main"),
  createRecipe("product-listing", "page", "commerce", "page", ["color.canvas", "color.text", "spacing.md"], ["product-list", "filtering"], ["commerce", "catalogue"], { presentation: "product-grid" }, "main"),
  createRecipe("landing", "page", "landing", "page", ["color.canvas", "color.primary", "typography.headingFont", "contentWidth.standard"], ["primary-message", "conversion"], ["campaign", "landing"], { sectionOrder: ["hero", "benefits", "proof", "conversion"] }, "main"),
  createRecipe("retail", "industry", "retail", "website", ["color.primary", "typography.bodyFont", "spacing.lg"], ["product-catalogue", "storefront", "contact"], ["retail", "commerce"], { tone: "welcoming", contentPriority: ["catalogue", "trust", "contact"] }, "document"),
  createRecipe("hospitality", "industry", "hospitality", "website", ["color.primary", "typography.headingFont", "contentWidth.wide"], ["booking-information", "gallery", "contact"], ["hospitality", "local-business"], { tone: "welcoming", contentPriority: ["experience", "gallery", "booking"] }, "document"),
];
function deepFreeze<T>(value: T): T { if (value && typeof value === "object" && !Object.isFrozen(value)) { Object.freeze(value); for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child); } return value; }
export const designRecipeRegistry: readonly DesignRecipe[] = deepFreeze(
  [...recipes, ...catalogueAdditions].map((recipe) => designRecipeSchema.parse(recipe)),
);

export interface RecipeSelectionRequest {
  layer: RecipeLayer;
  category?: string;
  requiredCapabilities?: readonly string[];
  nodeType: DesignRecipe["supportedNodeTypes"][number];
  availableTokens: readonly string[];
  tags?: readonly string[];
}

export interface RecipeSelectionResult {
  recipe: DesignRecipe;
  score: number;
  reasons: string[];
}

export interface RecipeRejection {
  recipeId: string;
  version: number;
  reasons: string[];
}

export function foundationTokenPaths(foundation: typeof coreFoundation = coreFoundation): readonly string[] {
  const paths = [...Object.keys(foundation.colors).map((key) => "color." + key), "typography.bodyFont", "typography.headingFont", ...Object.keys(foundation.typography.scale).map((key) => "typography.scale." + key), ...Object.keys(foundation.typography.lineHeight).map((key) => "typography.lineHeight." + key), ...Object.keys(foundation.spacing).map((key) => "spacing." + key), ...Object.keys(foundation.radius).map((key) => "radius." + key), ...Object.keys(foundation.shadows).map((key) => "shadow." + key), ...Object.keys(foundation.breakpoints).map((key) => "breakpoint." + key), ...Object.keys(foundation.motion).map((key) => "motion." + key), ...Object.keys(foundation.contentWidth).map((key) => "contentWidth." + key)];
  return Object.freeze(paths.sort());
}
export type RecipeDiagnostic = { code: "RECIPE_NOT_FOUND" | "RECIPE_VERSION_UNSUPPORTED"; recipeId: string; requestedVersion: number; availableVersions: number[]; message: string };
export type RecipeLookupResult = { recipe: DesignRecipe; diagnostics: [] } | { recipe: null; diagnostics: [RecipeDiagnostic] };
export function lookupDesignRecipe(recipeId: string, version: number, registry: readonly DesignRecipe[] = designRecipeRegistry): RecipeLookupResult {
  const matching = registry.filter((item) => item.id === recipeId); const exact = matching.find((item) => item.version === version);
  if (exact) return { recipe: exact, diagnostics: [] };
  const availableVersions = matching.map((item) => item.version).sort((a, b) => a - b);
  return { recipe: null, diagnostics: [{ code: matching.length ? "RECIPE_VERSION_UNSUPPORTED" : "RECIPE_NOT_FOUND", recipeId, requestedVersion: version, availableVersions, message: matching.length ? "Requested version is unavailable; supported versions: " + availableVersions.join(", ") : "Recipe is not registered." }] };
}
export function validateRecipeRegistry(input: readonly DesignRecipe[]): string[] {
  const issues: string[] = [];
  const seen = new Set<string>();
  const knownTokens = new Set(foundationTokenPaths());
  for (const candidate of input) {
    const parsed = designRecipeSchema.safeParse(candidate);
    if (!parsed.success) { issues.push("Invalid recipe manifest."); continue; }
    const recipe = parsed.data;
    const key = recipe.id + "@" + recipe.version;
    if (seen.has(key)) issues.push("Duplicate recipe version: " + key);
    seen.add(key);
    for (const token of recipe.requiredTokens) if (!knownTokens.has(token)) issues.push("Unknown foundation token: " + key + " requires " + token);
  }
  return issues;
}


export type GraphRecipeReferenceDiagnostic = {
  code: "RECIPE_REFERENCE_INVALID" | "RECIPE_NOT_FOUND" | "RECIPE_VERSION_UNSUPPORTED" | "RECIPE_NODE_TYPE_INCOMPATIBLE";
  nodeId: string;
  recipeId?: string;
  requestedVersion?: number;
  availableVersions?: number[];
  message: string;
};

/** Resolve graph recipe references without coupling graph persistence to this catalogue. */
export function resolveGraphRecipeReferences(graph: Pick<GraphDocument, "nodes">, registry: readonly DesignRecipe[] = designRecipeRegistry): GraphRecipeReferenceDiagnostic[] {
  const diagnostics: GraphRecipeReferenceDiagnostic[] = [];
  for (const node of graph.nodes) {
    if (node.lifecycleStatus === "deleted") continue;
    const recipeId = node.properties.recipeId;
    const recipeVersion = node.properties.recipeVersion;
    if (recipeId === undefined && recipeVersion === undefined) continue;
    if (typeof recipeId !== "string" || typeof recipeVersion !== "number" || !Number.isInteger(recipeVersion) || recipeVersion < 1) {
      diagnostics.push({ code: "RECIPE_REFERENCE_INVALID", nodeId: node.id, ...(typeof recipeId === "string" ? { recipeId } : {}), ...(typeof recipeVersion === "number" ? { requestedVersion: recipeVersion } : {}), message: "Recipe references require a valid recipeId and positive integer recipeVersion." });
      continue;
    }
    const result = lookupDesignRecipe(recipeId, recipeVersion, registry);
    if (!result.recipe) {
      const failure = result.diagnostics[0];
      diagnostics.push({ code: failure.code, nodeId: node.id, recipeId, requestedVersion: recipeVersion, availableVersions: failure.availableVersions, message: failure.message });
      continue;
    }
    if (!(result.recipe.supportedNodeTypes as readonly GraphNode["type"][]).includes(node.type)) {
      diagnostics.push({ code: "RECIPE_NODE_TYPE_INCOMPATIBLE", nodeId: node.id, recipeId, requestedVersion: recipeVersion, message: "The selected recipe does not support graph node type " + node.type + "." });
    }
  }
  return diagnostics;
}
export function selectDesignRecipes(
  request: RecipeSelectionRequest,
  registry: readonly DesignRecipe[] = designRecipeRegistry,
): { matches: RecipeSelectionResult[]; rejected: RecipeRejection[] } {
  const matches: RecipeSelectionResult[] = [];
  const rejected: RecipeRejection[] = [];

  for (const recipe of registry) {
    const reasons: string[] = [];
    if (recipe.layer !== request.layer) reasons.push("Wrong recipe layer.");
    if (!recipe.supportedNodeTypes.includes(request.nodeType)) reasons.push("Node type is not supported.");
    for (const capability of request.requiredCapabilities ?? []) {
      if (!recipe.capabilities.includes(capability)) reasons.push(`Missing capability: ${capability}`);
    }
    for (const token of recipe.requiredTokens) {
      if (!request.availableTokens.includes(token)) reasons.push(`Missing token: ${token}`);
    }
    if (reasons.length) {
      rejected.push({ recipeId: recipe.id, version: recipe.version, reasons });
      continue;
    }

    let score = 0;
    const matchReasons = ["Layer, node type, capabilities and required tokens are compatible."];
    if (request.category && recipe.category === request.category) {
      score += 100;
      matchReasons.push("Exact category match.");
    }
    const matchedTags = (request.tags ?? []).filter((tag) => recipe.tags.includes(tag));
    score += matchedTags.length * 10;
    if (matchedTags.length) matchReasons.push(`Matched tags: ${[...matchedTags].sort().join(", ")}.`);
    matches.push({ recipe, score, reasons: matchReasons });
  }

  matches.sort((a, b) =>
    b.score - a.score ||
    a.recipe.id.localeCompare(b.recipe.id) ||
    a.recipe.version - b.recipe.version,
  );
  rejected.sort((a, b) => a.recipeId.localeCompare(b.recipeId) || a.version - b.version);
  return { matches, rejected };
}
