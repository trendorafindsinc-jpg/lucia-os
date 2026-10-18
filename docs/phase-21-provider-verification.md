# Phase 21 — Provider transaction verification gate

## Delivered

- A pure, deterministic verification gate for normalized provider transaction records fetched server-to-server.
- Requires an exact stored payment reference, a successful provider status, a non-empty provider transaction ID, a safe integer amount in minor units matching the expected amount, and a matching three-letter currency.
- Returns explicit rejection reasons without throwing or exposing secrets.
- Unit tests cover valid transactions, reference substitution, pending status, missing transaction ID, amount mismatch/unsafe values, currency mismatch/normalization, and invalid expected payment data.

## Integration contract

The caller must first load the payment attempt and invoice from trusted server-side storage under an organization resolved from verified LUCIA Core authorization. It must then fetch transaction details directly from the configured provider using server-only credentials. Pass the provider's normalized response and the persisted expected reference, amount, and currency to this function.

A browser return URL, client-supplied organization, invoice amount, webhook payload, or provider signature alone is not a substitute for a direct provider verification request. On success, the caller must still atomically record the unique provider transaction ID and payment state, update the invoice without overpayment, and apply any entitlement exactly once. Database conflicts must be handled as possible duplicate/replay events, not retried as new fulfillment.

## Explicitly not included

- No public checkout or webhook route is enabled.
- No provider API calls or secrets are added.
- No invoice/payment status is changed by this utility.
- No entitlement is granted.
- No production database migration, deployment, or School OS change.
- The utility does not authenticate webhook signatures, establish tenant authorization, or provide transaction atomicity by itself.

## Remaining release gates

- Wire this gate into provider-specific server-to-server verification adapters.
- Add atomic database processing and duplicate/out-of-order webhook integration tests.
- Verify LUCIA Core authorization and tenant-scoped invoice lookup at the service boundary.
- Exercise Paystack and Flutterwave test-mode transactions in staging before enabling customer billing.
