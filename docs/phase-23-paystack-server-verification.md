# Phase 23 — Paystack server-side verification

Added `verifyPaystackTransactionOnServer`, a server-only helper that calls Paystack's transaction verification endpoint using the secret key from server configuration. It validates the provider envelope, normalizes the transaction, and checks reference, success status, amount, and currency against the expected invoice/payment values.

## Safety boundary

- The Paystack secret is passed server-side and is never exposed by this helper.
- Provider requests use `cache: no-store` and a 10-second timeout.
- Redirect parameters and webhook payloads are not treated as authoritative payment proof.
- Failures return safe reason codes and do not claim payment succeeded.
- This helper does not write to the billing ledger, mark invoices paid, grant entitlements, or call LUCIA Core.

## Remaining before production settlement

Payment attempt and invoice state must be locked and updated in one database transaction with duplicate transaction/event protection. That work must use the repository's actual database connection and tenant authorization model. No production migration, secret changes, deployment, or live payment was performed in this phase.
