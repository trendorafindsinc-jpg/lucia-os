import { describe, expect, it } from "vitest";
import { premiumCandidate } from "./premium-layouts/catalogue-candidates";
import { mutateWebsite } from "./website-definition";
import { parsePremiumLayout } from "./premium-composition";

describe("existing premium website design changes", () => {
  it("changes presentation without replacing customer identity, pages, navigation or content", () => {
    const stored = structuredClone(parsePremiumLayout(premiumCandidate("lucia.layout.meridian", "Existing Company")));
    stored.pages[0].title = "My actual homepage";
    const hero = stored.pages[0].sections.find((section) => section.type === "premium-hero");
    if (!hero || hero.type !== "premium-hero") throw new Error("Missing fixture hero");
    hero.heading = "Customer-owned headline";
    const before = structuredClone(stored);

    const changed = parsePremiumLayout(mutateWebsite(stored, {
      kind: "assign-layout",
      layoutId: "lucia.layout.canvas",
    }));

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
    for (const locked of before.permissions.lockedTokens)
      expect(changed.tokens[locked]).toBe(before.tokens[locked]);
  });

  it("rejects layout changes when design-token permissions are locked", () => {
    const stored = structuredClone(premiumCandidate("lucia.layout.meridian", "Existing Company"));
    stored.permissions.advanced = stored.permissions.advanced.filter((permission) => permission !== "tokens");
    expect(() => mutateWebsite(stored, {
      kind: "assign-layout",
      layoutId: "lucia.layout.canvas",
    })).toThrow(/Design token changes/);
  });

  it("does not allow structural demo IDs to replace a premium website composition", () => {
    const stored = parsePremiumLayout(premiumCandidate("lucia.layout.meridian", "Existing Company"));
    expect(() => mutateWebsite(stored, {
      kind: "assign-layout",
      layoutId: "meridian",
    })).toThrow();
  });
});
