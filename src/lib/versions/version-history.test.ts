import { describe, expect, it } from "vitest";
import { addVersion, makeWebsiteSnapshot, restoreVersion, versionHistorySchema, websiteSnapshotSchema, type WebsiteSnapshot } from "./version-history";

const snapshot: WebsiteSnapshot = {
  siteName: "Northstar Studio",
  headline: "Thoughtful work, clearly presented",
  description: "A simple website draft for a creative studio.",
  palette: "ocean",
  visibleSections: ["hero", "intro", "gallery"],
  pages: [{ id: "home", title: "Home", slug: "", sectionTypes: ["hero", "intro"] }],
  seoTitle: "Northstar Studio | Creative",
  seoDescription: "A creative studio making thoughtful digital and visual work for growing organisations.",
  contentPostCount: 2,
};

describe("website version history", () => {
  it("creates a validated immutable snapshot", () => {
    const copy = makeWebsiteSnapshot(snapshot);
    expect(copy).toEqual(snapshot);
    expect(copy).not.toBe(snapshot);
    expect(copy.pages).not.toBe(snapshot.pages);
  });

  it("adds newest versions first and restores a copy", () => {
    const first = addVersion([], { label: "First draft", snapshot }, new Date("2026-01-01T00:00:00.000Z"));
    const changed = { ...snapshot, headline: "A better headline" };
    const second = addVersion(first, { label: "New headline", snapshot: changed }, new Date("2026-01-02T00:00:00.000Z"));
    expect(second.map((item) => item.label)).toEqual(["New headline", "First draft"]);
    expect(restoreVersion(second[1]).headline).toBe(snapshot.headline);
    expect(restoreVersion(second[1])).not.toBe(second[1].snapshot);
  });

  it("caps history at 25 snapshots", () => {
    let history = versionHistorySchema.parse([]);
    for (let i = 0; i < 27; i++) history = addVersion(history, { label: `Draft ${i}`, snapshot }, new Date(2026, 0, i + 1));
    expect(history).toHaveLength(25);
    expect(history[0].label).toBe("Draft 26");
  });

  it("rejects blank labels and invalid snapshot data", () => {
    expect(() => addVersion([], { label: "  ", snapshot })).toThrow("Give this version a name.");
    expect(websiteSnapshotSchema.safeParse({}).success).toBe(false);
  });
  it("rejects duplicate checkpoint identifiers and unknown snapshot fields", () => {
    const history = addVersion([], { label: "First", snapshot }, new Date("2026-02-01T00:00:00.000Z"));
    expect(versionHistorySchema.safeParse([history[0], history[0]]).success).toBe(false);
    expect(websiteSnapshotSchema.safeParse({ ...snapshot, unexpected: true }).success).toBe(false);
  });

  it("rejects snapshot page and section collections above their documented bounds", () => {
    const pages = Array.from({ length: 51 }, (_, index) => ({ id: String(index), title: "Page", slug: String(index), sectionTypes: [] }));
    const sections = Array.from({ length: 13 }, (_, index) => "section-" + index);
    expect(websiteSnapshotSchema.safeParse({ ...snapshot, pages }).success).toBe(false);
    expect(websiteSnapshotSchema.safeParse({ ...snapshot, visibleSections: sections }).success).toBe(false);
  });

});
