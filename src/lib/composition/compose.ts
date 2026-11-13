import {
  GRAPH_EDGE_SCHEMA_VERSION,
  GRAPH_NODE_SCHEMA_VERSION,
  GRAPH_SCHEMA_VERSION,
  type GraphDocument,
  type GraphEdge,
  type GraphNode,
} from "@/lib/graph/contracts";
import { validateGraphDocument } from "@/lib/graph/validate";
import {
  coreFoundation,
  designRecipeRegistry,
  foundationTokenPaths,
  lookupDesignRecipe,
  resolveGraphRecipeReferences,
  selectDesignRecipes,
} from "@/lib/design-intelligence/registry";
import type { DesignRecipe } from "@/lib/design-intelligence/contracts";
import {
  compositionDiagnosticSchema,
  type CompositionDiagnostic,
  type CompositionRequest,
} from "./contracts";
import { normalizeCompositionRequest } from "./normalize";

export type CompositionResult =
  | { ok: true; graph: GraphDocument; diagnostics: [] }
  | { ok: false; graph: null; diagnostics: CompositionDiagnostic[] };

export interface ComposeOptions {
  idFactory: () => string;
}

function failure(code: CompositionDiagnostic["code"], message: string, requestKey?: string): CompositionDiagnostic {
  return compositionDiagnosticSchema.parse({
    code,
    severity: "error",
    message,
    ...(requestKey ? { requestKey } : {}),
  });
}

function recipeFor(
  preference: { id: string; version: number } | undefined,
  layer: DesignRecipe["layer"],
  category: string,
  nodeType: DesignRecipe["supportedNodeTypes"][number],
  capabilities: readonly string[],
): { recipe: DesignRecipe | null; diagnostics: CompositionDiagnostic[] } {
  const availableTokens = foundationTokenPaths(coreFoundation);
  if (preference) {
    const lookup = lookupDesignRecipe(preference.id, preference.version);
    if (!lookup.recipe) {
      const issue = lookup.diagnostics[0];
      return {
        recipe: null,
        diagnostics: [failure(issue.code, issue.message)],
      };
    }
    const recipe = lookup.recipe;
    const reasons: string[] = [];
    if (recipe.layer !== layer) reasons.push("Recipe layer is incompatible.");
    if (!recipe.supportedNodeTypes.includes(nodeType)) reasons.push("Recipe does not support this graph node type.");
    for (const capability of capabilities) {
      if (!recipe.capabilities.includes(capability)) reasons.push("Missing capability: " + capability);
    }
    for (const token of recipe.requiredTokens) {
      if (!availableTokens.includes(token)) reasons.push("Missing required token: " + token);
    }
    if (reasons.length) {
      return { recipe: null, diagnostics: [failure("RECIPE_INCOMPATIBLE", reasons.join(" "))] };
    }
    return { recipe, diagnostics: [] };
  }

  const selection = selectDesignRecipes({
    layer,
    category,
    requiredCapabilities: capabilities,
    nodeType,
    availableTokens,
  });
  if (!selection.matches[0]) {
    const missingCapability = selection.rejected.some((item) => item.reasons.some((reason) => reason.startsWith("Missing capability:")));
    return {
      recipe: null,
      diagnostics: [failure(missingCapability ? "MISSING_CAPABILITY" : "RECIPE_INCOMPATIBLE", "No registered recipe satisfies the requested layer, category, capabilities and foundation tokens.")],
    };
  }
  return { recipe: selection.matches[0].recipe, diagnostics: [] };
}

/**
 * Compose a candidate graph without persistence. IDs are injected so callers
 * can make retries reproducible; graph content never includes canvas state.
 */
export function composeWebsite(input: unknown, options: ComposeOptions): CompositionResult {
  const normalized = normalizeCompositionRequest(input);
  if (!normalized.ok) {
    return { ok: false, graph: null, diagnostics: normalized.diagnostics.map((item) => compositionDiagnosticSchema.parse(item)) };
  }
  const request: CompositionRequest = normalized.request;

  if (request.foundation.id !== coreFoundation.id) {
    return { ok: false, graph: null, diagnostics: [failure("FOUNDATION_NOT_FOUND", "The requested design foundation is not registered.")] };
  }
  if (request.foundation.version !== coreFoundation.version) {
    return { ok: false, graph: null, diagnostics: [failure("FOUNDATION_VERSION_UNSUPPORTED", "The requested design foundation version is not supported.")] };
  }

  const websiteRecipe = recipeFor(undefined, "industry", request.website.industryCategory, "website", []);
  if (!websiteRecipe.recipe) {
    return { ok: false, graph: null, diagnostics: websiteRecipe.diagnostics.map((item) => ({ ...item, requestKey: "website" })) };
  }

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const graphId = request.website.id;
  const makeNode = (type: GraphNode["type"], properties: Record<string, unknown>): GraphNode => ({
    id: options.idFactory(),
    graphId,
    type,
    schemaVersion: GRAPH_NODE_SCHEMA_VERSION,
    properties,
    lifecycleStatus: "active",
  });
  const makeEdge = (sourceNodeId: string, targetNodeId: string, type: GraphEdge["type"], order?: number): GraphEdge => ({
    id: options.idFactory(),
    graphId,
    sourceNodeId,
    targetNodeId,
    type,
    schemaVersion: GRAPH_EDGE_SCHEMA_VERSION,
    ...(order === undefined ? {} : { order }),
    properties: {},
  });

  const websiteNode = makeNode("website", {
    name: request.website.name,
    recipeId: websiteRecipe.recipe.id,
    recipeVersion: websiteRecipe.recipe.version,
  });
  nodes.push(websiteNode);

  for (const [pageIndex, page] of request.pages.entries()) {
    const pageNode = makeNode("page", { title: page.title, path: page.path });
    nodes.push(pageNode);
    edges.push(makeEdge(websiteNode.id, pageNode.id, "contains_page", pageIndex));

    for (const [sectionIndex, section] of page.sections.entries()) {
      const selected = recipeFor(
        section.recipePreference,
        "section",
        section.category,
        "section",
        section.requiredCapabilities,
      );
      if (!selected.recipe) {
        const diagnostics = selected.diagnostics.map((item) => compositionDiagnosticSchema.parse({
          ...item,
          requestKey: section.key,
          pageKey: page.key,
          sectionKey: section.key,
        }));
        return { ok: false, graph: null, diagnostics };
      }
      const sectionNode = makeNode("section", {
        recipeId: selected.recipe.id,
        recipeVersion: selected.recipe.version,
        category: section.category,
        defaults: selected.recipe.defaults,
        content: section.content,
      });
      nodes.push(sectionNode);
      edges.push(makeEdge(pageNode.id, sectionNode.id, "contains_section", sectionIndex));
    }
  }

  const graph: GraphDocument = {
    id: graphId,
    schemaVersion: GRAPH_SCHEMA_VERSION,
    revision: 0,
    nodes,
    edges,
  };
  const graphDiagnostics = validateGraphDocument(graph);
  if (graphDiagnostics.length) {
    return {
      ok: false,
      graph: null,
      diagnostics: graphDiagnostics.map((item) => failure("GRAPH_INVALID", item.message)),
    };
  }
  const recipeDiagnostics = resolveGraphRecipeReferences(graph, designRecipeRegistry);
  if (recipeDiagnostics.length) {
    return {
      ok: false,
      graph: null,
      diagnostics: recipeDiagnostics.map((item) => failure("GRAPH_INVALID", item.message)),
    };
  }
  return { ok: true, graph, diagnostics: [] };
}
