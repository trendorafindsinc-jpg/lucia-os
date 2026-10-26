import { describe, expect, it } from "vitest";
import { makeInitialDraft } from "@/lib/editor/site-draft";
import { siteStructurePageToBlueprint } from "./loom-adapter";
import { makeInitialStructure, addPage, setHomepage } from "./structure";

describe("site structure Layout Blueprint adapter", () => {
  it("renders the selected saved page through the shared Layout Blueprint contract", () => {
    let structure = makeInitialStructure();
    structure = addPage(structure, "Our Team");
    const team = structure.pages.find((page) => page.title === "Our Team");
    if (!team) throw new Error("test page was not created");

    const blueprint = siteStructurePageToBlueprint(makeInitialDraft("northstar-consulting"), structure, team.id);
    expect(blueprint.pages).toHaveLength(1);
    expect(blueprint.pages[0].path).toBe("/our-team");
    expect(blueprint.pages[0].title).toBe("Our Team");
    expect(blueprint.pages[0].sections.length).toBe(team.sectionTypes.length);
    expect(blueprint.navigation.map((item) => item.label)).toContain("Our Team");
  });

  it("keeps homepage preview at the root path after switching home page", () => {
    const structure = setHomepage(makeInitialStructure(), "about");
    const blueprint = siteStructurePageToBlueprint(makeInitialDraft("northstar-consulting"), structure, "about");
    expect(blueprint.pages[0].path).toBe("/");
    expect(blueprint.pages[0].title).toBe("About");
  });
});
