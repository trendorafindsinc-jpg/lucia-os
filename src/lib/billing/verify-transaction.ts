/**
 * Pure validation gate for a transaction fetched directly from a payment provider.
 *
 * This function does not authenticate a webhook or contact a provider. Callers must
 * obtain the transaction server-to-server using the stored provider reference, then
 * pass the provider's normalized response here. Browser redirects and webhook
 * payloads are not authoritative transaction records.
 */

export type VerifiedProviderTransaction = {
  reference: string;
  transactionId: string;
  status: string;
  amountMinor: number;
  currency: string;
};

export type ExpectedPayment = {
  reference: string;
  amountMinor: number;
  currency: string;
};

export type TransactionVerification =
  | { ok: true; transactionId: string; amountMinor: number; currency: string }
  | {
      ok: false;
      reason:
        | "invalid_expected_payment"
        | "reference_mismatch"
        | "transaction_not_successful"
        | "invalid_transaction_id"
        | "amount_mismatch"
        | "currency_mismatch";
    };

const normalizedCurrency = (value: string) => value.trim().toUpperCase();

export function verifyProviderTransaction(
  expected: ExpectedPayment,
  actual: VerifiedProviderTransaction,
): TransactionVerification {
  if (
    !expected.reference.trim() ||
    !Number.isSafeInteger(expected.amountMinor) ||
    expected.amountMinor <= 0 ||
    !/^[A-Za-z]{3}$/.test(expected.currency)
  ) {
    return { ok: false, reason: "invalid_expected_payment" };
  }

  if (!actual || actual.reference !== expected.reference) {
    return { ok: false, reason: "reference_mismatch" };
  }

  if (actual.status.trim().toLowerCase() !== "success") {
    return { ok: false, reason: "transaction_not_successful" };
  }

  if (!actual.transactionId.trim()) {
    return { ok: false, reason: "invalid_transaction_id" };
  }

  if (
    !Number.isSafeInteger(actual.amountMinor) ||
    actual.amountMinor !== expected.amountMinor
  ) {
    return { ok: false, reason: "amount_mismatch" };
  }

  if (
    !/^[A-Za-z]{3}$/.test(actual.currency) ||
    normalizedCurrency(actual.currency) !== normalizedCurrency(expected.currency)
  ) {
    return { ok: false, reason: "currency_mismatch" };
  }

  return {
    ok: true,
    transactionId: actual.transactionId,
    amountMinor: actual.amountMinor,
    currency: normalizedCurrency(actual.currency),
  };
}
