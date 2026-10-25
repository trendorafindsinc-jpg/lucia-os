# LUCIA OS progress checkpoint — Phases 13–25

**Checkpoint date:** 2026-10-25  
**Working branch:** `phase-21-25-workspace-acceptance`  
**Merge status:** Not merged to `main`.  
**Safety:** No production database changes, DNS changes, provider credential changes, customer payments, or entitlement activations were performed.

## Status summary

| Phase | Status | Evidence and remaining gates |
|---|---|---|
| 13 — Drafts, preview and versions | Code checks pass; beta acceptance open | Exact-head GitHub Actions passed lint, typecheck, migration consistency, unit tests, and production build on commit `67cc99355057948ed625449c0d13530645be38e1`. Browser restore/reload, permission revocation, concurrent retention, DB failure injection, and tenant isolation with a non-owner `LOGIN NOBYPASSRLS` role remain unproven. PR #78 is ready for review, not merged. |
| 14 — Publishing and domains | In progress | Authorization and publishing code/documentation reviewed. Staging migration state, DNS ownership, TLS, public-only reads, cross-tenant denial, and live hostname rendering need evidence. |
| 15 — Forms and notifications | Prototype only | Browser-session state is not durable tenant storage. Real submissions and email delivery remain disabled pending persistence, abuse controls, privacy/retention tests, and delivery failure handling. |
| 16 — Analytics and conversions | Prototype only | Client-side demo events are not real traffic analytics. Durable ingestion, consent, deduplication, tenant binding, bot controls, and reporting accuracy remain open. |
| 17 — Commercial rules | Rules documented | Free baseline and one-time product/version purchases with durable entitlements are documented. Catalogue, prices, discount codes, order/entitlement workflow remain unimplemented. |
| 18 — Payment provider abstraction | Foundation only | Provider abstraction and failure-handling contracts exist. Staging integration and operational readiness are not proven. |
| 19 — Security, recovery and resilience | Unit tests only | Adapter input/signature tests are not evidence of tenant isolation, backup restoration, payment recovery, or incident readiness. |
| 20 — Tenant billing ledger | Storage foundation only | Ledger tables and migration `0012_force_rls_billing_ledger` exist on the working branch. CI checks migration consistency; staging migration and non-owner RLS integration tests remain open. No production migration was applied. |
| 21 — Provider verification foundation | Utility implemented | Pure transaction-verification gate and unit tests cover reference, status, transaction ID, amount, currency, and invalid expected data. Caller authorization and atomic persistence remain caller responsibilities. |
| 22 — Paystack adapter | Adapter implemented | Raw-body HMAC-SHA512 validation and transaction normalization are covered by unit tests. A valid signature alone cannot settle a payment. No route or secret was added. |
| 23 — Server-side payment verification | Helper implemented | Server-only provider verification uses no-store and timeout handling and checks transaction fields. It does not mutate the ledger or grant entitlements. Sandbox end-to-end verification remains open. |
| 24 — Atomic settlement | Persistence primitive implemented | Locks payment attempt/invoice and updates them transactionally; same-transaction retry is idempotent in mocked unit tests. Real PostgreSQL locking, RLS, concurrent callbacks, rollback, Core authorization and entitlement linking remain unproven. |
| 25 — Unified workspace and navigation | Code/documentation slice completed; browser acceptance open | Overview and Websites navigation now expose existing AI Studio, Loom and Plan & Billing destinations; future Store, Portals and Business Admin are non-clickable and marked unavailable. Responsive CSS is present. Desktop/mobile browser verification and deployed-build confirmation remain open. |

## Product boundaries

- Free baseline remains the website engine.
- Optional LUCIA software capabilities and exact major versions may be one-time purchases; a purchased version has durable entitlement under its disclosed licence.
- Third-party registrar renewals and other external recurring fees are separate from LUCIA software ownership.
- Store, Portals, and Business Admin remain unavailable in v1. Loom remains in v1.
- Do not enable checkout, discount redemption, public forms collection, or real analytics until their security, privacy, tenant-isolation, and end-to-end acceptance gates pass.
- Do not treat website checkpoint history as commercial product-version ownership.
- Do not merge to `main` until the required checks and acceptance evidence are reviewed and the user authorizes merge.

## Deployment and runtime limits

Vercel reported its account's daily deployment rate limit on the integration PR. This is not evidence that the application build failed or passed. GitHub Actions passing checks provide code-level evidence only; they do not replace preview, browser, staging database, or provider sandbox tests.
