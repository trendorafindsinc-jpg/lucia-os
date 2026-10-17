import { describe, expect, it } from "vitest";
import { normalizeOrganizationName, organizationSlugBase } from "@/lib/organizations/validation";

describe("organization validation", () => {
  it("trims and normalizes names", () => {
    expect(normalizeOrganizationName("  L-class   Institutions ")).toBe("L-class Institutions");
  });
  it("rejects malformed names", () => {
    expect(normalizeOrganizationName(" ")).toBeNull();
    expect(normalizeOrganizationName("x")).toBeNull();
    expect(normalizeOrganizationName("x".repeat(81))).toBeNull();
    expect(normalizeOrganizationName(42)).toBeNull();
  });
  it("creates URL-safe slug bases", () => {
    expect(organizationSlugBase("L-class Institutions")).toBe("l-class-institutions");
    expect(organizationSlugBase("  !!! ")).toBe("workspace");
  });
});
