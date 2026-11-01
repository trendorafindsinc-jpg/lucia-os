import { describe, expect, it } from "vitest";
import { premiumCandidate } from "./premium-layouts/catalogue-candidates";
import { mutateWebsite } from "./website-definition";

describe("existing premium website design changes", () => {
  it("changes presentation without replacing customer identity, pages, navigation or content", () => {
    const stored = structuredClone(premiumCandidate("lucia.layout.meridian", "Existing Company"));
    stored.pages[0].title = "My actual homepage";
    const hero = stored.pages[0].sections.find((section) => section.type === "premium-hero");
    if (!hero || hero.type !== "premium-hero") throw new Error("Missing fixture hero");
    hero.heading = "Customer-owned headline";
    const before = structuredClone(stored);

    const changed = mutateWebsite(stored, {
      kind: "assign-layout",
      layoutId: "lucia.layout.canvas",
    });

    expect(changed).toMatchObject({
      layoutId: "lucia.layout.canvas",
      identity: before.identity,
      pages: before.pages,
      navigation: before.navigation,
      permissions: before.permissions,
    });
    expect(changed.pages[0].sections.find((section) => section.type === "premium-hero")).toMatchObject({
      heading: "Customer-owned headline",
    });
  });

  it("does not allow structural demo IDs to replace a premium website composition", () => {
    const stored = premiumCandidate("lucia.layout.meridian", "Existing Company");
    expect(() => mutateWebsite(stored, {
      kind: "assign-layout",
      layoutId: "lucia.layout.meridian",
    })).not.toThrow();
  });
});
