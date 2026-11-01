# Phase 19 — Security and recovery verification

## Automated regression coverage
- Checkout input validation rejects malformed email, non-positive amount, unexpected fields, and non-HTTPS callback URLs before any provider request.
- Provider checkout responses must preserve the requested payment reference.
- Checkout URLs reject HTTP, untrusted domains, and hostname lookalikes.
- Webhook handling rejects missing/invalid signatures and signatures computed over a different raw body.
- Existing tests continue to cover provider configuration, amount conversion, malformed JSON, unsupported events, and successful signature verification.

## Safety boundary
These tests verify the payment-provider adapter only. They do not prove tenant isolation or production billing safety because this repository still has no public checkout/webhook route, durable invoice/payment ledger, Core-authenticated billing boundary, or end-to-end provider transaction verification. Do not enable customer charges based on adapter tests alone.

## Required before production billing
- Resolve tenant, product, user, roles, and entitlements from a verified LUCIA Core session; never trust tenant IDs or price amounts supplied by the browser.
- Persist invoice/payment state durably with unique provider references and idempotent webhook processing.
- Verify transactions directly with the provider and match reference, amount, currency, product, and tenant before granting an entitlement.
- Add integration tests for duplicate/replayed webhooks, out-of-order events, provider timeouts, retries, transaction reconciliation, and cross-tenant access denial.
- Define retention/deletion, audit logging, rate limits, monitoring, receipt delivery, refund/cancellation handling, and recovery runbooks.
- Run staging end-to-end tests with provider test credentials before considering production launch.

No production deployment, database migration, payment credential changes, or School OS changes are part of this phase.
