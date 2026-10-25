# LUCIA OS — 30-Phase Implementation Roadmap

**Status:** Approved roadmap structure; phase completion must be established from repository evidence.  
**Canonical product blueprint:** [Unified Platform Blueprint](unified-platform-blueprint.md)  
**Website-engine detail:** [Website Engine Blueprint](website-engine-blueprint.md)  
**Repository:** `trendorafindsinc-jpg/lucia-os`

## How Codex must use this roadmap

This file is the single source of truth for implementation order and phase status. Read it and the [Unified Platform Blueprint](unified-platform-blueprint.md) before each task. Read the linked existing phase specifications before touching their area.

**Do not assume the current phase is complete because its document exists.** Audit the code, tests, recent changes, and deployed state only when explicitly authorised. Update the phase tracker with evidence. Work on one phase at a time unless a dependency requires a narrowly scoped preparatory change.

### Status vocabulary
- `NOT STARTED` — no implementation evidence reviewed.
- `IN PROGRESS` — work has started but acceptance criteria are not all met.
- `BLOCKED` — a named dependency or decision prevents safe progress.
- `READY FOR VERIFICATION` — implementation is present; required verification remains.
- `VERIFIED` — acceptance evidence is recorded.
- `ACCEPTED` — verification reviewed and phase explicitly accepted.

Initial status for this roadmap: **all phases require an evidence-based audit; no completion is implied by this document.**

## Phase map

| Phase | Focus | Main outcome | Primary acceptance gate |
| --- | --- | --- | --- |
| 01 | Repository and product audit | Verified baseline, gap list, regression fixtures | Existing behaviour and live-site risks documented; no destructive change |
| 02 | Data foundation and tenant model | Durable organisation-scoped records and migrations | Constraints, migration/rollback and tenant tests |
| 03 | LUCIA ID authentication | Core authentication contract | Sign-in/callback verified; Core remains authentication-only |
| 04 | Organisation workspaces | Organisation switching and workspace context | Multiple organisations remain isolated |
| 05 | Roles, permissions and audit | Server-enforced scoped access | Positive and negative permission tests |
| 06 | Unified application shell | Main navigation and shared UX | Mobile/desktop navigation, active context and real actions work |
| 07 | Blueprint and design system | Versioned website contract and shared visual tokens | Schema validation, compatibility and design-token tests |
| 08 | Loom Library / Layouts | Distinct designs and faithful previews | Previews represent actual compositions; tenant edits cannot mutate base |
| 09 | AI Studio / LoomifiAI | Optional AI proposal workflow | Real click-to-task-to-saved-draft flow; provider failure is safe |
| 10 | Layer Studio editor | Connected visual editor | Edits round-trip through persistence and preview |
| 11 | Pages, navigation and sections | Website structure tools | Routes, section order and links render correctly |
| 12 | Blog, media and content | Tenant-safe content and assets | Upload/access controls, content persistence and safe rendering |
| 13 | Drafts, preview and versions | Recoverable editing history | Preview never changes live; failed save preserves prior state |
| 14 | Publishing and domains | Safe releases and hostname delivery | Ownership/DNS/TLS/publish/live rendering verified separately |
| 15 | Forms, submissions and notifications | Working website interactions | Server validation, spam controls and tenant-scoped submissions |
| 16 | Analytics and conversions | Useful, privacy-aware measurement | Correct tenant attribution and consent/privacy behaviour |
| 17 | Plans, trials and billing rules | Explicit plan/usage model | Entitlement policy documented; no UI-only premium gating |
| 18 | Payment provider abstraction | Provider-neutral billing integration | Provider contract and failure/retry tests |
| 19 | Security, recovery and resilience | Security baseline and recovery runbooks | Threat-focused tests, backup/restore evidence and fail-safe behaviour |
| 20 | Tenant billing ledger and entitlements | Auditable financial state and access checks | Idempotent ledger, reconciliation, permission + entitlement checks |
| 21 | Provider verification foundation | Verified provider events and webhook discipline | Signature/identity verification, replay protection and audit |
| 22 | Paystack adapter | Provider-specific Paystack integration | Contract tests, sandbox/test-mode evidence and secret safety |
| 23 | Server-side payment verification | Authoritative payment status | Browser redirect alone cannot mark payment successful |
| 24 | Atomic settlement and reconciliation | Consistent order/billing transitions | Duplicate/replayed events cannot double-settle |
| 25 | Unified workspace cohesion | Connected cross-workspace navigation and context | End-to-end task flows, responsive usability, no dead controls |
| 26 | Store for sellers and buyers | Commerce catalogue and order workflows | Seller/buyer separation, safe checkout and persistent order state |
| 27 | Category-specific Portals | Approved specialist portal workflows | Category acceptance specs and resource/tenant isolation |
| 28 | Business Admin operations | Company day-to-day administration | Scoped delegation, revocation, operational views and audit |
| 29 | Loom community | Community, directory, groups, connections and moderation | Verification, authority, blocking, reports and privacy checks |
| 30 | Premium access, ecosystem integration and release readiness | Consistent entitlements and final product integration | E2E regression, downgrade safety, launch gates and evidence-backed sign-off |

