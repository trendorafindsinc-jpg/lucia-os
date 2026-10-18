import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/client", () => ({
  getDb: vi.fn(() => {
    throw new Error("Database must not be touched for invalid input.");
  }),
}));

import { recordVerifiedPaystackSettlement } from "./record-verified-paystack-settlement";

const valid = {
  organizationId: "123e4567-e89b-42d3-a456-426614174000",
  reference: "pay_ref_123",
  transactionId: "987654",
  amountMinor: 28_000_00,
  currency: "NGN",
};

describe("recordVerifiedPaystackSettlement input guard", () => {
  it("rejects malformed tenant IDs before accessing the database", async () => {
    await expect(
      recordVerifiedPaystackSettlement({ ...valid, organizationId: "tenant-1" }),
    ).resolves.toEqual({ ok: false, reason: "invalid_input" });
  });

  it("rejects unsafe or non-positive amounts before accessing the database", async () => {
    await expect(
      recordVerifiedPaystackSettlement({ ...valid, amountMinor: Number.MAX_SAFE_INTEGER + 1 }),
    ).resolves.toEqual({ ok: false, reason: "invalid_input" });
    await expect(
      recordVerifiedPaystackSettlement({ ...valid, amountMinor: 0 }),
    ).resolves.toEqual({ ok: false, reason: "invalid_input" });
  });

  it("rejects malformed currency and empty provider identifiers", async () => {
    await expect(
      recordVerifiedPaystackSettlement({ ...valid, currency: "NG" }),
    ).resolves.toEqual({ ok: false, reason: "invalid_input" });
    await expect(
      recordVerifiedPaystackSettlement({ ...valid, transactionId: " " }),
    ).resolves.toEqual({ ok: false, reason: "invalid_input" });
  });
});
