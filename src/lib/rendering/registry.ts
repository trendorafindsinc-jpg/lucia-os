import {
  lookupDesignRecipe,
  designRecipeRegistry,
  type RecipeLookupResult,
} from "@/lib/design-intelligence/registry";
import type { DesignRecipe } from "@/lib/design-intelligence/contracts";
import type { GraphNode } from "@/lib/graph/contracts";
import type { RendererDefinition } from "./contracts";

export interface RendererRegistry {
  readonly definitions: Readonly<Record<string, RendererDefinition>>;
}

export type RendererRegistryIssue = {
  code: "DUPLICATE_RENDERER" | "RECIPE_NOT_FOUND" | "RECIPE_VERSION_UNSUPPORTED" | "RECIPE_NODE_TYPE_INCOMPATIBLE";
  key: string;
  message: string;
};

export type RendererRegistryResult =
  | { ok: true; registry: RendererRegistry; issues: [] }
  | { ok: false; registry: null; issues: RendererRegistryIssue[] };

function rendererKey(recipeId: string, version: number, nodeType: GraphNode["type"]): string {
  return recipeId + "@" + version + ":" + nodeType;
}

/** Build a deterministic allowlist from reviewed in-process renderer functions. */
export function createRendererRegistry(
  definitions: readonly RendererDefinition[],
  recipes: readonly DesignRecipe[] = designRecipeRegistry,
): RendererRegistryResult {
  const entries: Record<string, RendererDefinition> = Object.create(null) as Record<string, RendererDefinition>;
  const issues: RendererRegistryIssue[] = [];

  for (const definition of definitions) {
    const key = rendererKey(definition.recipeId, definition.recipeVersion, definition.nodeType);
    if (Object.prototype.hasOwnProperty.call(entries, key)) {
      issues.push({ code: "DUPLICATE_RENDERER", key, message: "Only one renderer may be registered for an exact recipe version and node type." });
      continue;
    }
    const lookup: RecipeLookupResult = lookupDesignRecipe(definition.recipeId, definition.recipeVersion, recipes);
    if (!lookup.recipe) {
      issues.push({
        code: lookup.diagnostics[0].code,
        key,
        message: lookup.diagnostics[0].message,
      });
      continue;
    }
    if (!lookup.recipe.supportedNodeTypes.includes(definition.nodeType)) {
      issues.push({
        code: "RECIPE_NODE_TYPE_INCOMPATIBLE",
        key,
        message: "The recipe does not support the renderer's graph node type.",
      });
      continue;
    }
    entries[key] = Object.freeze({ ...definition });
  }

  if (issues.length) return { ok: false, registry: null, issues };
  return {
    ok: true,
    registry: Object.freeze({ definitions: Object.freeze(entries) }),
    issues: [],
  };
}

export function lookupRenderer(
  registry: RendererRegistry,
  recipeId: string,
  version: number,
  nodeType: GraphNode["type"],
): RendererDefinition | null {
  const key = rendererKey(recipeId, version, nodeType);
  return Object.prototype.hasOwnProperty.call(registry.definitions, key)
    ? registry.definitions[key]
    : null;
}