## Phase-by-phase execution contract

### Phase 01 — Repository and product audit
**Read:** `README.md`, `docs/architecture.md`, `docs/engineering-standards.md`, `docs/security-baseline.md`, this roadmap, the unified blueprint, and all relevant existing phase specifications.  
**Do:** inspect the real code, routes, API handlers, schema, tests, UI actions, deployment assumptions, and known live-site regression fixtures. Map each requirement to code/tests or mark it missing/unknown.  
**Acceptance:** baseline report lists evidence, gaps, risks, tests, and phase dependencies. Do not label a feature complete based only on docs.

### Phase 02 — Data foundation and tenant model
**Read:** `docs/phase-2-database-foundation.md`, `docs/architecture.md`, `docs/security-baseline.md`.  
**Do:** reconcile the existing schema; use additive/versioned migrations and explicit organisation ownership.  
**Acceptance:** migration/rollback reviewed, constraints tested, cross-tenant reads/writes denied. No production reset.

### Phase 03 — LUCIA ID authentication
**Read:** `docs/phase-3-lucia-id-auth.md`, `docs/core-auth-only-boundary.md`.  
**Acceptance:** callback, token/session validation, origin/return path and failure paths are tested. Core remains global authentication only; local product access is checked locally.

### Phase 04 — Organisation workspaces
**Read:** `docs/phase-4-organization-workspaces.md`.  
**Acceptance:** an identity can belong to multiple organisations without data or selection leakage; server verifies every membership.

### Phase 05 — Roles, permissions and audit
**Read:** `docs/phase-5-roles-permissions-audit.md`, `docs/security-baseline.md`.  
**Acceptance:** operation/resource-scoped roles, server enforcement, revocation, and audit coverage. Do not use client-only checks.

### Phase 06 — Unified application shell
**Do:** implement or refine the coherent shell and main navigation for Overview, Websites, AI Studio, Store, Portals, Business Admin, Loom, and Plan & Billing. Links to supporting tools may be contextual where clearer. Preserve responsive/mobile access and organisation context.  
**Acceptance:** every visible control has a real destination/action, active states are correct, and navigation does not bypass authorization.

### Phase 07 — Blueprint and design system
**Read:** `docs/phase-6-template-design-system.md`, `docs/website-engine-blueprint.md`.  
**Acceptance:** versioned schema, supported-component allowlist, safe migrations, tokens, validation and compatibility tests.

### Phase 08 — Loom Library / Layouts
**Read:** `docs/phase-7-template-catalogue.md`, relevant Loom Blueprint documentation.  
**Acceptance:** genuinely distinct designs and previews based on the actual renderer/composition; customer customisations are tenant-owned.

