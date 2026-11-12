import { afterEach, describe, expect, it, vi } from "vitest";

import { verifyPaystackTransactionOnServer } from "./verify-paystack-server";

const expected = { reference: "invoice-ref-123", amountMinor: 2800000, currency: "NGN" };
const payload = {
  status: true,
  data: {
    reference: expected.reference,
    id: 7654321,
    status: "success",
    amount: expected.amountMinor,
    currency: "NGN",
  },
};

afterEach(() => vi.restoreAllMocks());

describe("verifyPaystackTransactionOnServer", () => {
  it("requires a server secret and never calls Paystack without it", async () => {
    const fetcher = vi.fn();
    await expect(verifyPaystackTransactionOnServer(expected, undefined, fetcher))
      .resolves.toEqual({ ok: false, reason: "missing_secret" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("fetches by encoded reference with bearer authorization and validates provider data", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(payload), { status: 200 }),
    );

    await expect(verifyPaystackTransactionOnServer(expected, "sk_test_secret", fetcher))
      .resolves.toEqual({
        ok: true,
        transactionId: "7654321",
        amountMinor: expected.amountMinor,
        currency: "NGN",
      });

    expect(fetcher).toHaveBeenCalledWith(
      "https://api.paystack.co/transaction/verify/invoice-ref-123",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ Authorization: "Bearer sk_test_secret" }),
        cache: "no-store",
      }),
    );
  });

  it("rejects amount, currency, reference, and unsuccessful transaction mismatches", async () => {
    for (const change of [
      { amount: expected.amountMinor + 100 },
      { currency: "USD" },
      { reference: "another-reference" },
      { status: "abandoned" },
    ]) {
      const changed = { ...payload, data: { ...payload.data, ...change } };
      const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify(changed), { status: 200 }),
      );
      await expect(verifyPaystackTransactionOnServer(expected, "sk_test_secret", fetcher))
        .resolves.toEqual({ ok: false, reason: "payment_mismatch" });
    }
  });

  it("handles provider failures and malformed responses safely", async () => {
    const failedFetch = vi.fn<typeof fetch>().mockResolvedValue(new Response("no", { status: 503 }));
    await expect(verifyPaystackTransactionOnServer(expected, "secret", failedFetch))
      .resolves.toEqual({ ok: false, reason: "provider_rejected" });

    const malformedFetch = vi.fn<typeof fetch>().mockResolvedValue(new Response("{bad", { status: 200 }));
    await expect(verifyPaystackTransactionOnServer(expected, "secret", malformedFetch))
      .resolves.toEqual({ ok: false, reason: "invalid_provider_response" });

    const networkFetch = vi.fn<typeof fetch>().mockRejectedValue(new Error("network down"));
    await expect(verifyPaystackTransactionOnServer(expected, "secret", networkFetch))
      .resolves.toEqual({ ok: false, reason: "provider_unavailable" });
  });
});
