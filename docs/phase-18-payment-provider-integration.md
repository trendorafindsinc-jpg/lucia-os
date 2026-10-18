# Phase 18 — Payment provider integration foundation

## Included
- Server-side Paystack and Flutterwave checkout initialization adapters.
- Fail-closed credential checks and server-side secret handling.
- Minor-unit conversion, HTTPS callback validation, and strict trusted checkout URL hosts.
- Paystack raw-body HMAC-SHA512 and Flutterwave webhook secret-hash verification.
- Normalized payment event schema and tests for invalid signatures, unsupported events, provider errors, and amount conversion.

## Not yet safe for customer charges
No public checkout/webhook route is exposed. The app still needs verified LUCIA Core identity and entitlement, durable tenant-isolated invoice/payment records, expected amount/currency/reference binding, idempotency, and provider API transaction verification before any order can be fulfilled. A valid webhook signature alone is not proof that the original invoice was paid.

No provider secrets were configured or changed. No payments collected, production deployment, or database migration performed.

## Required before launch
- Authenticated checkout creation using Core authorization; never trust client tenant IDs or prices.
- Provider-side transaction verification and strict reference, amount, currency, product, and tenant matching.
- Durable webhook replay protection, reconciliation, retries, receipts, refunds, cancellations, and audit events.
- Staging credentials and end-to-end/security testing before enabling production checkout.
