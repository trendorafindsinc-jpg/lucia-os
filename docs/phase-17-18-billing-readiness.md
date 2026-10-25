# Phases 17–18 — billing and payment readiness

## Implemented / confirmed

- Billing invoice reads recheck the current user's active membership and `billing.read` permission inside the same transaction as the invoice query.
- The UI is explicitly one-plan oriented with weekly/monthly/annual cadence options and a 14-day trial preview.
- The trial preview is local UI state only. It does not create a subscription, alter access, or grant an entitlement.
- Existing payment-attempt and webhook-event schemas provide a foundation for idempotent provider reconciliation, but no live checkout or webhook endpoint is enabled in this track.
- The billing UI now states that LUCIA Core must remain authoritative for active product entitlement and trial state.

## Explicitly not enabled

- No local subscription state is treated as entitlement truth.
- No prices are live; price selection remains disabled until the authorized catalog is configured.
- No Paystack or Flutterwave checkout is initiated.
- No payment is marked successful from a browser redirect or unverified webhook.
- No discount code can be redeemed or change an invoice in this prototype.

## Required integration contract

Before activating trials or payments, document and test the exact LUCIA Core Consumer Contract for product entitlement, trial start/end, revocation, and authorization. Then add server-side provider initialization, signed webhook verification, idempotency, reconciliation, refunds/cancellation, and audit events. The provider must never directly grant access; access follows verified Core entitlement.

## Verification still required

- Exact-head CI and billing workspace acceptance.
- Verify billing read permission revocation and cross-tenant invoice denial using a non-owner `LOGIN NOBYPASSRLS` role.
- Test webhook signature failures, duplicate event IDs, amount/currency mismatch, provider transaction uniqueness, and failed-payment rollback before enabling any payment path.
- No production payment, entitlement, or database changes are made by this phase.
