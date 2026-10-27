import { describe, expect, it } from "vitest";
import { safeAuthReturnPath } from "./return-to";

describe("safeAuthReturnPath", () => {
  it("allows known customer entry points and explicit staff entry", () => {
    expect(safeAuthReturnPath("/workspace")).toBe("/workspace");
    expect(safeAuthReturnPath("/workspace/websites")).toBe("/workspace/websites");
    expect(safeAuthReturnPath("/staff")).toBe("/staff");
  });

  it("defaults unknown or malformed destinations to the customer workspace", () => {
    for (const value of [
      undefined,
      "",
      "https://attacker.example",
      "//attacker.example",
      "/\\\\attacker.example",
      "/api/auth/callback",
      "/tenant-site-internal",
      "/staff?debug=1",
      "/staff#internal",
      "%2F%2Fattacker.example",
      "%2Fapi%2Fauth%2Fcallback",
    ]) {
      expect(safeAuthReturnPath(value)).toBe("/workspace");
    }
  });
});
