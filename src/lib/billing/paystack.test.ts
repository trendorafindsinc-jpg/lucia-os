import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  normalizePaystackTransaction,
  verifyPaystackWebhookSignature,
} from "./paystack";

describe("verifyPaystackWebhookSignature", () => {
  const secret = "test-secret";
  const body = '{"event":"charge.success","data":{"reference":"ref-1"}}';
  const signature = createHmac("sha512", secret).update(body).digest("hex");

  it("accepts the correct signature for the exact raw body", () => {
    expect(verifyPaystackWebhookSignature(body, signature, secret)).toBe(true);
  });

  it("rejects modified bodies, malformed signatures, and missing secrets", () => {
    expect(verifyPaystackWebhookSignature(body + " ", signature, secret)).toBe(false);
    expect(verifyPaystackWebhookSignature(body, "bad", secret)).toBe(false);
    expect(verifyPaystackWebhookSignature(body, signature, "")).toBe(false);
    expect(verifyPaystackWebhookSignature(body, null, secret)).toBe(false);
  });
});

describe("normalizePaystackTransaction", () => {
  it("normalizes a transaction using minor currency units", () => {
    expect(
      normalizePaystackTransaction({
        reference: "ref-1",
        id: 12345,
        status: "success",
        amount: 2800000,
        currency: "NGN",
      }),
    ).toEqual({
      reference: "ref-1",
      transactionId: "12345",
      status: "success",
      amountMinor: 2800000,
      currency: "NGN",
    });
  });

  it("rejects missing fields and unsafe amounts", () => {
    expect(normalizePaystackTransaction({ reference: "ref-1" })).toBeNull();
    expect(
      normalizePaystackTransaction({
        reference: "ref-1",
        id: 1,
        status: "success",
        amount: Number.MAX_SAFE_INTEGER + 1,
        currency: "NGN",
      }),
    ).toBeNull();
  });
});
