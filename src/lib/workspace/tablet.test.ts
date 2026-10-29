import { describe, expect, it } from "vitest";
import { canUseLatticeSplit } from "./tablet";

describe("Lattice capability-sized tablet split", () => {
  it.each([390, 768, 820, 1024])("retains focus on a %ipx viewport", width => {
    expect(canUseLatticeSplit(width, 2)).toBe(false);
  });
  it.each([1100, 1180, 1280, 1440])("permits two native panes at %ipx", width => {
    expect(canUseLatticeSplit(width, 2)).toBe(true);
  });
  it("does not split with a closed pane", () => {
    expect(canUseLatticeSplit(1180, 1)).toBe(false);
  });
  it("does not treat malformed viewport metrics as usable space", () => {
    expect(canUseLatticeSplit(Number.NaN, 2)).toBe(false);
  });
  it("reevaluates rotation without resetting application state", () => {
    const draft = { websiteId: "draft-1", body: "Unsaved" };
    expect(canUseLatticeSplit(1180, 2)).toBe(true);
    expect(canUseLatticeSplit(820, 2)).toBe(false);
    expect(canUseLatticeSplit(1180, 2)).toBe(true);
    expect(draft.body).toBe("Unsaved");
  });
});
