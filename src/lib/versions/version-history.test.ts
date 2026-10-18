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
});
