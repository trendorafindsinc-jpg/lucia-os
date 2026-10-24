import { describe, expect, it } from "vitest";
import { makeInitialDraft } from "@/lib/editor/site-draft";
import { loomBlueprintSchema, siteDraftToLoomBlueprint } from "@/lib/loom/blueprint";

describe("Loom Blueprint v1", () => {
  it("adapts a legacy saved draft without changing its source shape", () => {
    const draft = makeInitialDraft("northstar-consulting");
    const blueprint = siteDraftToLoomBlueprint(draft);
    expect(blueprint.schema).toBe("lucia.loom-blueprint");
    expect(blueprint.version).toBe(1);
    expect(blueprint.pages[0]?.sections[0]).toMatchObject({
      id: "hero",
      type: "hero",
      heading: draft.headline,
    });
    expect(draft.templateId).toBe("northstar-consulting");
  });

  it("rejects executable or unknown fields rather than passing them to a renderer", () => {
    const blueprint = siteDraftToLoomBlueprint(makeInitialDraft("northstar-consulting"));
    expect(loomBlueprintSchema.safeParse({
      ...blueprint,
      unexpectedMarkup: "<script>alert(1)</script>",
    }).success).toBe(false);
  });

  it("rejects duplicate page paths and duplicate section IDs", () => {
    const blueprint = siteDraftToLoomBlueprint(makeInitialDraft("northstar-consulting"));
    expect(loomBlueprintSchema.safeParse({
      ...blueprint,
      pages: [blueprint.pages[0], { ...blueprint.pages[0], id: "second-page" }],
    }).success).toBe(false);
    const page = blueprint.pages[0]!;
    expect(loomBlueprintSchema.safeParse({
      ...blueprint,
      pages: [{ ...page, sections: [page.sections[0]!, page.sections[0]!] }],
    }).success).toBe(false);
  });

  it("requires valid responsive breakpoints and a bounded content width", () => {
    const blueprint = siteDraftToLoomBlueprint(makeInitialDraft("northstar-consulting"));
    expect(loomBlueprintSchema.safeParse({ ...blueprint, responsive: { ...blueprint.responsive, mobileBreakpoint: 900 } }).success).toBe(false);
    expect(loomBlueprintSchema.safeParse({ ...blueprint, responsive: { ...blueprint.responsive, contentMaxWidth: 5000 } }).success).toBe(false);
  });

  it("rejects unsafe paths, invalid colors, and oversized section collections", () => {
    const blueprint = siteDraftToLoomBlueprint(makeInitialDraft("northstar-consulting"));
    expect(loomBlueprintSchema.safeParse({
      ...blueprint,
      pages: [{ ...blueprint.pages[0]!, path: "/../private" }],
    }).success).toBe(false);
    expect(loomBlueprintSchema.safeParse({
      ...blueprint,
      theme: { ...blueprint.theme, colors: ["red", "#ffffff", "#000000"] },
    }).success).toBe(false);
  });
});
