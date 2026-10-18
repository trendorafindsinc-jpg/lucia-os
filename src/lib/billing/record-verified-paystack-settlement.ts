import "server-only";

import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { tenantSettingValue } from "@/lib/tenancy/tenant-context";

type PaymentAttemptRow = {
  id: string;
  invoice_id: string;
  provider_transaction_id: string | null;
  amount_minor: number | string;
  currency: string;
  status: string;
};

type InvoiceRow = {
  id: string;
  amount_due_minor: number | string;
  amount_paid_minor: number | string;
  currency: string;
  status: string;
};

export type VerifiedPaystackSettlement = {
  organizationId: string;
  reference: string;
  transactionId: string;
  amountMinor: number;
  currency: string;
};

export type SettlementResult =
  | { ok: true; outcome: "settled" | "already_settled"; invoiceId: string }
  | { ok: false; reason: "invalid_input" | "payment_not_found" | "payment_not_settleable" | "payment_mismatch" | "invoice_not_payable" | "invoice_amount_mismatch" | "transaction_conflict" };

/**
 * Atomically records a transaction that has already been verified directly with
 * Paystack. This function does not perform provider verification or authorize a
 * user: the caller must do both before calling it. Tenant RLS is set transaction-
 * locally, and both payment attempt and invoice are locked before any write.
 */
export async function recordVerifiedPaystackSettlement(
  input: VerifiedPaystackSettlement,
): Promise<SettlementResult> {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.organizationId) ||
    !input.reference.trim() ||
    !input.transactionId.trim() ||
    !Number.isSafeInteger(input.amountMinor) ||
    input.amountMinor <= 0 ||
    !/^[A-Za-z]{3}$/.test(input.currency)
  ) {
    return { ok: false, reason: "invalid_input" };
  }

  const organizationId = tenantSettingValue(input.organizationId);
  const db = getDb();

  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_organization_id', ${organizationId}, true)`);

    const attempts = await tx.execute(sql<PaymentAttemptRow>`
      select id, invoice_id, provider_transaction_id, amount_minor, currency, status
      from billing_payment_attempts
      where organization_id = ${organizationId}::uuid
        and provider = 'paystack'
        and provider_reference = ${input.reference}
      for update
    `);
    const attempt = attempts[0] as PaymentAttemptRow | undefined;
    if (!attempt) return { ok: false, reason: "payment_not_found" };

    if (attempt.status === "succeeded") {
      if (attempt.provider_transaction_id === input.transactionId) {
        return { ok: true, outcome: "already_settled", invoiceId: attempt.invoice_id };
      }
      return { ok: false, reason: "transaction_conflict" };
    }

    if (!["initialized", "pending"].includes(attempt.status)) {
      return { ok: false, reason: "payment_not_settleable" };
    }

    if (
      Number(attempt.amount_minor) !== input.amountMinor ||
      attempt.currency.toUpperCase() !== input.currency.toUpperCase()
    ) {
      return { ok: false, reason: "payment_mismatch" };
    }

    const invoices = await tx.execute(sql<InvoiceRow>`
      select id, amount_due_minor, amount_paid_minor, currency, status
      from billing_invoices
      where organization_id = ${organizationId}::uuid
        and id = ${attempt.invoice_id}::uuid
      for update
    `);
    const invoice = invoices[0] as InvoiceRow | undefined;
    if (!invoice || !["open", "overdue"].includes(invoice.status)) {
      return { ok: false, reason: "invoice_not_payable" };
    }

    const due = Number(invoice.amount_due_minor);
    const paid = Number(invoice.amount_paid_minor);
    if (
      invoice.currency.toUpperCase() !== input.currency.toUpperCase() ||
      !Number.isSafeInteger(due) ||
      !Number.isSafeInteger(paid) ||
      paid + input.amountMinor !== due
    ) {
      return { ok: false, reason: "invoice_amount_mismatch" };
    }

    await tx.execute(sql`
      update billing_payment_attempts
      set provider_transaction_id = ${input.transactionId},
          status = 'succeeded',
          verified_at = now(),
          updated_at = now()
      where organization_id = ${organizationId}::uuid
        and id = ${attempt.id}::uuid
    `);

    await tx.execute(sql`
      update billing_invoices
      set amount_paid_minor = ${due},
          status = 'paid',
          updated_at = now()
      where organization_id = ${organizationId}::uuid
        and id = ${invoice.id}::uuid
    `);

    return { ok: true, outcome: "settled", invoiceId: invoice.id };
  });
}
