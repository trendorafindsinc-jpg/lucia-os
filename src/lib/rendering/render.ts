import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { graphDocumentSchema, type GraphDocument, type GraphNode } from "@/lib/graph/contracts";
import { validateGraphDocument } from "@/lib/graph/validate";
import {
  coreFoundation, lookupDesignRecipe, resolveGraphRecipeReferences,
} from "@/lib/design-intelligence/registry";
import type { DesignFoundation } from "@/lib/design-intelligence/contracts";
import {
  renderDiagnosticSchema, renderRequestSchema, type RenderContext,
  type RenderDiagnostic, type RenderResult, type RendererDefinition,
} from "./contracts";
import { createRendererRegistry, lookupRenderer, type RendererRegistry } from "./registry";

const HERO = "lucia.design.section.hero";
const FEATURES = "lucia.design.section.feature-grid";
const SERVICES = "lucia.design.section.services";

function issue(code: RenderDiagnostic["code"], message: string, nodeId?: string): RenderDiagnostic {
  return renderDiagnosticSchema.parse({ code, severity: "error", message, ...(nodeId ? { nodeId } : {}) });
}
function textValue(value: unknown, max: number): string | null {
  return typeof value === "string" && value.length <= max ? value : null;
}
function contentOf(node: GraphNode): Record<string, unknown> | null {
  const value = node.properties.content;
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
function headingOf(node: GraphNode): string | null {
  return textValue(contentOf(node)?.heading, 240);
}
function descriptionOf(node: GraphNode): string | null {
  return textValue(contentOf(node)?.description, 4000);
}
function itemsOf(node: GraphNode): Array<{ heading: string; description?: string }> | null {
  const items = contentOf(node)?.items;
  if (!Array.isArray(items) || items.length < 1 || items.length > 24) return null;
  const result: Array<{ heading: string; description?: string }> = [];
  for (const item of items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const value = item as Record<string, unknown>;
    if (typeof value.heading !== "string" || !value.heading.trim() || value.heading.length > 160) return null;
    if (value.description !== undefined && (typeof value.description !== "string" || value.description.length > 1000)) return null;
    result.push({ heading: value.heading, ...(typeof value.description === "string" ? { description: value.description } : {}) });
  }
  return result;
}

const heroRenderer: RendererDefinition = {
  recipeId: HERO, recipeVersion: 1, nodeType: "section",
  render(node) {
    const heading = headingOf(node);
    if (!heading) return null;
    const description = descriptionOf(node);
    return h("section", { className: "lucia-section lucia-hero", "aria-labelledby": "hero-" + node.id },
      h("div", { className: "lucia-container lucia-hero__inner" },
        h("div", { className: "lucia-hero__copy" },
          h("h2", { id: "hero-" + node.id }, heading),
          description ? h("p", { className: "lucia-lead" }, description) : null,
        ),
      ),
    );
  },
};
function cardsRenderer(recipeId: string, className: string): RendererDefinition {
  return {
    recipeId, recipeVersion: 1, nodeType: "section",
    render(node) {
      const heading = headingOf(node);
      const description = descriptionOf(node);
      const items = itemsOf(node);
      if (!heading || !items) return null;
      return h("section", { className: "lucia-section " + className, "aria-labelledby": "cards-" + node.id },
        h("div", { className: "lucia-container" },
          h("div", { className: "lucia-section__intro" },
            h("h2", { id: "cards-" + node.id }, heading),
            description ? h("p", { className: "lucia-lead" }, description) : null,
          ),
          h("ul", { className: "lucia-card-grid" },
            ...items.map((item, index) => h("li", { className: "lucia-card", key: index },
              h("article", null,
                h("h3", null, item.heading),
                item.description ? h("p", null, item.description) : null,
              ),
            )),
          ),
        ),
      );
    },
  };
}
const builtins = createRendererRegistry([
  heroRenderer, cardsRenderer(FEATURES, "lucia-features"), cardsRenderer(SERVICES, "lucia-services"),
]);
if (!builtins.ok) throw new Error("Built-in renderer registry invalid: " + builtins.issues.map((x) => x.message).join(" "));
export const builtinRendererRegistry: RendererRegistry = builtins.registry;

function cssFor(foundation: DesignFoundation): string {
  const c = foundation.colors;
  const s = foundation.spacing;
  const r = foundation.radius;
  const tablet = foundation.breakpoints.tablet;
  const desktop = foundation.breakpoints.desktop;
  return `
:root{color-scheme:light;--lucia-canvas:${c.canvas};--lucia-surface:${c.surface};--lucia-text:${c.text};--lucia-muted:${c.muted};--lucia-primary:${c.primary};--lucia-on-primary:${c.onPrimary};--lucia-border:${c.border};--lucia-focus:${c.focus};--lucia-space-sm:${s.sm}px;--lucia-space-md:${s.md}px;--lucia-space-lg:${s.lg}px;--lucia-space-xl:${s.xl}px;--lucia-radius-md:${r.md}px;--lucia-content-width:${foundation.contentWidth.standard}px}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;background:var(--lucia-canvas);color:var(--lucia-text);font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.5}
a{color:var(--lucia-primary);text-underline-offset:.18em}a:focus-visible{outline:3px solid var(--lucia-focus);outline-offset:3px;border-radius:2px}
.lucia-skip-link{position:absolute;left:var(--lucia-space-md);top:-5rem;background:var(--lucia-primary);color:var(--lucia-on-primary);padding:var(--lucia-space-sm) var(--lucia-space-md);z-index:10}
.lucia-skip-link:focus{top:var(--lucia-space-md)}
.lucia-header{border-bottom:1px solid var(--lucia-border);background:var(--lucia-canvas)}
.lucia-container{width:min(calc(100% - 2rem),var(--lucia-content-width));margin-inline:auto}
.lucia-header__inner{min-height:4.5rem;display:flex;align-items:center;justify-content:space-between;gap:var(--lucia-space-md);padding-block:var(--lucia-space-sm)}
.lucia-brand{font-weight:700;color:var(--lucia-text);text-decoration:none}
.lucia-nav ul{display:flex;flex-wrap:wrap;gap:var(--lucia-space-md);list-style:none;margin:0;padding:0}
.lucia-nav a{display:inline-block;padding:.5rem 0}.lucia-nav a[aria-current=page]{font-weight:700;text-decoration-thickness:2px}
.lucia-main{min-height:60vh}.lucia-page-title{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.lucia-section{padding-block:var(--lucia-space-xl)}.lucia-hero{padding-block:clamp(3.5rem,10vw,7rem)}
.lucia-hero__inner{display:grid;gap:var(--lucia-space-lg)}.lucia-hero__copy{max-width:52rem}
.lucia-hero h2{font-size:clamp(2.25rem,7vw,4.5rem);line-height:1.08;letter-spacing:-.035em;margin:0 0 var(--lucia-space-md)}
.lucia-lead{font-size:clamp(1.05rem,2vw,1.25rem);color:var(--lucia-muted);max-width:65ch;margin:0}
.lucia-section__intro{max-width:48rem;margin-bottom:var(--lucia-space-lg)}
.lucia-section__intro h2{font-size:clamp(1.65rem,4vw,2.5rem);line-height:1.15;margin:0 0 var(--lucia-space-sm)}
.lucia-card-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:var(--lucia-space-md);list-style:none;margin:0;padding:0}
.lucia-card{min-width:0;border:1px solid var(--lucia-border);border-radius:var(--lucia-radius-md);background:var(--lucia-surface);padding:var(--lucia-space-lg)}
.lucia-card h3{font-size:1.15rem;margin:0 0 var(--lucia-space-sm)}.lucia-card p{margin:0;color:var(--lucia-muted)}
.lucia-footer{border-top:1px solid var(--lucia-border);padding-block:var(--lucia-space-lg);color:var(--lucia-muted)}
@media(min-width:${tablet}px){.lucia-card-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.lucia-header__inner{min-height:5rem}}
@media(min-width:${desktop}px){.lucia-card-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}
@media(forced-colors:active){.lucia-card{border:1px solid CanvasText}}
`;
}
function pathOf(node: GraphNode): string | null {
  return node.type === "page" ? textValue(node.properties.path, 240) : null;
}
function normalizeRoute(route: string): string | null {
  if (!route.startsWith("/") || route.startsWith("//") || route.includes("//") ||
      /[?#\\\\\u0000-\u001f]/.test(route) || /%(?:2f|5c)/i.test(route)) return null;
  try {
    const decoded = decodeURIComponent(route);
    if (decoded.split("/").some((part) => part === "." || part === "..")) return null;
  } catch { return null; }
  return route.length > 1 ? route.replace(/\/$/, "") : "/";
}
function childSections(graph: GraphDocument, pageId: string): GraphNode[] {
  const order = new Map(graph.edges.filter((edge) => edge.type === "contains_section" && edge.sourceNodeId === pageId).map((edge) => [edge.targetNodeId, edge.order ?? 0]));
  return graph.nodes.filter((node) => node.type === "section" && node.lifecycleStatus === "active" && order.has(node.id))
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0) || a.id.localeCompare(b.id));
}
function fail(diagnostics: RenderDiagnostic[]): RenderResult { return { ok: false, html: null, diagnostics }; }

export interface RenderOptions { foundation?: DesignFoundation; registry?: RendererRegistry; }

export async function renderWebsite(input: unknown, options: RenderOptions = {}): Promise<RenderResult> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return fail([issue("GRAPH_INVALID", "Render input must be an object.")]);
  const raw = input as Record<string, unknown>;
  const request = renderRequestSchema.safeParse({ route: raw.route, viewport: raw.viewport, pageNodeId: raw.pageNodeId });
  if (!request.success) return fail([issue("GRAPH_INVALID", "Render request is invalid.")]);

  const foundation = options.foundation ?? coreFoundation;
  if (JSON.stringify(foundation) !== JSON.stringify(coreFoundation)) {
    return fail([issue("TOKEN_NOT_FOUND", "Only the exact registered design foundation version can be rendered.")]);
  }
  const parsed = graphDocumentSchema.safeParse(raw.graph);
  if (!parsed.success) return fail([issue("GRAPH_INVALID", "Graph document does not match the supported schema.")]);
  const graph = parsed.data;
  const graphIssues = validateGraphDocument(graph);
  if (graphIssues.length) return fail(graphIssues.map((item) => issue("GRAPH_INVALID", item.message, item.nodeId)));
  const recipeIssues = resolveGraphRecipeReferences(graph);
  if (recipeIssues.length) return fail(recipeIssues.map((item) => issue(
    item.code === "RECIPE_NOT_FOUND" ? "RECIPE_NOT_FOUND" :
      item.code === "RECIPE_VERSION_UNSUPPORTED" ? "RECIPE_VERSION_UNSUPPORTED" :
        item.code === "RECIPE_NODE_TYPE_INCOMPATIBLE" ? "RECIPE_NODE_TYPE_INCOMPATIBLE" : "RECIPE_REFERENCE_INVALID",
    item.message, item.nodeId,
  )));

  const pages = graph.nodes.filter((node) => node.type === "page" && node.lifecycleStatus === "active");
  const page = pages.find((node) => node.id === request.data.pageNodeId);
  if (!page) return fail([issue("PAGE_NOT_FOUND", "The requested page does not exist in this graph.", request.data.pageNodeId)]);
  const route = normalizeRoute(request.data.route);
  const expectedRoute = normalizeRoute(pathOf(page) ?? "");
  if (!route || !expectedRoute || route !== expectedRoute) return fail([issue("PAGE_ROUTE_MISMATCH", "The requested route does not match the selected page.", page.id)]);

  const normalizedPageRoutes = new Set<string>();
  for (const candidate of pages) {
    const candidatePath = normalizeRoute(pathOf(candidate) ?? "");
    if (!candidatePath || normalizedPageRoutes.has(candidatePath)) {
      return fail([issue("PAGE_ROUTE_MISMATCH", "Every navigation page must have a unique, safe local route.", candidate.id)]);
    }
    normalizedPageRoutes.add(candidatePath);
  }

  const website = graph.nodes.find((node) => node.type === "website" && node.lifecycleStatus === "active");
  if (!website) return fail([issue("GRAPH_INVALID", "The graph has no active website root.")]);
  const websiteName = textValue(website.properties.name, 120);
  const websiteRecipeId = textValue(website.properties.recipeId, 160);
  const websiteRecipeVersion = website.properties.recipeVersion;
  if (!websiteName || !websiteRecipeId || typeof websiteRecipeVersion !== "number") {
    return fail([issue("RECIPE_REFERENCE_INVALID", "Website name and exact industry recipe reference are required.", website.id)]);
  }
  const websiteRecipe = lookupDesignRecipe(websiteRecipeId, websiteRecipeVersion);
  if (!websiteRecipe.recipe || websiteRecipe.recipe.layer !== "industry") {
    return fail([issue(websiteRecipe.recipe ? "RECIPE_NODE_TYPE_INCOMPATIBLE" : websiteRecipe.diagnostics[0].code, "Website industry recipe is unavailable or incompatible.", website.id)]);
  }

  const context: RenderContext = {
    graph, websiteId: graph.id, pageNodeId: page.id, route,
    viewport: request.data.viewport, foundation,
    mediaResolver: { resolve: async () => null },
    sharedDataResolver: { resolve: async () => null },
  };
  const registry = options.registry ?? builtinRendererRegistry;
  const rendered: ReturnType<RendererDefinition["render"]>[] = [];
  for (const section of childSections(graph, page.id)) {
    const recipeId = textValue(section.properties.recipeId, 160);
    const version = section.properties.recipeVersion;
    if (!recipeId || typeof version !== "number") return fail([issue("RECIPE_REFERENCE_INVALID", "Section requires an exact recipe reference.", section.id)]);
    const renderer = lookupRenderer(registry, recipeId, version, "section");
    if (!renderer) return fail([issue("RENDERER_NOT_REGISTERED", "No reviewed renderer is registered for this section recipe.", section.id)]);
    const element = renderer.render(section, context);
    if (element === null) return fail([issue("UNSUPPORTED_FEATURE", "Section content is incomplete or unsupported by its renderer.", section.id)]);
    rendered.push(element);
  }

  const nav = h("nav", { className: "lucia-nav", "aria-label": "Main navigation" },
    h("ul", null, ...[...pages].sort((a, b) => (pathOf(a) ?? "").localeCompare(pathOf(b) ?? "")).map((item) => {
      const path = pathOf(item) ?? "/";
      const title = textValue(item.properties.title, 120) ?? "Page";
      return h("li", { key: item.id }, h("a", { href: path, ...(item.id === page.id ? { "aria-current": "page" as const } : {}) }, title));
    })),
  );
  const document = h("html", { lang: "en" },
    h("head", null,
      h("meta", { charSet: "utf-8" }),
      h("meta", { name: "viewport", content: "width=device-width, initial-scale=1" }),
      h("meta", { name: "color-scheme", content: "light" }),
      h("title", null, (textValue(page.properties.title, 120) ?? "Page") + " | " + websiteName),
      h("style", { "data-lucia-foundation": foundation.id + "@" + foundation.version }, cssFor(foundation)),
    ),
    h("body", null,
      h("a", { className: "lucia-skip-link", href: "#main-content" }, "Skip to main content"),
      h("header", { className: "lucia-header" },
        h("div", { className: "lucia-container lucia-header__inner" },
          h("a", { className: "lucia-brand", href: "/" }, websiteName), nav,
        ),
      ),
      h("main", { id: "main-content", className: "lucia-main" },
        h("h1", { className: "lucia-page-title" }, textValue(page.properties.title, 120)), ...rendered,
      ),
      h("footer", { className: "lucia-footer" }, h("div", { className: "lucia-container" }, websiteName)),
    ),
  );
  return { ok: true, html: "<!doctype html>" + renderToStaticMarkup(document), diagnostics: [] };
}
