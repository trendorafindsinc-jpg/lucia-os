import { describe, expect, it } from "vitest";
import { coreFoundation } from "@/lib/design-intelligence/registry";
import { resolveDesignToken, resolveRequiredDesignTokens } from "./tokens";

describe("exact design token resolution", () => {
  it("resolves semantic values into typed values", () => {
    expect(resolveDesignToken(coreFoundation, "color.primary")).toEqual({ kind: "color", value: "#315C72" });
    expect(resolveDesignToken(coreFoundation, "spacing.md")).toEqual({ kind: "number", value: 16 });
    expect(resolveDesignToken(coreFoundation, "typography.bodyFont")).toEqual({ kind: "font", value: "system-sans" });
  });

  it("rejects unknown paths and unsupported CSS-bearing values", () => {
    expect(resolveDesignToken(coreFoundation, "color.notRegistered")).toBeNull();
    const unsafe = { ...coreFoundation, shadows: { ...coreFoundation.shadows, subtle: "url(javascript:alert(1))" } };
    expect(resolveDesignToken(unsafe, "shadow.subtle")).toBeNull();
  });

  it("rejects token values with wrong types, unsafe numbers and unsupported shadow values", () => {
    const invalidColor = {
      ...coreFoundation,
      colors: { ...coreFoundation.colors, primary: "red;body{display:none}" },
    };
    expect(resolveDesignToken(invalidColor, "color.primary")).toBeNull();

    const invalidSpacing = {
      ...coreFoundation,
      spacing: { ...coreFoundation.spacing, md: -1 },
    };
    expect(resolveDesignToken(invalidSpacing, "spacing.md")).toBeNull();

    const oversizedBreakpoint = {
      ...coreFoundation,
      breakpoints: { ...coreFoundation.breakpoints, tablet: 2401 },
    };
    expect(resolveDesignToken(oversizedBreakpoint, "breakpoint.tablet")).toBeNull();

    const invalidShadow = {
      ...coreFoundation,
      shadows: { ...coreFoundation.shadows, subtle: "0 0 0 red" },
    };
    expect(resolveDesignToken(invalidShadow, "shadow.subtle")).toBeNull();
  });

  it("returns stable diagnostics for missing required paths", () => {
    const result = resolveRequiredDesignTokens(coreFoundation, ["color.unknown", "spacing.md"]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.missing).toEqual(["color.unknown"]);
  });
});
