# Phase 22 — Paystack webhook verification adapter

## Implemented

- Validates Paystack's HMAC-SHA512 webhook signature against the exact raw request body using a constant-time comparison.
- Rejects absent secrets/signatures and malformed signatures.
- Normalizes a Paystack transaction payload into the shared provider transaction shape, rejecting incomplete or unsafe values.
- Adds focused unit tests for valid signatures, tampered bodies, malformed inputs, and transaction normalization.

## Security boundary

This adapter is a building block, not a payment settlement handler. A valid webhook signature does not replace a server-to-server transaction verification request. Do not mark an invoice paid or grant entitlements from this adapter alone. The caller must load the expected payment from tenant-authorized storage, call Paystack's transaction verification API using server-only credentials, pass the verified response through verifyProviderTransaction, and persist the outcome atomically with replay protection.

No route is exposed, no secret is added, no database is changed, and no deployment occurs in this phase.
