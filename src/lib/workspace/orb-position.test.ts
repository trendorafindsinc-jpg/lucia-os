import { describe, expect, it } from "vitest";
import { DEFAULT_ORB_POSITION, parseOrbPosition, snapOrb } from "./orb-position";

describe("Orb edge placement", () => {
  it("snaps to the nearest side at phone and desktop widths", () => {
    expect(snapOrb(30, 300, 390, 800)).toEqual({ side: "left", y: 0.375 });
    expect(snapOrb(1000, 400, 1440, 900).side).toBe("right");
  });
  it("keeps extreme drags away from the header and bottom controls", () => {
    expect(snapOrb(-500, -100, 320, 600)).toEqual({ side: "left", y: 0.15 });
    expect(snapOrb(5000, 5000, 320, 600)).toEqual({ side: "right", y: 0.85 });
  });
  it("rejects corrupt storage and invalid viewport geometry", () => {
    for (const raw of [null, "invalid", "null", '[]', '{"side":"middle","y":0.5}', '{"side":"left","y":"20"}']) {
      expect(parseOrbPosition(raw)).toEqual(DEFAULT_ORB_POSITION);
    }
    expect(snapOrb(NaN, 0, 0, 0)).toEqual(DEFAULT_ORB_POSITION);
  });
  it("restores a valid edge preference and clamps old offscreen values", () => {
    expect(parseOrbPosition('{"side":"left","y":0.3}')).toEqual({ side: "left", y: 0.3 });
    expect(parseOrbPosition('{"side":"right","y":9}').y).toBe(0.85);
  });
});
