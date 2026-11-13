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
});
