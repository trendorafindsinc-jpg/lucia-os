import type { DesignFoundation } from "@/lib/design-intelligence/contracts";
import { foundationTokenPaths } from "@/lib/design-intelligence/registry";

export type ResolvedDesignToken =
  | { kind: "color"; value: string }
  | { kind: "font"; value: "system-sans" }
  | { kind: "number"; value: number }
  | { kind: "shadow"; value: "none" | "subtle" };

const SAFE_SHADOWS = new Set(["none", "0 1px 3px rgba(0,0,0,0.08)"]);
const COLOR_PATHS = new Set(["color.canvas", "color.surface", "color.text", "color.muted", "color.primary", "color.onPrimary", "color.border", "color.focus"]);
const NUMBER_PATHS = new Set([
  ...["xs", "sm", "md", "lg", "xl", "xxl"].map((key) => "spacing." + key),
  ...["none", "sm", "md", "lg", "pill"].map((key) => "radius." + key),
  ...["mobile", "tablet", "desktop"].map((key) => "breakpoint." + key),
  ...["xs", "sm", "md", "lg", "xl", "display"].map((key) => "typography.scale." + key),
  ...["compact", "normal", "relaxed"].map((key) => "typography.lineHeight." + key),
  ...["narrow", "standard", "wide", "full"].map((key) => "contentWidth." + key),
  "motion.durationFastMs", "motion.durationNormalMs",
]);

/** Resolves only a known semantic path on the exact, platform-registered foundation. */
export function resolveDesignToken(foundation: DesignFoundation, path: string): ResolvedDesignToken | null {
  if (!foundationTokenPaths(foundation).includes(path)) return null;
  if (COLOR_PATHS.has(path)) {
    const value = foundation.colors[path.slice("color.".length)];
    return /^#[0-9a-f]{6}$/i.test(value) ? { kind: "color", value } : null;
  }
  if (path === "typography.bodyFont" || path === "typography.headingFont") {
    const value = path.endsWith("bodyFont") ? foundation.typography.bodyFont : foundation.typography.headingFont;
    return value === "system-sans" ? { kind: "font", value } : null;
  }
  if (path.startsWith("shadow.")) {
    const value = foundation.shadows[path.slice("shadow.".length)];
    return SAFE_SHADOWS.has(value) ? { kind: "shadow", value: value === "none" ? "none" : "subtle" } : null;
  }
  if (!NUMBER_PATHS.has(path)) return null;
  const [namespace, key, member] = path.split(".");
  let value: unknown;
  if (namespace === "spacing" || namespace === "radius" || namespace === "contentWidth") value = foundation[namespace][key];
  else if (namespace === "breakpoint" || namespace === "motion") value = foundation[namespace === "breakpoint" ? "breakpoints" : "motion"][key];
  else if (namespace === "typography" && member) value = foundation.typography[key as "scale" | "lineHeight"]?.[member];
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 2400) return null;
  return { kind: "number", value };
}

export function resolveRequiredDesignTokens(foundation: DesignFoundation, paths: readonly string[]): { ok: true; values: ReadonlyMap<string, ResolvedDesignToken> } | { ok: false; missing: string[] } {
  const values = new Map<string, ResolvedDesignToken>();
  const missing: string[] = [];
  for (const path of [...new Set(paths)].sort()) {
    const resolved = resolveDesignToken(foundation, path);
    if (!resolved) missing.push(path);
    else values.set(path, resolved);
  }
  return missing.length ? { ok: false, missing } : { ok: true, values };
}
