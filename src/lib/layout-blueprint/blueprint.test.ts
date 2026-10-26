import { describe, expect, it } from "vitest";
import { makeInitialDraft } from "@/lib/editor/site-draft";
import { layoutBlueprintSchema, siteDraftToLayoutBlueprint } from "@/lib/layout-blueprint/blueprint";

describe("Layout Blueprint v1", () => {
  it("adapts a legacy saved draft without changing its source shape", () => {
    const draft = makeInitialDraft("northstar-consulting");
    const blueprint = siteDraftToLayoutBlueprint(draft);
    expect(blueprint.schema).toBe("lucia.loom-blueprint");
    expect(blueprint.version).toBe(1);
    expect(blueprint.pages[0]?.sections[0]).toMatchObject({
      id: "hero",
      type: "hero",
      heading: draft.headline,
    });
    expect(draft.templateId).toBe("northstar-consulting");
  });

  it("safely bounds long section labels from legacy drafts", () => {
    const draft = {
      ...makeInitialDraft("northstar-consulting"),
      visibleSections: ["A".repeat(180)],
    };
    const blueprint = siteDraftToLayoutBlueprint(draft);
    expect(blueprint.pages[0]?.sections).toContainEqual(expect.objectContaining({
      type: "content-grid",
      items: [expect.objectContaining({ title: "A".repeat(100) })],
    }));
  });

  it("rejects executable or unknown fields rather than passing them to a renderer", () => {
    const blueprint = siteDraftToLayoutBlueprint(makeInitialDraft("northstar-consulting"));
    expect(layoutBlueprintSchema.safeParse({
      ...blueprint,
      unexpectedMarkup: "<script>alert(1)</script>",
    }).success).toBe(false);
  });

  it("rejects duplicate page paths and duplicate section IDs", () => {
    const blueprint = siteDraftToLayoutBlueprint(makeInitialDraft("northstar-consulting"));
    expect(layoutBlueprintSchema.safeParse({
      ...blueprint,
      pages: [blueprint.pages[0], { ...blueprint.pages[0], id: "second-page" }],
    }).success).toBe(false);
    const page = blueprint.pages[0]!;
    expect(layoutBlueprintSchema.safeParse({
      ...blueprint,
      pages: [{ ...page, sections: [page.sections[0]!, page.sections[0]!] }],
    }).success).toBe(false);
  });

  it("requires valid responsive breakpoints and a bounded content width", () => {
    const blueprint = siteDraftToLayoutBlueprint(makeInitialDraft("northstar-consulting"));
    expect(layoutBlueprintSchema.safeParse({ ...blueprint, responsive: { ...blueprint.responsive, mobileBreakpoint: 900 } }).success).toBe(false);
    expect(layoutBlueprintSchema.safeParse({ ...blueprint, responsive: { ...blueprint.responsive, contentMaxWidth: 5000 } }).success).toBe(false);
  });

  it("rejects unsafe paths, invalid colors, and oversized section collections", () => {
    const blueprint = siteDraftToLayoutBlueprint(makeInitialDraft("northstar-consulting"));
    expect(layoutBlueprintSchema.safeParse({
      ...blueprint,
      pages: [{ ...blueprint.pages[0]!, path: "/../private" }],
    }).success).toBe(false);
    expect(layoutBlueprintSchema.safeParse({
      ...blueprint,
      theme: { ...blueprint.theme, colors: ["red", "#ffffff", "#000000"] },
    }).success).toBe(false);
  });
});
