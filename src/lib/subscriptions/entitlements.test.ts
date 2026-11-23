import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSql = vi.hoisted(() => vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({ strings: [...strings], values })));
vi.mock("drizzle-orm", () => ({ sql: mockSql }));
import { hasOrganizationEntitlement } from "./entitlements";

describe("persisted organization entitlement evaluation", () => {
  const organizationId = "f1e4dbf7-12b6-4285-8c4c-42cdb0b4e1fa";
  const tx = { execute: vi.fn() };
  beforeEach(() => { vi.clearAllMocks(); });
  it("returns true only for a currently active persisted grant", async () => {
    tx.execute.mockResolvedValue([{ allowed: true }]);
    await expect(hasOrganizationEntitlement(tx, organizationId, "custom_domains")).resolves.toBe(true);
    expect(tx.execute).toHaveBeenCalledOnce();
    const query = mockSql.mock.results[0]?.value as { values: unknown[] };
    expect(query.values).toContain(organizationId);
    expect(query.values).toContain("custom_domains");
  });
  it("fails closed when the entitlement is absent, expired or suspended", async () => {
    tx.execute.mockResolvedValue([{ allowed: false }]);
    await expect(hasOrganizationEntitlement(tx, organizationId, "custom_domains")).resolves.toBe(false);
  });
  it("fails closed when the database returns no row", async () => {
    tx.execute.mockResolvedValue([]);
    await expect(hasOrganizationEntitlement(tx, organizationId, "custom_domains")).resolves.toBe(false);
  });
});
