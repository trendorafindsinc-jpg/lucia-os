import { describe, expect, it } from "vitest";
import { composeWebsite } from "./compose";

const websiteId = "00000000-0000-4000-8000-000000000001";

function request(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    website: { id: websiteId, name: "Example Studio", industryCategory: "professional-services" },
    foundation: { id: "lucia.foundation.core", version: 1 },
    pages: [{
      key: "home",
      title: "Home",
      path: "/",
      sections: [
        { key: "hero", category: "introduction", content: { heading: "Welcome to our studio" } },
        { key: "features", category: "features", content: { heading: "What we do" } },
      ],
    }],
    ...overrides,
  };
}

function ids() {
  let next = 2;
  return () => "00000000-0000-4000-8000-" + String(next++).padStart(12, "0");
}

describe("deterministic website composition", () => {
  it("builds a valid graph using registered industry and section recipes", () => {
    const result = composeWebsite(request(), { idFactory: ids() });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.graph.revision).toBe(0);
    expect(result.graph.nodes.filter((node) => node.type === "website")).toHaveLength(1);
    expect(result.graph.nodes.filter((node) => node.type === "page")).toHaveLength(1);
    expect(result.graph.nodes.filter((node) => node.type === "section")).toHaveLength(2);
    expect(result.graph.edges.map((edge) => edge.type)).toEqual([
      "contains_page", "contains_section", "contains_section",
    ]);
    const hero = result.graph.nodes.find((node) => node.type === "section" && node.properties.category === "introduction");
    expect(hero?.properties.recipeId).toBe("lucia.design.section.hero");
    expect(hero?.properties.content).toEqual({ heading: "Welcome to our studio" });
  });

  it("produces equivalent graph content for equivalent requests and ID sources", () => {
    const first = composeWebsite(request(), { idFactory: ids() });
    const second = composeWebsite(request(), { idFactory: ids() });
    expect(first).toEqual(second);
  });

  it("fails closed for unknown industry recipes", () => {
    const result = composeWebsite(request({
      website: { id: websiteId, name: "Example Studio", industryCategory: "unknown-sector" },
    }), { idFactory: ids() });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.graph).toBeNull();
    expect(result.diagnostics[0].code).toBe("RECIPE_INCOMPATIBLE");
  });

  it("fails closed when an explicitly preferred recipe is missing", () => {
    const result = composeWebsite(request({
      pages: [{
        key: "home", title: "Home", path: "/",
        sections: [{
          key: "hero", category: "introduction",
          recipePreference: { id: "lucia.design.section.not-real", version: 1 },
        }],
      }],
    }), { idFactory: ids() });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostics[0].code).toBe("RECIPE_NOT_FOUND");
    expect(result.diagnostics[0].sectionKey).toBe("hero");
  });

  it("fails closed for an explicitly preferred recipe with incompatible capabilities", () => {
    const result = composeWebsite(request({
      pages: [{
        key: "home", title: "Home", path: "/",
        sections: [{
          key: "hero", category: "introduction",
          requiredCapabilities: ["invented-capability"],
          recipePreference: { id: "lucia.design.section.hero", version: 1 },
        }],
      }],
    }), { idFactory: ids() });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostics[0].code).toBe("RECIPE_INCOMPATIBLE");
  });

  it("rejects unsupported foundation versions before graph construction", () => {
    const result = composeWebsite(request({
      foundation: { id: "lucia.foundation.core", version: 2 },
    }), { idFactory: ids() });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostics[0].code).toBe("FOUNDATION_VERSION_UNSUPPORTED");
  });
});
