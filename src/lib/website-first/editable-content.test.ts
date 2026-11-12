import { describe, expect, it } from "vitest";
import { premiumCandidate, premiumCandidateIds } from "@/lib/layout-blueprint/premium-layouts/catalogue-candidates";
import { applyPremiumEdit, type PremiumSection } from "@/lib/layout-blueprint/premium-composition";
import { editableText, editableTextMax, replaceEditableText } from "./editable-content";

const layouts = premiumCandidateIds.map((id) => premiumCandidate(id));
const everySection = layouts.flatMap((layout) =>
  layout.pages.flatMap((page) => page.sections.map((section) => ({ layout, page, section }))));

function example(type: PremiumSection["type"]) {
  const item = everySection.find((entry) => entry.section.type === type);
  if (!item) throw Error("Missing section in the existing 48 Layouts: " + type);
  return item;
}

describe("Phase 14 direct granular editing", () => {
  it("retains the validated canonical registry across all 48", () => {
    expect(layouts).toHaveLength(48);
    expect(new Set(layouts.map((item) => item.layoutId)).size).toBe(48);
  });

  it.each([
    ["trust-strip", "trust-item"],
    ["service-journey", "service-title"],
    ["service-journey", "service-body"],
    ["project-gallery", "project-title"],
    ["project-gallery", "project-description"],
    ["premium-hero", "heading"],
    ["premium-hero", "eyebrow"],
    ["contact-panel", "email"],
  ] as const)("changes %s %s through the existing composition engine", (type, field) => {
    const { layout, page, section } = example(type);
    const selection = field === "trust-item" || field.startsWith("service-") || field.startsWith("project-")
      ? { field, index: 0 } as const : { field } as const;
    const current = editableText(section, selection);
    expect(current).not.toBeNull();
    const text = field === "email" ? "owner@example.com" : "Updated customer-owned content";
    const updated = replaceEditableText(section, selection, text);
    const result = applyPremiumEdit(layout, "advanced", { kind: "replace-section", pageId: page.id, section: updated });
    const stored = result.pages.find((item) => item.id === page.id)?.sections.find((item) => item.id === section.id);
    expect(stored).toBeDefined();
    expect(editableText(stored!, selection)).toBe(text);
  });

  it("rejects an invalid long nested field, without modifying its original", () => {
    const { section } = example("service-journey");
    const original = JSON.stringify(section);
    expect(() => replaceEditableText(section, { field: "service-body", index: 0 }, "x".repeat(501))).toThrow();
    expect(editableTextMax(section, "service-body")).toBe(500);
    expect(JSON.stringify(section)).toBe(original);
  });

  it("rejects fields not supported by the selected section", () => {
    const { section } = example("trust-strip");
    expect(editableText(section, { field: "body" })).toBeNull();
    expect(() => replaceEditableText(section, { field: "body" }, "Arbitrary change")).toThrow();
  });
});
