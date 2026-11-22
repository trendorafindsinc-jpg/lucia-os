import { describe, expect, it } from "vitest";
import { composeWebsite } from "@/lib/composition/compose";
import { renderWebsite } from "./render";

const websiteId = "00000000-0000-4000-8000-000000000001";
const pageId = "00000000-0000-4000-8000-000000000003";

function graph() {
  let next = 2;
  const composed = composeWebsite({
    schemaVersion: 1,
    website: { id: websiteId, name: "Example & Studio", industryCategory: "professional-services" },
    foundation: { id: "lucia.foundation.core", version: 1 },
    pages: [{
      key: "home", title: "Home", path: "/",
      sections: [
        { key: "hero", category: "introduction", content: { heading: "Build better & brighter", description: "A safe <script>alert(1)</script> text example." } },
        { key: "features", category: "features", content: { heading: "What we do", items: [
          { heading: "Strategy", description: "Plan with clarity." },
          { heading: "Design", description: "Create useful experiences." },
          { heading: "Delivery", description: "Launch with confidence." },
        ] } },
        { key: "services", category: "services", content: { heading: "Our services", items: [
          { heading: "Consulting", description: "Practical guidance." },
        ] } },
      ],
    }],
  }, { idFactory: () => "00000000-0000-4000-8000-" + String(next++).padStart(12, "0") });
  if (!composed.ok) throw new Error(JSON.stringify(composed.diagnostics));
  return composed.graph;
}

