import { describe, expect, it } from "vitest";
import { makeInitialDraft, moveSection, siteDraftSchema } from "@/lib/editor/site-draft";

describe("visual editor draft", () => {
  it("creates a draft from a known template", () => {
    const draft = makeInitialDraft("schoolhouse");
    expect(draft.templateId).toBe("schoolhouse");
    expect(draft.visibleSections.length).toBeGreaterThanOrEqual(4);
    expect(siteDraftSchema.safeParse(draft).success).toBe(true);
  });

  it("falls back to a real catalogue template for an unknown id", () => {
    expect(siteDraftSchema.safeParse(makeInitialDraft("missing-template")).success).toBe(true);
  });

  it("reorders sections without mutating the source", () => {
    const source = ["Hero", "About", "Contact"];
    expect(moveSection(source, 0, 1)).toEqual(["About", "Hero", "Contact"]);
    expect(source).toEqual(["Hero", "About", "Contact"]);
  });

  it("keeps sections in place when moving beyond the list", () => {
    expect(moveSection(["Hero", "Contact"], 0, -1)).toEqual(["Hero", "Contact"]);
  });

  it("rejects an invalid or empty draft", () => {
    expect(siteDraftSchema.safeParse({}).success).toBe(false);
    expect(siteDraftSchema.safeParse({ ...makeInitialDraft("schoolhouse"), visibleSections: [] }).success).toBe(false);
  });
});
