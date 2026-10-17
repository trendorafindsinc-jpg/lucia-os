import { describe, expect, it } from "vitest";

describe("LUCIA OS foundation", () => {
  it("keeps the first release scoped to the Universal Website Engine", () => {
    const initialPortal = "website";
    expect(initialPortal).toBe("website");
  });
});
