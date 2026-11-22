import { describe, expect, it } from "vitest";
import {
  pageInspectorSchema,
  sectionInspectorSchema,
  sectionPropertiesFromInspector,
  websiteInspectorSchema,
} from "./inspector-contracts";

describe("Studio inspector contracts", () => {
  it("validates bounded website names and page titles", () => {
    expect(websiteInspectorSchema.safeParse({ name: "Lucia" }).success).toBe(true);
    expect(websiteInspectorSchema.safeParse({ name: " " }).success).toBe(false);
    expect(pageInspectorSchema.safeParse({ title: "Home", path: "/" }).success).toBe(true);
  });

  it.each(["//evil.test", "/a/../b", "/%2e%2e/private", "/a%2fb", "/a\\b", "/a?x=1", "/a#top"])(
    "rejects unsafe page route %s", (path) => {
      expect(pageInspectorSchema.safeParse({ title: "Page", path }).success).toBe(false);
    },
  );

  it("accepts only safe local page routes", () => {
    expect(pageInspectorSchema.safeParse({ title: "About", path: "/about/team" }).success).toBe(true);
  });

  it("requires paired local action fields and bounded structured cards", () => {
    const base = {
      recipeId: "lucia.design.section.feature-grid",
      heading: "Features",
      description: "What we do",
      actionLabel: "",
      actionHref: "",
      items: [{ heading: "Fast", description: "Quick delivery" }],
    };
    expect(sectionInspectorSchema.safeParse(base).success).toBe(true);
    expect(sectionInspectorSchema.safeParse({ ...base, actionLabel: "Explore" }).success).toBe(false);
    expect(sectionInspectorSchema.safeParse({ ...base, items: [] }).success).toBe(false);
    expect(sectionInspectorSchema.safeParse({ ...base, actionLabel: "Explore", actionHref: "//bad.test" }).success).toBe(false);
  });

  it("builds renderer-compatible section properties while preserving safe registered metadata", () => {
    const result = sectionPropertiesFromInspector({
      recipeId: "lucia.design.section.services",
      heading: "Services",
      description: "",
      actionLabel: "",
      actionHref: "",
      items: [{ heading: "Consulting" }],
    }, { category: "services", defaults: { density: "comfortable" } });
    expect(result).toEqual({
      category: "services",
      defaults: { density: "comfortable" },
      recipeId: "lucia.design.section.services",
      recipeVersion: 1,
      content: { heading: "Services", items: [{ heading: "Consulting" }] },
    });
  });
});