### Phase 09 — AI Studio / LoomifiAI
**Read:** `docs/phase-8-guided-onboarding.md`, `docs/website-engine-blueprint.md`.  
**Acceptance:** a real user action triggers a durable generation job; validated output is saved as an editable draft and previewed. Provider outage, malformed output, retries and refresh are safe. AI remains optional.

### Phase 10 — Layer Studio editor
**Read:** `docs/phase-9-visual-editor.md`.  
**Acceptance:** controls change the actual draft, saved state persists, preview reflects that revision, and unsaved changes are handled clearly.

### Phase 11 — Pages, navigation and sections
**Read:** `docs/phase-10-pages-navigation-sections.md`.  
**Acceptance:** page/section changes persist and render correctly; stable IDs, route validation and responsive behaviour are covered.

### Phase 12 — Blog, media and content
**Read:** `docs/phase-11-blog-media.md`.  
**Acceptance:** uploads and content are tenant-scoped, safe, durable, accessible and correctly represented in preview/live output.

### Phase 13 — Drafts, preview and versions
**Read:** `docs/phase-13-drafts-preview-versions.md`.  
**Acceptance:** immutable/recoverable revisions; preview uses the requested revision; save/publish failures preserve last known-good state.

### Phase 14 — Publishing and domains
**Read:** `docs/phase-14-publishing-domains.md`, root `PHASE_14_PUBLISHING_DOMAINS.md`, `docs/website-domains.md`.  
**Acceptance:** unique domain assignment, ownership/DNS verification, TLS, release, routing and live rendering are independently checked. No DNS/production changes without explicit approval.

### Phase 15 — Forms, submissions and notifications
**Read:** `docs/phase-15-forms-submissions-notifications.md`.  
**Acceptance:** end-to-end submissions, server validation, rate limits/spam protection, authorised access and notification failure handling.

### Phase 16 — Analytics and conversions
**Read:** `docs/phase-16-analytics-conversions.md`.  
**Acceptance:** accurate event attribution, tenant isolation, privacy controls, and no fabricated analytics.

### Phase 17 — Plans, trials and billing rules
**Read:** `docs/phase-17-plans-trials-billing.md`.  
**Acceptance:** plan/usage rules and downgrade/grace policy are explicit. Pricing and plan matrix require product approval; do not infer them.

### Phase 18 — Payment provider abstraction
**Read:** `docs/phase-18-payment-provider-integration.md`.  
**Acceptance:** provider-neutral interface, safe timeouts/retries, idempotency and provider-independent application logic.

### Phase 19 — Security, recovery and resilience
**Read:** `docs/phase-19-security-recovery-tests.md`, `docs/security-baseline.md`.  
**Acceptance:** backup/restore drill or verified evidence, incident/runbook coverage, access-control testing and fail-safe operation.

### Phase 20 — Tenant billing ledger and entitlements
**Read:** `docs/phase-20-tenant-billing-ledger.md`.  
**Acceptance:** auditable tenant ledger and server-side entitlement checks. Permission and entitlement are independent requirements; downgrade must not silently destroy data.

### Phase 21 — Provider verification foundation
**Read:** `docs/phase-21-provider-verification.md`.  
**Acceptance:** verified source of truth for provider events, authenticated webhook processing, replay resistance and reconciliation.

### Phase 22 — Paystack adapter
**Read:** `docs/phase-22-paystack-adapter.md`.  
**Acceptance:** contract/sandbox tests, secret handling, safe error states and provider-independent domain logic.

### Phase 23 — Server-side payment verification
**Read:** `docs/phase-23-paystack-server-verification.md`.  
**Acceptance:** server verification is authoritative; redirect/query parameters cannot independently activate subscriptions, entitlements, or orders.

### Phase 24 — Atomic settlement and reconciliation
**Read:** `docs/phase-24-atomic-paystack-settlement.md`.  
**Acceptance:** replayed/duplicated events cannot double-settle; partial failure can be reconciled without losing audit evidence.

