import { describe, expect, it, vi, beforeEach } from "vitest";

const { permissionMock, entitlementMock } = vi.hoisted(() => ({
  permissionMock: vi.fn(),
  entitlementMock: vi.fn(),
}));

vi.mock("@/lib/core/consumer-client", () => ({
  checkCorePermission: permissionMock,
  checkCoreEntitlement: entitlementMock,
  CoreConsumerError: class CoreConsumerError extends Error {
    constructor(message: string, public status: number, public code: string) {
      super(message);
    }
  },
}));

import { requireCoreEntitlement, requireCorePermission } from "@/lib/core/access-control";

describe("Core-authoritative access control", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows a permission only when Core explicitly returns allowed=true", async () => {
    permissionMock.mockResolvedValue({ allowed: true });
    await expect(requireCorePermission("assertion", "tenant", "website.publish")).resolves.toBeUndefined();
    expect(permissionMock).toHaveBeenCalledWith("assertion", "tenant", "website.publish");
  });

  it("denies explicit permission rejection", async () => {
    permissionMock.mockResolvedValue({ allowed: false });
    await expect(requireCorePermission("assertion", "tenant", "website.publish"))
      .rejects.toMatchObject({ status: 403, code: "PERMISSION_DENIED" });
  });

  it("fails closed on malformed permission results", async () => {
    permissionMock.mockResolvedValue({ allowed: "yes" });
    await expect(requireCorePermission("assertion", "tenant", "website.publish"))
      .rejects.toMatchObject({ status: 502, code: "CORE_AUTHORIZATION_INVALID" });
  });

  it("requires an explicit active entitlement", async () => {
    entitlementMock.mockResolvedValue({ active: true });
    await expect(requireCoreEntitlement("assertion", "tenant", "website_portal")).resolves.toBeUndefined();
    entitlementMock.mockResolvedValue({ active: false });
    await expect(requireCoreEntitlement("assertion", "tenant", "website_portal"))
      .rejects.toMatchObject({ status: 403, code: "ENTITLEMENT_REQUIRED" });
  });

  it("fails closed on malformed entitlement results", async () => {
    entitlementMock.mockResolvedValue({});
    await expect(requireCoreEntitlement("assertion", "tenant", "website_portal"))
      .rejects.toMatchObject({ status: 502, code: "CORE_ENTITLEMENT_INVALID" });
  });

  it("does not turn a Core outage into permission", async () => {
    permissionMock.mockRejectedValue(new Error("Core unavailable"));
    await expect(requireCorePermission("assertion", "tenant", "website.edit")).rejects.toThrow("Core unavailable");
  });
});
