import { createHmac, timingSafeEqual } from "node:crypto";

import type { VerifiedProviderTransaction } from "./verify-transaction";

/** Verify Paystack's x-paystack-signature against the exact raw request body. */
export function verifyPaystackWebhookSignature(
  rawBody: string | Uint8Array,
  signature: string | null | undefined,
  secret: string,
): boolean {
  if (!signature || !secret || !/^[a-f0-9]{128}$/i.test(signature)) return false;

  const expected = createHmac("sha512", secret).update(rawBody).digest();
  const supplied = Buffer.from(signature, "hex");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

type PaystackTransactionPayload = {
  reference?: unknown;
  id?: unknown;
  status?: unknown;
  amount?: unknown;
  currency?: unknown;
};

/**
 * Normalize a Paystack transaction data object. This does not authenticate the
 * payload. Settlement callers must verify the webhook and fetch the transaction
 * server-to-server before passing the result to verifyProviderTransaction.
 */
export function normalizePaystackTransaction(
  payload: PaystackTransactionPayload,
): VerifiedProviderTransaction | null {
  if (
    typeof payload.reference !== "string" ||
    typeof payload.status !== "string" ||
    typeof payload.currency !== "string" ||
    (typeof payload.id !== "string" && typeof payload.id !== "number") ||
    typeof payload.amount !== "number" ||
    !Number.isSafeInteger(payload.amount)
  ) {
    return null;
  }

  const transactionId = String(payload.id);
  if (!payload.reference.trim() || !transactionId.trim()) return null;

  return {
    reference: payload.reference,
    transactionId,
    status: payload.status,
    amountMinor: payload.amount,
    currency: payload.currency,
  };
}
