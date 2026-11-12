import "server-only";

import { normalizePaystackTransaction } from "./paystack";
import {
  verifyProviderTransaction,
  type ExpectedPayment,
} from "./verify-transaction";

export type PaystackServerVerification =
  | { ok: true; transactionId: string; amountMinor: number; currency: string }
  | { ok: false; reason: "missing_secret" | "provider_unavailable" | "provider_rejected" | "invalid_provider_response" | "payment_mismatch" };

/**
 * Fetch the transaction directly from Paystack. Never use browser redirect data
 * or webhook data as the authoritative transaction record.
 */
export async function verifyPaystackTransactionOnServer(
  expected: ExpectedPayment,
  secret: string | undefined,
  fetcher: typeof fetch = fetch,
): Promise<PaystackServerVerification> {
  if (!secret?.trim()) return { ok: false, reason: "missing_secret" };
  if (!expected.reference.trim()) return { ok: false, reason: "payment_mismatch" };

  let response: Response;
  try {
    response = await fetcher(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(expected.reference)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secret}`,
          Accept: "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    );
  } catch {
    return { ok: false, reason: "provider_unavailable" };
  }

  if (!response.ok) {
    return { ok: false, reason: "provider_rejected" };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { ok: false, reason: "invalid_provider_response" };
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("status" in body) ||
    body.status !== true ||
    !("data" in body) ||
    !body.data ||
    typeof body.data !== "object"
  ) {
    return { ok: false, reason: "invalid_provider_response" };
  }

  const transaction = normalizePaystackTransaction(body.data);
  if (!transaction) return { ok: false, reason: "invalid_provider_response" };

  const result = verifyProviderTransaction(expected, transaction);
  if (!result.ok) return { ok: false, reason: "payment_mismatch" };

  return {
    ok: true,
    transactionId: result.transactionId,
    amountMinor: result.amountMinor,
    currency: result.currency,
  };
}
