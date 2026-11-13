import { describe, expect, it, vi } from "vitest";
import type { RendererDefinition } from "./contracts";
import { createRendererRegistry, lookupRenderer } from "./registry";

function renderer(overrides: Partial<RendererDefinition> = {}): RendererDefinition {
  return {
    recipeId: "lucia.design.section.hero",
    recipeVersion: 1,
    nodeType: "section",
    render: vi.fn(() => null),
    ...overrides,
  };
}

describe("allowlisted rendering registry", () => {
  it("registers and resolves an exact recipe version and node type", () => {
    const definition = renderer();
    const result = createRendererRegistry([definition]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(lookupRenderer(result.registry, definition.recipeId, 1, "section")).toBe(definition);
    expect(lookupRenderer(result.registry, definition.recipeId, 2, "section")).toBeNull();
    expect(lookupRenderer(result.registry, definition.recipeId, 1, "component")).toBeNull();
  });

  it("rejects duplicate renderer keys", () => {
    const result = createRendererRegistry([renderer(), renderer()]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues[0].code).toBe("DUPLICATE_RENDERER");
  });

  it("rejects recipes that are not registered", () => {
    const result = createRendererRegistry([renderer({ recipeId: "lucia.design.section.unknown" })]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues[0].code).toBe("RECIPE_NOT_FOUND");
  });

  it("rejects an unsupported recipe version", () => {
    const result = createRendererRegistry([renderer({ recipeVersion: 99 })]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues[0].code).toBe("RECIPE_VERSION_UNSUPPORTED");
  });

  it("rejects a node type not supported by the selected recipe", () => {
    const result = createRendererRegistry([renderer({ nodeType: "website" })]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues[0].code).toBe("RECIPE_NODE_TYPE_INCOMPATIBLE");
  });

  it("does not expose mutable registry entries", () => {
    const result = createRendererRegistry([renderer()]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.isFrozen(result.registry)).toBe(true);
    expect(Object.isFrozen(result.registry.definitions)).toBe(true);
    expect(Object.isFrozen(lookupRenderer(result.registry, "lucia.design.section.hero", 1, "section"))).toBe(true);
  });
});
