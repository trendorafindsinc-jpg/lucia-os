import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { premiumCandidate, premiumCandidateIds } from "./premium-layouts/catalogue-candidates";
import { applyPremiumEdit, premiumLayoutSchema, premiumEditSchema } from "./premium-composition";
import { visualPreset, supportedExpressions, visualExperienceSchema } from "./visual-experience";
import { LayoutRenderer } from "@/components/layout-studio/layout-renderer";
import { websiteMutationSchema, mutateWebsite } from "./website-definition";

describe("LUCIA Visual Experience System", () => {
  it.each(premiumCandidateIds)("preserves and validates customization for %s", (id) => {
    const original = premiumCandidate(id, "Customer Business");
    const value = visualPreset("elegant");
    const edited = applyPremiumEdit(original, "guided", { kind: "visual-experience", value });
    expect(edited.layoutId).toBe(id);
    expect(edited.pages).toEqual(original.pages);
    expect(edited.identity).toEqual(original.identity);
    expect(edited.tokens).toEqual(original.tokens);
    expect(edited.visualExperience).toEqual(value);
    expect(premiumLayoutSchema.parse(JSON.parse(JSON.stringify(edited)))).toEqual(edited);
    for (const expression of supportedExpressions(id)) expect(premiumLayoutSchema.safeParse({ ...original, visualExperience: visualPreset(expression) }).success).toBe(true);
  });
  it("renders three actual expressions through the same public and preview renderer", () => {
    const pairs = [["meridian", "elegant"], ["canvas", "dynamic"], ["haven", "cinematic"]] as const;
    const sequences: string[] = [];
    for (const [id, expression] of pairs) {
      const definition = premiumCandidate("lucia.layout." + id);
      expect(definition.visualExperience?.expression).toBe(expression);
      for (const preview of [true, false]) {
        const html = renderToStaticMarkup(<LayoutRenderer blueprint={definition} preview={preview} />);
        expect(html).toContain(`data-expression="${expression}"`);
        expect(html).toContain('class="layout-site premium-layout premium-visual');
      }
      sequences.push(definition.pages[0].sections.map((section) => section.type).join(","));
    }
    expect(new Set(sequences).size).toBe(3);
  });
  it("enforces Layout capability, expression constraints and Design Lock on server mutations", () => {
    const meridian = premiumCandidate("lucia.layout.meridian");
    expect(() => applyPremiumEdit(meridian, "guided", { kind: "visual-experience", value: visualPreset("cinematic") })).toThrow();
    const locked = { ...meridian, permissions: { ...meridian.permissions, visualExperienceLocked: true } };
    expect(() => applyPremiumEdit(locked, "advanced", { kind: "visual-experience", value: visualPreset("elegant") })).toThrow("Design Lock");
    expect(visualExperienceSchema.safeParse({ ...visualPreset("elegant"), motion: "expressive" }).success).toBe(false);
    expect(premiumEditSchema.safeParse({ kind: "visual-experience", value: { ...visualPreset("dynamic"), script: "alert(1)" } }).success).toBe(false);
    expect(supportedExpressions("lucia.layout.nonexistent")).toEqual([]);
  });
  it("uses the real revisioned mutation contract and serializes reduced-motion settings", () => {
    const definition = premiumCandidate("lucia.layout.canvas");
    const value = { ...visualPreset("dynamic"), reducedMotion: true };
    const mutation = websiteMutationSchema.parse({ kind: "composition-edit", mode: "guided", edits: [{ kind: "visual-experience", value }] });
    const saved = mutateWebsite(definition, mutation);
    expect(renderToStaticMarkup(<LayoutRenderer blueprint={saved as typeof definition} />)).toContain('data-visual-reduced="true"');
  });
  it("leaves stored definitions without visual settings unchanged", () => {
    const definition = premiumCandidate("lucia.layout.meridian");
    delete definition.visualExperience;
    const parsed = premiumLayoutSchema.parse(definition);
    expect(parsed.visualExperience).toBeUndefined();
    expect(renderToStaticMarkup(<LayoutRenderer blueprint={parsed} />)).not.toContain('data-expression=');
  });
});
