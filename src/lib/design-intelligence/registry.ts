import {
  designFoundationSchema,
  designRecipeSchema,
  type DesignFoundation,
  type DesignRecipe,
  type DesignRecipeInput,
  type RecipeLayer,
} from "./contracts";

export const coreFoundation = designFoundationSchema.parse({
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
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 40, "2xl": 64 },
  radius: { none: 0, sm: 4, md: 8, lg: 16, pill: 999 },
  shadows: { none: "none", subtle: "0 1px 3px rgba(0,0,0,0.08)" },
  breakpoints: { mobile: 640, tablet: 900, desktop: 1200 },
  motion: { durationFastMs: 120, durationNormalMs: 220, reducedMotionByDefault: false },
});

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

export const designRecipeRegistry: readonly DesignRecipe[] = Object.freeze(
  recipes.map((recipe) => designRecipeSchema.parse(recipe)),
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

export function validateRecipeRegistry(input: readonly DesignRecipe[]): string[] {
  const issues: string[] = [];
  const seen = new Set<string>();
  for (const recipe of input) {
    const key = `${recipe.id}@${recipe.version}`;
    if (seen.has(key)) issues.push(`Duplicate recipe version: ${key}`);
    seen.add(key);
  }
  return issues;
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
