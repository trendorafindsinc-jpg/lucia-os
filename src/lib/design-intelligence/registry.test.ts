import { describe, expect, it } from "vitest";
import { designRecipeSchema } from "./contracts";
import {
  coreFoundation,
  designRecipeRegistry,
  selectDesignRecipes,
  validateRecipeRegistry,
} from "./registry";

describe("Design Intelligence foundations and recipe registry", () => {
  it("provides a valid, ordered, versioned foundation", () => {
    expect(coreFoundation.id).toBe("lucia.foundation.core");
    expect(coreFoundation.breakpoints.mobile).toBeLessThan(coreFoundation.breakpoints.tablet);
    expect(coreFoundation.breakpoints.tablet).toBeLessThan(coreFoundation.breakpoints.desktop);
  });

  it("contains only unique, schema-valid, fixed recipe manifests", () => {
    expect(validateRecipeRegistry(designRecipeRegistry)).toEqual([]);
    expect(designRecipeRegistry.length).toBeGreaterThanOrEqual(5);
    for (const recipe of designRecipeRegistry) {
      expect(designRecipeSchema.safeParse(recipe).success).toBe(true);
    }
  });

  it("rejects executable or unknown manifest fields", () => {
    const recipe = structuredClone(designRecipeRegistry[0]) as unknown as Record<string, unknown>;
    recipe.script = "alert(1)";
    expect(designRecipeSchema.safeParse(recipe).success).toBe(false);
  });

  it("selects only compatible recipes and explains rejected candidates", () => {
    const result = selectDesignRecipes({
      layer: "section",
      category: "introduction",
      nodeType: "section",
      requiredCapabilities: ["primary-message"],
      availableTokens: ["color.canvas", "color.text", "color.primary", "spacing.xl"],
    });
    expect(result.matches.map((item) => item.recipe.id)).toEqual(["lucia.design.section.hero"]);
    expect(result.matches[0].reasons).toContain("Exact category match.");
    expect(result.rejected.some((item) => item.recipeId === "lucia.design.section.contact")).toBe(true);
  });

  it("fails closed when required capabilities or tokens are unavailable", () => {
    const result = selectDesignRecipes({
      layer: "section",
      nodeType: "section",
      requiredCapabilities: ["payments"],
      availableTokens: [],
    });
    expect(result.matches).toEqual([]);
    expect(result.rejected.every((item) => item.reasons.length > 0)).toBe(true);
  });

  it("uses stable ID and version tie-breaking for identical inputs", () => {
    const request = {
      layer: "component" as const,
      nodeType: "component" as const,
      availableTokens: ["color.primary", "color.onPrimary", "radius.md", "spacing.md"],
    };
    const first = selectDesignRecipes(request);
    const second = selectDesignRecipes(request);
    expect(first).toEqual(second);
    expect(first.matches.map((item) => item.recipe.id)).toEqual([
      "lucia.design.component.button",
      "lucia.design.component.card",
    ]);
  });

  it("detects duplicate recipe versions", () => {
    const duplicate = [designRecipeRegistry[0], designRecipeRegistry[0]];
    expect(validateRecipeRegistry(duplicate)).toEqual([
      "Duplicate recipe version: lucia.design.component.button@1",
    ]);
  });

  it("rejects executable and external-reference keys nested in recipe defaults", () => {
    const recipe = structuredClone(designRecipeRegistry[0]) as unknown as Record<string, any>;
    recipe.defaults = { layout: { nested: { href: "https://example.com" } } };
    expect(designRecipeSchema.safeParse(recipe).success).toBe(false);
  });

  it("rejects non-JSON values in recipe defaults", () => {
    const recipe = { ...designRecipeRegistry[0], defaults: { callback: () => "unsafe" } };
    expect(designRecipeSchema.safeParse(recipe).success).toBe(false);
  });
});
