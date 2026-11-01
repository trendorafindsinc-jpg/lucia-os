# Phase 20 — Tenant-scoped billing ledger foundation

## Implemented in repository

- Additive PostgreSQL migration for invoices, payment attempts, and webhook event receipts.
- Drizzle schema definitions for the ledger tables.
- Tenant-scoped uniqueness for invoice numbers, payment references, idempotency keys, and provider transaction IDs.
- Composite foreign keys bind each payment attempt to an invoice in the same organisation and each webhook receipt to a payment attempt in the same organisation.
- RLS policies scope all three tables to `app.current_organization_id`.
- Migration `0012_force_rls_billing_ledger.sql` enables `FORCE ROW LEVEL SECURITY` on all three ledger tables so ordinary table owners are subject to the policies too.
- Constraints validate provider names, currency shape, positive amounts, status values, paid amounts not exceeding invoice amounts, and webhook payload SHA-256 format.

## Security and correctness boundaries

- `FORCE ROW LEVEL SECURITY` does **not** constrain superusers or roles with `BYPASSRLS`. The application connection must use a dedicated non-owner `NOBYPASSRLS` role; tests must prove cross-tenant denial under that real login role.
- Application code must set `app.current_organization_id` from verified server-side membership and permission checks inside each transaction. A client-supplied organisation ID is never authorization.
- The migration is additive. It has not been applied to production by this work, and no production database was modified.
- No checkout/webhook route is enabled by this phase. No payment was collected and no entitlement was activated.
- Webhook receipt uniqueness provides a replay-detection primitive, not a complete webhook processor. A future handler must verify the signature over the raw body, resolve a previously created payment reference, call the provider's transaction-verification API, and compare provider, reference, transaction ID, amount, currency, and expected invoice before settlement.
- Receipt recording and invoice/payment state transitions must be atomic. Duplicate or out-of-order events must not double-settle or grant entitlements twice.
- Current invoice/payment-attempt/webhook tables are a billing storage foundation, not a full immutable accounting journal or a durable product-order/entitlement system. Do not represent them as proof that a product has been purchased.

## Acceptance still outstanding

1. CI validates migration journal consistency, lint, typecheck, unit tests, and production build.
2. Apply migrations only to a disposable/staging database using the approved migration procedure; never reset or mutate production as part of this phase.
3. Run integration tests with a non-owner `LOGIN NOBYPASSRLS` role for same-tenant access, cross-tenant reads/writes, missing transaction-local tenant context, and revoked membership.
4. Verify uniqueness and foreign-key rejection for cross-organisation invoice/payment/webhook references.
5. Add transaction-level concurrency tests for duplicate idempotency keys and provider transaction IDs.
6. Before commercial launch, implement provider-side verification, atomic settlement, reconciliation, immutable audit evidence, and purchase/entitlement linkage under separately tested phases.

## Safety

Phase 20 is **not commercially accepted**. No live checkout, production migration, provider credential change, payment, or entitlement activation is authorised by this document.
