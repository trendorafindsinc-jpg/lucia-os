import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  execute: vi.fn(),
  transaction: vi.fn(),
  getDb: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  getDb: mocks.getDb,
}));

vi.mock("@/lib/tenancy/tenant-context", () => ({
  tenantSettingValue: (value: string) => value,
}));

import { recordVerifiedPaystackSettlement } from "./record-verified-paystack-settlement";

const valid = {
  organizationId: "123e4567-e89b-42d3-a456-426614174000",
  reference: "pay_ref_123",
  transactionId: "987654",
  amountMinor: 2_800_000,
  currency: "NGN",
};

const attempt = (overrides: Record<string, unknown> = {}) => ({
  id: "123e4567-e89b-42d3-a456-426614174001",
  invoice_id: "123e4567-e89b-42d3-a456-426614174002",
  provider_transaction_id: null,
  amount_minor: "2800000",
  currency: "NGN",
  status: "pending",
  ...overrides,
});

const invoice = (overrides: Record<string, unknown> = {}) => ({
  id: "123e4567-e89b-42d3-a456-426614174002",
  amount_due_minor: "2800000",
  amount_paid_minor: "0",
  currency: "NGN",
  status: "open",
  ...overrides,
});

function arrangeDatabase(results: unknown[][]) {
  mocks.execute.mockImplementation(async () => results.shift() ?? []);
  mocks.transaction.mockImplementation(async (callback: (tx: { execute: typeof mocks.execute }) => unknown) =>
    callback({ execute: mocks.execute }),
  );
  mocks.getDb.mockReturnValue({ transaction: mocks.transaction });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.execute.mockReset();
  mocks.transaction.mockReset();
  mocks.getDb.mockReset();
});

describe("recordVerifiedPaystackSettlement input guard", () => {
  it("rejects malformed tenant IDs before accessing the database", async () => {
    await expect(
      recordVerifiedPaystackSettlement({ ...valid, organizationId: "tenant-1" }),
    ).resolves.toEqual({ ok: false, reason: "invalid_input" });
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("rejects unsafe or non-positive amounts before accessing the database", async () => {
    await expect(
      recordVerifiedPaystackSettlement({ ...valid, amountMinor: Number.MAX_SAFE_INTEGER + 1 }),
    ).resolves.toEqual({ ok: false, reason: "invalid_input" });
    await expect(
      recordVerifiedPaystackSettlement({ ...valid, amountMinor: 0 }),
    ).resolves.toEqual({ ok: false, reason: "invalid_input" });
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("rejects malformed currency and empty provider identifiers", async () => {
    await expect(
      recordVerifiedPaystackSettlement({ ...valid, currency: "NG" }),
    ).resolves.toEqual({ ok: false, reason: "invalid_input" });
    await expect(
      recordVerifiedPaystackSettlement({ ...valid, transactionId: " " }),
    ).resolves.toEqual({ ok: false, reason: "invalid_input" });
    expect(mocks.getDb).not.toHaveBeenCalled();
  });
});

describe("recordVerifiedPaystackSettlement", () => {
  it("settles a verified payment and marks the exact invoice balance paid", async () => {
    arrangeDatabase([[], [attempt()], [invoice()], [], []]);

    await expect(recordVerifiedPaystackSettlement(valid)).resolves.toEqual({
      ok: true,
      outcome: "settled",
      invoiceId: invoice().id,
    });
    expect(mocks.execute).toHaveBeenCalledTimes(5);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
  });

  it("treats a repeat callback for the same transaction as idempotent", async () => {
    arrangeDatabase([[], [attempt({ status: "succeeded", provider_transaction_id: valid.transactionId })]]);

    await expect(recordVerifiedPaystackSettlement(valid)).resolves.toEqual({
      ok: true,
      outcome: "already_settled",
      invoiceId: invoice().id,
    });
    expect(mocks.execute).toHaveBeenCalledTimes(2);
  });

  it("rejects a different transaction ID for an already settled attempt", async () => {
    arrangeDatabase([[], [attempt({ status: "succeeded", provider_transaction_id: "other-transaction" })]]);

    await expect(recordVerifiedPaystackSettlement(valid)).resolves.toEqual({
      ok: false,
      reason: "transaction_conflict",
    });
    expect(mocks.execute).toHaveBeenCalledTimes(2);
  });

  it("rejects amount or currency mismatch before reading the invoice", async () => {
    arrangeDatabase([[], [attempt({ amount_minor: "100" })]]);

    await expect(recordVerifiedPaystackSettlement(valid)).resolves.toEqual({
      ok: false,
      reason: "payment_mismatch",
    });
    expect(mocks.execute).toHaveBeenCalledTimes(2);
  });

  it("rejects a non-payable invoice without writing settlement state", async () => {
    arrangeDatabase([[], [attempt()], [invoice({ status: "paid" })]]);

    await expect(recordVerifiedPaystackSettlement(valid)).resolves.toEqual({
      ok: false,
      reason: "invoice_not_payable",
    });
    expect(mocks.execute).toHaveBeenCalledTimes(3);
  });

  it("rejects partial or overpayment when the amount does not exactly clear the invoice", async () => {
    arrangeDatabase([[], [attempt()], [invoice({ amount_due_minor: "3000000" })]]);

    await expect(recordVerifiedPaystackSettlement(valid)).resolves.toEqual({
      ok: false,
      reason: "invoice_amount_mismatch",
    });
    expect(mocks.execute).toHaveBeenCalledTimes(3);
  });

  it("does not write settlement state when the invoice currency differs", async () => {
    arrangeDatabase([[], [attempt()], [invoice({ currency: "USD" })]]);

    await expect(recordVerifiedPaystackSettlement(valid)).resolves.toEqual({
      ok: false,
      reason: "invoice_amount_mismatch",
    });
    expect(mocks.execute).toHaveBeenCalledTimes(3);
  });
});
