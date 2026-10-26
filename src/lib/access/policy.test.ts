import { describe, expect, it } from "vitest";
import { hasOrganizationPermission, hasPlatformStaffAccess, hasStaffPermission } from "./policy";

describe("LUCIA OS staff access policy", () => {
  const now = new Date("2026-10-18T12:00:00.000Z");

  it("denies access without an active staff grant", () => {
    expect(hasPlatformStaffAccess([], now)).toBe(false);
    expect(hasPlatformStaffAccess([{ role: "support_agent", status: "revoked", expiresAt: null }], now)).toBe(false);
    expect(hasPlatformStaffAccess([{ role: "unknown", status: "active", expiresAt: null }], now)).toBe(false);
  });

  it("denies expired grants and grants that do not include the permission", () => {
    expect(hasStaffPermission([{ role: "support_agent", status: "active", expiresAt: new Date("2026-10-18T11:59:59Z") }], "support.cases.read", now)).toBe(false);
    expect(hasStaffPermission([{ role: "support_agent", status: "active", expiresAt: null }], "staff.grants.manage", now)).toBe(false);
  });

  it("allows only explicitly assigned staff permissions", () => {
    expect(hasStaffPermission([{ role: "support_agent", status: "active", expiresAt: null }], "support.cases.reply", now)).toBe(true);
    expect(hasStaffPermission([{ role: "support_agent", status: "active", expiresAt: null }], "tenants.suspend", now)).toBe(false);
  });

  it("grants Loom review permissions only to designated platform staff roles", () => {
    expect(hasStaffPermission([{ role: "platform_operator", status: "active", expiresAt: null }], "loom.verify_business", now)).toBe(true);
    expect(hasStaffPermission([{ role: "security_reviewer", status: "active", expiresAt: null }], "loom.moderate", now)).toBe(true);
    expect(hasStaffPermission([{ role: "support_agent", status: "active", expiresAt: null }], "loom.moderate", now)).toBe(false);
    expect(hasStaffPermission([{ role: "platform_operator", status: "revoked", expiresAt: null }], "loom.moderate", now)).toBe(false);
  });
});

describe("LUCIA OS organisation permissions", () => {
  it("fails closed for absent, inactive, or unknown membership", () => {
    expect(hasOrganizationPermission(null, "website.read")).toBe(false);
    expect(hasOrganizationPermission({ role: "owner", status: "suspended" }, "website.read")).toBe(false);
    expect(hasOrganizationPermission({ role: "platform_operator", status: "active" }, "website.read")).toBe(false);
  });

  it("keeps owner-only actions away from admins and editors", () => {
    expect(hasOrganizationPermission({ role: "owner", status: "active" }, "ownership.transfer")).toBe(true);
    expect(hasOrganizationPermission({ role: "admin", status: "active" }, "ownership.transfer")).toBe(false);
    expect(hasOrganizationPermission({ role: "editor", status: "active" }, "members.manage")).toBe(false);
  });

  it("never grants staff powers from tenant membership", () => {
    expect(hasOrganizationPermission({ role: "owner", status: "active" }, "platform.overview.read")).toBe(false);
  });
});