### Phase 25 — Unified workspace cohesion
**Do:** connect Websites, AI Studio, Store, Portals, Business Admin, Loom and Plan & Billing through shared navigation, organisation context, task handoffs, status patterns and permissions.  
**Acceptance:** real browser journeys flow between destinations without dead ends, duplicate sources of truth, context loss or permission bypass.

### Phase 26 — Store for sellers and buyers
**Do:** implement Store workflows in explicit slices: seller setup/catalogue, buyer discovery, cart/checkout, order state, payment verification, and seller order operations. Integrate storefront presentation with Websites without coupling visual edits to transaction data.  
**Acceptance:** seller/buyer authorization, order persistence, inventory/price validation, idempotent checkout, verified payment, and failure recovery are tested. Do not claim tax/shipping/refund support unless implemented and verified.

### Phase 27 — Category-specific Portals
**Do:** first approve a requirements/role/data/workflow spec for each initial category. Build the shared portal shell only where it does not flatten category-specific requirements.  
**Acceptance:** each shipped category has explicit workflows and role/resource tests; private content cannot leak through APIs, public routes, preview, search or cache.

### Phase 28 — Business Admin operations
**Do:** build company day-to-day operations: company overview, people/roles/delegation, business settings, operational links/views for Websites/Store/Portals, reports/audit and plan status. Only include operational modules with approved scope.  
**Acceptance:** owner/admin/staff scopes are enforced; revoke takes effect promptly; organisation-owned assets and operational records survive staff departure; sensitive changes are auditable.

### Phase 29 — Loom community
**Do:** build Loom as a first-class main-navigation destination with discussions, groups, public business directory, connections/messaging, collaboration spaces and trust/safety in the approved release scope. Implement evidence-based business verification and representative authority as separate checks.  
**Acceptance:** public/private visibility, connection consent, block enforcement, reporting, moderation, appeals, evidence access and retention are tested. Paid status cannot purchase verification. Cross-product links cannot grant private product access. Do not implement broad cross-product data sharing without an explicit approved policy.

### Phase 30 — Premium access, ecosystem integration and release readiness
**Do:** finalise and obtain approval for the plan/entitlement matrix, usage limits, grace/downgrade rules and each premium capability. Apply backend enforcement consistently across Websites, Store, Portals, Business Admin, Loom-related paid capabilities, and optional AI. Run cross-product end-to-end and regression suites.  
**Acceptance:** permission + entitlement checks work server-side; plan expiry does not accidentally destroy data or valid verification; navigation reflects actual access; payment and subscription state reconcile; security/privacy/accessibility/performance and backup/recovery gates have evidence; launch decision is explicit. Do not declare commercially ready until all critical gates pass.

## Cross-phase mandatory rules

- No fake/inert controls or simulated success.
- No phase is accepted without evidence.
- No raw JSON editor for customers.
- AI is optional and provider-independent.
- LUCIA Core is authentication-only.
- Server-side tenant isolation and authorization are mandatory.
- Paid plan, role, and verification status are distinct concepts.
- A published website/order/business record must not be lost due to an unrelated UI or template change.
- No destructive migrations, production resets, DNS changes, or deployments without explicit approval.
- Do not merge to `main` until the phase's required verification is complete and the user has authorised the merge.
- Prefer a small, reviewable change over broad rewrites.

## Codex checkpoint template

At the end of every work session, update the relevant phase entry or a linked progress log with:

- **Current phase / status:**
- **What was inspected:**
- **What changed (files and behaviour):**
- **Tests/checks run and actual results:**
- **Acceptance criteria satisfied (with evidence):**
- **Known failures / unresolved questions:**
- **Data/security/migration risks:**
- **Next smallest safe action:**
- **Explicitly not done:**
- **Merge/deploy status and approval:**

Never claim an action, test, deployment, or merge occurred unless the tool/result evidence confirms it.
