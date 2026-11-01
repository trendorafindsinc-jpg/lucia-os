import { describe, expect, it } from "vitest";
import { assertOrganizationId, tenantSettingValue } from "./tenant-context";

describe("tenant context validation", () => {
  it("accepts and normalizes a UUID organization ID", () => {
    expect(assertOrganizationId("A0B1C2D3-E4F5-4678-9123-ABCDEF012345")).toBe(
      "a0b1c2d3-e4f5-4678-9123-abcdef012345",
    );
  });

  it.each([undefined, null, "", "tenant-1", "0000; DROP TABLE organizations", 42])(
    "rejects an invalid organization ID: %s",
    (value) => {
      expect(() => assertOrganizationId(value)).toThrow("A valid organization ID is required.");
    },
  );

  it("only returns a validated value for transaction-local tenant settings", () => {
    expect(tenantSettingValue("a0b1c2d3-e4f5-4678-9123-abcdef012345")).toBe(
      "a0b1c2d3-e4f5-4678-9123-abcdef012345",
    );
  });
});
