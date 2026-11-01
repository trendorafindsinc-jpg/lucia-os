# Phase 18 — Payment provider integration foundation

## Included

- Server-side Paystack and Flutterwave checkout-initialisation adapters.
- Fail-closed credential checks and server-side secret handling.
- Minor-unit conversion, HTTPS callback validation, and strict trusted checkout URL hosts.
- Paystack raw-body HMAC-SHA512 and Flutterwave webhook secret-hash verification.
- Normalised payment event schema and tests for invalid signatures, unsupported events, provider errors, and amount conversion.

## Commercial-model boundary

These provider adapters are infrastructure only. They must support the approved one-time purchase model: an order has a server-defined product/version, licence, price snapshot, currency, and tenant/buyer. The browser may not set the payable amount or the entitlement being purchased. Subscription-like recurring charges must not be introduced for LUCIA software ownership without a new explicit product decision. Third-party recurring services (for example domain renewal or paid email) remain separate from LUCIA software purchases.

## Not safe for customer charges

No public checkout/webhook route is enabled by this phase. The application still needs verified LUCIA Core identity, local membership/permission checks, durable tenant-isolated order/invoice/payment records, expected amount/currency/reference binding, idempotency, and provider API transaction verification before any entitlement is granted. A valid webhook signature alone does not prove that the referenced invoice was paid.

No provider secrets were configured or changed. No payments were collected, production deployment performed, or production database migration applied by this phase.

## Required before launch

- Authenticated checkout creation using server-verified Core identity and local authorization; never trust client tenant IDs, prices, product keys, or version claims.
- Provider-side transaction verification and strict reference, amount, currency, product/version, and tenant matching.
- Durable webhook replay protection, reconciliation, retries, receipts, refund/reversal policy, and audit events.
- Staging credentials and end-to-end/security testing before enabling production checkout.