function contrastRatio(foreground: string, background: string): number {
  const luminance = (hex: string) => {
    const channels = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
      .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

describe("responsive semantic website renderer", () => {
  it("renders a complete HTML document with shell, navigation, hero and cards", async () => {
    const result = await renderWebsite({ graph: graph(), pageNodeId: pageId, route: "/", viewport: "mobile" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.html.startsWith("<!doctype html><html lang=\"en\">")).toBe(true);
    expect(result.html).toContain("<header");
    expect(result.html).toContain("<nav class=\"lucia-nav\" aria-label=\"Main navigation\">");
    expect(result.html).toContain("<main id=\"main-content\"");
    expect(result.html).toContain("Skip to main content");
    expect(result.html).toContain("aria-current=\"page\"");
    expect(result.html).toContain("<h2");
    expect(result.html).toContain("<h3>Strategy</h3>");
    expect(result.html).toContain("<h3>Consulting</h3>");
    expect(result.html).toContain("@media(min-width:900px)");
    expect(result.html).toContain("@media(min-width:1200px)");
    expect(result.html).toContain("prefers-reduced-motion");
  });

  it("escapes customer content and never interprets it as markup", async () => {
    const result = await renderWebsite({ graph: graph(), pageNodeId: pageId, route: "/", viewport: "desktop" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(result.html).not.toContain("<script>alert(1)</script>");
  });

  it("supports all viewport profiles with mobile-first responsive CSS", async () => {
    const document = graph();
    for (const viewport of ["mobile", "tablet", "desktop"] as const) {
      const result = await renderWebsite({ graph: document, pageNodeId: pageId, route: "/", viewport });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.html).toContain('name="viewport" content="width=device-width, initial-scale=1"');
        expect(result.html).toContain("@media(min-width:900px)");
        expect(result.html).toContain("@media(min-width:1200px)");
      }
    }
  });

  it("fails closed for route mismatches and missing pages", async () => {
    const document = graph();
    const mismatch = await renderWebsite({ graph: document, pageNodeId: pageId, route: "/not-home", viewport: "desktop" });
    expect(mismatch.ok).toBe(false);
    if (!mismatch.ok) expect(mismatch.diagnostics[0].code).toBe("PAGE_ROUTE_MISMATCH");
    const missing = await renderWebsite({ graph: document, pageNodeId: "00000000-0000-4000-8000-000000000099", route: "/", viewport: "desktop" });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.diagnostics[0].code).toBe("PAGE_NOT_FOUND");
  });

  it("rejects unregistered section renderers rather than producing placeholders", async () => {
    const document = graph();
    const changed = {
      ...document,
      nodes: document.nodes.map((node) => node.type === "section" && node.properties.category === "features"
        ? { ...node, properties: { ...node.properties, recipeId: "lucia.design.section.gallery" } }
        : node),
    };
    const result = await renderWebsite({ graph: changed, pageNodeId: pageId, route: "/", viewport: "desktop" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.diagnostics[0].code).toBe("RENDERER_NOT_REGISTERED");
  });

  it("rejects unsafe local navigation destinations in other pages", async () => {
    const document = graph();
    const unsafePageId = "00000000-0000-4000-8000-000000000099";
    const changed = {
      ...document,
      nodes: [...document.nodes, {
        id: unsafePageId, graphId: websiteId, type: "page" as const, schemaVersion: 1,
        properties: { title: "Unsafe", path: "javascript:alert(1)" }, lifecycleStatus: "active" as const,
      }],
      edges: [...document.edges, {
        id: "00000000-0000-4000-8000-000000000098", graphId: websiteId,
        sourceNodeId: "00000000-0000-4000-8000-000000000002", targetNodeId: unsafePageId,
        type: "contains_page" as const, schemaVersion: 1, order: 1, properties: {},
      }],
    };
    const result = await renderWebsite({ graph: changed, pageNodeId: pageId, route: "/", viewport: "desktop" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.diagnostics[0].code).toBe("PAGE_ROUTE_MISMATCH");
  });

  it("rejects invalid graph documents before rendering", async () => {
    const result = await renderWebsite({ graph: { ...graph(), nodes: [] }, pageNodeId: pageId, route: "/", viewport: "desktop" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.diagnostics[0].code).toBe("GRAPH_INVALID");
  });

  it("rejects spoofed foundations instead of injecting arbitrary CSS values", async () => {
    const result = await renderWebsite(
      { graph: graph(), pageNodeId: pageId, route: "/", viewport: "desktop" },
      { foundation: { ...((await import("@/lib/design-intelligence/registry")).coreFoundation), colors: { ...((await import("@/lib/design-intelligence/registry")).coreFoundation.colors), primary: "red;body{display:none}" } } },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.diagnostics[0].code).toBe("TOKEN_NOT_FOUND");
  });
  it("renders accessible landmarks, a single page heading, keyboard focus and contrast-safe foundation colours", async () => {
    const result = await renderWebsite({ graph: graph(), pageNodeId: pageId, route: "/", viewport: "desktop" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect([...result.html.matchAll(/<h1\\b/g)]).toHaveLength(1);
    expect(result.html).toContain('<main id="main-content"');
    expect(result.html).toContain('<nav class="lucia-nav" aria-label="Main navigation">');
    expect(result.html).toContain('aria-labelledby="hero-');
    expect(result.html).toContain('aria-labelledby="cards-');
    expect(result.html).toContain("a:focus-visible");
    expect(result.html).toContain("@media(forced-colors:active)");
    expect(result.html).toContain("@media(prefers-reduced-motion:reduce)");
    const css = result.html.match(/<style[^>]*>([\\s\\S]*?)<\\/style>/)?.[1] ?? "";
    const value = (name: string) => css.match(new RegExp("--lucia-" + name + ":(#[0-9a-f]{6})", "i"))?.[1];
    const canvas = value("canvas");
    expect(canvas).toBeTruthy();
    for (const foreground of [value("text"), value("muted"), value("primary"), value("focus")]) {
      expect(foreground).toBeTruthy();
      expect(contrastRatio(foreground!, canvas!)).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrastRatio(value("on-primary")!, value("primary")!)).toBeGreaterThanOrEqual(4.5);
  });

  it("renders explicit hero calls to action as keyboard-operable local links", async () => {
    const document = graph();
    const changed = {
      ...document,
      nodes: document.nodes.map((node) => node.type === "section" && node.properties.category === "introduction"
        ? { ...node, properties: { ...node.properties, content: { heading: "Welcome", actionLabel: "Contact us", actionHref: "/contact" } } }
        : node),
    };
    const result = await renderWebsite({ graph: changed, pageNodeId: pageId, route: "/", viewport: "mobile" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.html).toContain('<a class="lucia-cta" href="/contact">Contact us</a>');
    const unsafe = await renderWebsite({
      graph: { ...changed, nodes: changed.nodes.map((node) => node.type === "section" && node.properties.category === "introduction"
        ? { ...node, properties: { ...node.properties, content: { heading: "Welcome", actionLabel: "Contact us", actionHref: "javascript:alert(1)" } } }
        : node) },
      pageNodeId: pageId, route: "/", viewport: "mobile",
    });
    expect(unsafe.ok).toBe(false);
    if (!unsafe.ok) expect(unsafe.diagnostics[0].code).toBe("UNSUPPORTED_FEATURE");
  });

  it("uses trusted informative alt text and explicit decorative image semantics", async () => {
    const document = graph();
    const hero = document.nodes.find((node) => node.type === "section" && node.properties.category === "introduction")!;
    const mediaNode = {
      id: "00000000-0000-4000-8000-000000000099", graphId: websiteId, type: "media_reference" as const,
      schemaVersion: 1, properties: { assetId: "00000000-0000-4000-8000-000000000098" }, lifecycleStatus: "active" as const,
    };
    const referenced = {
      ...document,
      nodes: [...document.nodes, mediaNode],
      edges: [...document.edges, {
        id: "00000000-0000-4000-8000-000000000097", graphId: websiteId,
        sourceNodeId: hero.id, targetNodeId: mediaNode.id, type: "references_media" as const,
        schemaVersion: 1, properties: {},
      }],
    };
    const informative = await renderWebsite(
      { graph: referenced, pageNodeId: pageId, route: "/", viewport: "desktop" },
      { mediaResolver: { resolve: async (assetId) => ({
        assetId, url: "/media/team.webp", altText: "Team collaborating", decorative: false,
      }) } },
    );
    expect(informative.ok).toBe(true);
    if (informative.ok) expect(informative.html).toContain('alt="Team collaborating"');

    const decorative = await renderWebsite(
      { graph: referenced, pageNodeId: pageId, route: "/", viewport: "desktop" },
      { mediaResolver: { resolve: async (assetId) => ({
        assetId, url: "/media/texture.webp", altText: null, decorative: true,
      }) } },
    );
    expect(decorative.ok).toBe(true);
    if (decorative.ok) expect(decorative.html).toContain('alt="" aria-hidden="true"');
  });

  it("produces byte-identical HTML regardless of graph node and edge insertion order", async () => {
    const document = graph();
    const first = await renderWebsite({ graph: document, pageNodeId: pageId, route: "/", viewport: "desktop" });
    const reordered = await renderWebsite({
      graph: { ...document, nodes: [...document.nodes].reverse(), edges: [...document.edges].reverse() },
      pageNodeId: pageId, route: "/", viewport: "desktop",
    });
    expect(first.ok).toBe(true);
    expect(reordered.ok).toBe(true);
    if (first.ok && reordered.ok) expect(reordered.html).toBe(first.html);
  });

  it("enforces graph resource limits before attempting rendering", async () => {
    const document = graph();
    const extra = Array.from({ length: 2001 }, (_, index) => ({
      ...document.nodes[0],
      id: "40000000-0000-4000-8000-" + String(index + 1).padStart(12, "0"),
    }));
    const result = await renderWebsite({
      graph: { ...document, nodes: [...document.nodes, ...extra] },
      pageNodeId: pageId, route: "/", viewport: "desktop",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.diagnostics[0].code).toBe("RENDER_LIMIT_EXCEEDED");
  });

  it("rejects duplicate normalized page routes before building navigation", async () => {
    const document = graph();
    const duplicateId = "00000000-0000-4000-8000-000000000099";
    const changed = {
      ...document,
      nodes: [...document.nodes, {
        id: duplicateId, graphId: websiteId, type: "page" as const, schemaVersion: 1,
        properties: { title: "Duplicate", path: "/" }, lifecycleStatus: "active" as const,
      }],
      edges: [...document.edges, {
        id: "00000000-0000-4000-8000-000000000098", graphId: websiteId,
        sourceNodeId: "00000000-0000-4000-8000-000000000002", targetNodeId: duplicateId,
        type: "contains_page" as const, schemaVersion: 1, order: 1, properties: {},
      }],
    };
    const result = await renderWebsite({ graph: changed, pageNodeId: pageId, route: "/", viewport: "desktop" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.diagnostics[0].code).toBe("PAGE_ROUTE_MISMATCH");
  });

});
