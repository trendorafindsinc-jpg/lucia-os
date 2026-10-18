# Phase 20 — Tenant-scoped billing ledger foundation

## Delivered in this phase

- Additive PostgreSQL migration for invoices, payment attempts, and webhook event receipts.
- Drizzle schema definitions matching the new ledger tables.
- Tenant-scoped uniqueness for invoice numbers, payment references, idempotency keys, and provider transaction IDs.
- Composite foreign keys ensure a payment attempt and its invoice belong to the same organization, and a webhook receipt belongs to the same organization as its payment attempt.
- Row-level security policies scope all three tables to `app.current_organization_id`.
- Checks constrain provider names, currency format, positive amounts, statuses, and webhook payload SHA-256 format.

## Safety properties and boundaries

- The migration is additive. It does not alter existing tenant/content records and has not been applied to any production database.
- No checkout or webhook HTTP route is exposed by this phase; no payment secrets or live provider credentials are required.
- An idempotency key prevents duplicate attempts for one organization, while unique provider references and transaction IDs reduce duplicate settlement risk.
- Webhook receipt uniqueness supports replay handling, but the future handler must derive the tenant from a previously created payment reference only after signature verification, verify the transaction directly with the provider, and compare provider reference, transaction ID, amount, currency, and expected invoice before changing balances.
- The handler must record the receipt and update payment/invoice state atomically. A duplicate event must not issue duplicate entitlements or fulfill an order twice.
- Application database connections must use a non-owner role without RLS bypass privileges and set `app.current_organization_id` only from server-verified LUCIA Core authorization. A client-supplied organization ID is not authorization.
- The database migration journal and Drizzle schema are included; CI must pass before merge. A staging migration and cross-tenant integration tests are still required before production rollout.

## Not yet production-ready

This is the ledger storage foundation, not an end-to-end billing implementation. Core-authenticated route authorization, provider-side transaction verification, atomic webhook processing, reconciliation/retry operations, audit policy, and staging E2E remain follow-up work. No invoice/payment should be marked paid and no entitlement granted based solely on a browser redirect or a valid webhook signature.
