import { describe, expect, it } from "vitest";
import { verifyProviderTransaction } from "./verify-transaction";

const expected = { reference: "lucia_test_123", amountMinor: 28_000_00, currency: "NGN" };
const actual = {
  reference: "lucia_test_123",
  transactionId: "provider_tx_456",
  status: "success",
  amountMinor: 28_000_00,
  currency: "NGN",
};

describe("verifyProviderTransaction", () => {
  it("accepts a successful exact reference, amount, and currency match", () => {
    expect(verifyProviderTransaction(expected, actual)).toEqual({
      ok: true,
      transactionId: "provider_tx_456",
      amountMinor: 2_800_000,
      currency: "NGN",
    });
  });

  it("rejects a provider reference mismatch", () => {
    expect(verifyProviderTransaction(expected, { ...actual, reference: "other" })).toEqual({
      ok: false,
      reason: "reference_mismatch",
    });
  });

  it("rejects pending and failed transactions", () => {
    expect(verifyProviderTransaction(expected, { ...actual, status: "pending" })).toEqual({
      ok: false,
      reason: "transaction_not_successful",
    });
  });

  it("rejects missing provider transaction IDs", () => {
    expect(verifyProviderTransaction(expected, { ...actual, transactionId: " " })).toEqual({
      ok: false,
      reason: "invalid_transaction_id",
    });
  });

  it("rejects amount mismatches and unsafe numeric values", () => {
    expect(verifyProviderTransaction(expected, { ...actual, amountMinor: 1 })).toEqual({
      ok: false,
      reason: "amount_mismatch",
    });
    expect(verifyProviderTransaction(expected, { ...actual, amountMinor: Number.MAX_SAFE_INTEGER + 1 })).toEqual({
      ok: false,
      reason: "amount_mismatch",
    });
  });

  it("rejects currency mismatches but normalizes case and whitespace", () => {
    expect(verifyProviderTransaction(expected, { ...actual, currency: "USD" })).toEqual({
      ok: false,
      reason: "currency_mismatch",
    });
    expect(verifyProviderTransaction(expected, { ...actual, currency: "ngn" })).toMatchObject({
      ok: true,
      currency: "NGN",
    });
  });

  it("rejects malformed expected payment values", () => {
    expect(verifyProviderTransaction({ ...expected, amountMinor: 0 }, actual)).toEqual({
      ok: false,
      reason: "invalid_expected_payment",
    });
  });
});
