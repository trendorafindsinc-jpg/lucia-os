# LUCIA OS progress checkpoint — Phases 13–20

**Checkpoint date:** 2026-10-25  
**Working branch:** `phase-14-20-commerce-and-acceptance`  
**Merge status:** Not merged to `main`.  
**Production safety:** No production database changes, DNS changes, provider credential changes, payments, or entitlement activations were performed.

## Phase 13 — Drafts, preview and versions

**Status: IN PROGRESS / acceptance not proven.**

- PR #78: https://github.com/trendorafindsinc-jpg/lucia-os/pull/78
- Changes add transaction-local membership and permission rechecks and serialize version creation/retention per website.
- GitHub Actions Quality checks for the current hardening head completed successfully for lint, typecheck, migration consistency, unit tests, and production build.
- Vercel reported a build-rate-limit failure, an infrastructure/account limit rather than a code-pass signal; no Vercel preview is considered verified.
- Full snapshot restore, persisted draft reload, browser E2E, and tenant isolation with a non-owner `LOGIN NOBYPASSRLS` role remain unproven.
- Do not mark Phase 13 accepted yet.

## Phase 14 — Publishing and domains

**Status: IN PROGRESS / staging and browser acceptance outstanding.**

- Existing documentation describes draft save, publish permission checks, published snapshots, wildcard subdomain routing, and slug uniqueness.
- Specification now distinguishes the free LUCIA subdomain from a one-time purchased custom-domain capability and separate third-party domain renewals.
- Must still verify actual staged migration state, permission rechecks inside transactions, DNS ownership proof, TLS readiness, public-only published reads, and live hostname rendering. No DNS or production changes were made.

## Phase 15 — Forms and notifications

**Status: PROTOTYPE / blocked from collecting real customer data.**

- Existing workspace uses browser-session state; submissions and settings do not survive refresh.
- No public endpoint, durable tenant-scoped submission storage, anti-abuse/rate limiting, or real email delivery is accepted as complete.
- Next: design tenant/website-bound persistence and permission-safe public ingestion, then implement tests for abuse, privacy, retention, and notification failure. Do not collect real data until these gates pass.

## Phase 16 — Analytics and conversions

**Status: PROTOTYPE / no real analytics enabled.**

- Existing workspace uses opt-in demo events in client state and does not claim real traffic.
- No live event ingestion, durable analytics, or real visitor metrics are enabled.
- Next: specify consent/retention, server-side identity and tenant binding, event deduplication, bot/abuse controls, and accurate reporting windows before implementation.

## Phase 17 — Commercial rules

**Status: PRODUCT RULES DOCUMENTED / purchase catalogue not implemented.**

- Removed legacy subscription/trial assumptions from the Phase 17 specification.
- Approved model: free website-engine baseline; optional LUCIA software capabilities and exact major versions may be one-time purchases; durable entitlement to the purchased version; new versions separately purchased unless bundled.
- Prices remain owner-controlled. No live prices or discount codes are configured. No UI preview grants entitlement.

## Phase 18 — Payment adapters

**Status: ADAPTER FOUNDATION / not safe for customer charges.**

- Existing Paystack/Flutterwave adapter documentation covers signature validation, trusted checkout hosts, amount conversion, and fail-closed credential handling.
- Updated specification to prohibit browser-controlled prices and align provider integration with one-time product/version purchases.
- Missing before launch: verified order creation, provider-side transaction verification, durable order/invoice binding, idempotency, reconciliation, and staging E2E.

## Phase 19 — Security and recovery

**Status: ADAPTER TESTS ONLY / operational readiness not proven.**

- Existing tests cover several provider input/signature failures.
- They do not prove cross-tenant isolation, backups/restores, end-to-end payment recovery, incident procedures, or the safety of production billing.
- Next: run threat-focused integration tests with a non-owner `NOBYPASSRLS` login, replay/out-of-order events, injected failures, and documented recovery procedures.

## Phase 20 — Tenant billing ledger

**Status: STORAGE FOUNDATION + RLS HARDENING / not commercially accepted.**

- Existing migration/schema defines tenant-scoped invoices, payment attempts, and webhook receipts with unique references, idempotency keys, composite tenant foreign keys, and RLS policies.
- Added migration `0012_force_rls_billing_ledger.sql` to apply `FORCE ROW LEVEL SECURITY` to the three ledger tables.
- This does not protect against superusers or `BYPASSRLS` roles. The application must use a non-owner `NOBYPASSRLS` login and tests must prove same-tenant success and cross-tenant denial.
- The current tables are not a complete immutable accounting journal or a product-order/entitlement system. No payment/entitlement route was enabled and no production migration was applied.
- CI must validate the new migration journal entry; staging migration and RLS integration tests remain required.

## Cross-phase release gates

- Keep Store, Portals, and Business Admin unavailable in v1; Loom remains in v1 scope.
- Do not enable checkout, discount redemption, public forms collection, or real analytics until the respective security, privacy, tenant-isolation, and E2E gates pass.
- Do not merge to `main` until required checks pass, all blocking acceptance evidence is recorded, and the user explicitly authorises merge.
- Keep website checkpoint history separate from commercial product versions and purchase entitlements.
