# Phase 24 — Atomic Paystack settlement

This phase adds a server-side settlement primitive for a transaction that has already been verified directly with Paystack.

## Guarantees

- Requires a valid organization UUID and establishes the RLS organization scope transaction-locally.
- Locks the matching Paystack payment attempt and its invoice before changing either record.
- Checks the stored attempt amount/currency against the verified provider transaction and requires the payment to exactly cover the invoice's remaining balance.
- Updates the payment attempt and invoice in one database transaction; any database error rolls back both updates.
- A retry for an already-succeeded attempt with the same provider transaction ID returns `already_settled` without incrementing invoice totals again.
- Rejects a different transaction ID for an already-settled attempt and rejects non-payable invoices or attempts.
- The unique provider/transaction index remains the final guard against reusing one provider transaction across attempts.

## Important boundary

This is a persistence primitive, not a public endpoint. Callers must authenticate the session, verify the user's current LUCIA Core permission for the organization, load the stored expected reference/amount/currency, and call `verifyPaystackTransactionOnServer` before passing the verified result here. Never accept organization IDs or verification fields from browser input as authority.

This phase does not add a route, create payment attempts, call Core, grant product entitlements, run a migration, deploy, or contact live payment APIs. A caller-facing workflow and database-backed integration tests remain required before enabling production settlement.

## Follow-up safety tests

The settlement unit tests cover successful state transitions, same-transaction retries, conflicting transaction IDs, attempt amount mismatch, non-payable invoices, exact invoice-balance enforcement, and invoice currency mismatch. These tests mock the database adapter: they are useful logic checks but do **not** prove real PostgreSQL locking, RLS behavior, concurrent callback handling, or rollback. Those guarantees still require database-backed integration tests against an isolated test database before production use.
