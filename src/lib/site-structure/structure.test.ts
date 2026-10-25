import { describe, expect, it } from "vitest";
import { addPage, addReusableSection, makeInitialStructure, makePageId, moveReusableSection, removePage, siteStructureSchema, toggleNavigationPage } from "./structure";

describe("site structure", () => {
  it("starts with four valid pages and an existing homepage", () => {
    const structure = makeInitialStructure();
    expect(siteStructureSchema.safeParse(structure).success).toBe(true);
    expect(structure.pages).toHaveLength(4);
    expect(structure.homePageId).toBe("home");
  });

  it("adds pages with unique safe ids and navigation entries", () => {
    let structure = makeInitialStructure();
    structure = addPage(structure, "Our Story");
    structure = addPage(structure, "Our Story");
    expect(structure.pages.slice(-2).map((page) => page.id)).toEqual(["our-story", "our-story-2"]);
    expect(structure.navigationPageIds.slice(-2)).toEqual(["our-story", "our-story-2"]);
  });

  it("does not remove the homepage or last remaining page", () => {
    const structure = makeInitialStructure();
    expect(removePage(structure, "home")).toEqual(structure);
    const onePage = { homePageId: "home", pages: [structure.pages[0]], navigationPageIds: ["home"] };
    expect(removePage(onePage, "home")).toEqual(onePage);
  });

  it("keeps navigation restricted to existing unique page ids", () => {
    const structure = toggleNavigationPage(makeInitialStructure(), "about");
    expect(structure.navigationPageIds).not.toContain("about");
    expect(siteStructureSchema.safeParse({ ...structure, navigationPageIds: ["home", "missing"] }).success).toBe(false);
  });

  it("rejects duplicate page addresses and a homepage with a non-root address", () => {
    const structure = makeInitialStructure();
    const duplicateSlug = {
      ...structure,
      pages: structure.pages.map((page) => page.id === "about" ? { ...page, slug: "services" } : page),
    };
    expect(siteStructureSchema.safeParse(duplicateSlug).success).toBe(false);

    const nonRootHomepage = {
      ...structure,
      pages: structure.pages.map((page) => page.id === "home" ? { ...page, slug: "home" } : page),
    };
    expect(siteStructureSchema.safeParse(nonRootHomepage).success).toBe(false);
  });

  it("adds and reorders reusable sections without mutating the original", () => {
    const page = makeInitialStructure().pages[0];
    const expanded = addReusableSection(page, "faq");
    expect(expanded.sectionTypes.at(-1)).toBe("faq");
    const reordered = moveReusableSection(expanded.sectionTypes, 0, 1);
    expect(reordered[0]).toBe("intro");
    expect(expanded.sectionTypes[0]).toBe("hero");
  });

  it("normalises page ids", () => {
    expect(makePageId("Étoile & Learning")).toBe("etoile-learning");
  });
});
