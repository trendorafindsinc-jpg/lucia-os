import { describe, expect, it } from "vitest";
import { websiteTemplates } from "./catalogue";
import { getLayoutPreviewHref, getStartingLayoutById, premiumStartingLayouts, startingWebsiteDesigns } from "./starting-layouts";
import { premiumCandidate, premiumCandidateIds } from "@/lib/layout-blueprint/premium-layouts/catalogue-candidates";
import { serializeInitialWebsiteDraft } from "@/lib/onboarding/initial-website-draft";

describe("registered Layout selection", () => {
  it("adapts all 48 canonical designs without replacing legacy starters", () => {
    expect(premiumStartingLayouts.map((layout) => layout.id)).toEqual(premiumCandidateIds);
    expect(premiumStartingLayouts).toHaveLength(48);
    expect(startingWebsiteDesigns).toHaveLength(websiteTemplates.length + 48);
    expect(getStartingLayoutById(websiteTemplates[0].id)).toBe(websiteTemplates[0]);
  });
  it.each(premiumCandidateIds)("creates the actual selected definition: %s", (id) => {
    const saved = JSON.parse(serializeInitialWebsiteDraft(id, "My Customer Website"));
    expect(saved).toEqual(premiumCandidate(id, "My Customer Website"));
    expect(getStartingLayoutById(id)?.sections).toHaveLength(saved.pages.length);
    expect(getLayoutPreviewHref(id)).toBe(`/templates/preview/${id}`);
  });
  it.each(["staff", "../workspace", "lucia.layout.nonexistent", "https://evil.test"])("rejects unsafe or unknown selection %s", (id) => {
    expect(getStartingLayoutById(id)).toBeUndefined();
    expect(() => getLayoutPreviewHref(id)).toThrow();
    expect(() => serializeInitialWebsiteDraft(id, "My Website")).toThrow();
  });
  it("validates customer names before constructing a canonical definition", () => {
    expect(() => serializeInitialWebsiteDraft("lucia.layout.haven", "x")).toThrow();
  });
});
