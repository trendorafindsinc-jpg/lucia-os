# LUCIA OS — 30-Phase Implementation Roadmap

**Status:** Approved roadmap structure; phase completion must be established from repository evidence.  
**Canonical product blueprint:** [Unified Platform Blueprint](unified-platform-blueprint.md)  
**Website-engine detail:** [Website Engine Blueprint](website-engine-blueprint.md)  
**Repository:** `trendorafindsinc-jpg/lucia-os`

## How Codex must use this roadmap

This is the single source of truth for implementation order. Read it and the [Unified Platform Blueprint](unified-platform-blueprint.md) before each task, then read the existing phase-specific specification. Existing `docs/phase-N-*.md` documents retain their current numbering and remain detailed specifications. Do not renumber or silently repurpose them.

**No completion is implied by documentation.** Audit the code and test evidence. Work on one phase at a time, record evidence, and update status only when the relevant acceptance criteria are verified.

### Status vocabulary
- `NOT STARTED` — implementation evidence has not been reviewed.
- `IN PROGRESS` — work started; acceptance criteria remain.
- `BLOCKED` — a named dependency or decision prevents safe progress.
- `READY FOR VERIFICATION` — implementation is present; required checks remain.
- `VERIFIED` — acceptance evidence is recorded.
- `ACCEPTED` — verification has been reviewed and the phase explicitly accepted.

**Initial status:** all 30 phases require an evidence-based audit. This document does not assert that any phase is complete.

## Phase map

| Phase | Focus | Main outcome | Primary acceptance gate |
| --- | --- | --- | --- |
| 01 | Repository and product audit | Evidence-backed baseline and gap map | Current code, tests, risks and regression fixtures documented |
| 02 | Database foundation and tenant model | Durable organisation-scoped records | Migrations/rollback and cross-tenant tests pass |
| 03 | LUCIA ID authentication | Verified Core authentication contract | Callback/session/error paths work; Core remains authentication-only |
| 04 | Organisation workspaces | Organisation context and membership | Multiple organisations remain isolated |
| 05 | Roles, permissions and audit | Scoped access control | Server-side allow/deny and audit tests pass |
| 06 | Template design system | Reusable design tokens and component rules | Accessibility, responsive and compatibility checks |
| 07 | Template catalogue / Loom Library | Distinct website compositions | Actual-composition previews; tenant edits cannot mutate shared designs |
| 08 | Guided onboarding and AI creation | Real creation journey and LoomifiAI handoff | Real action-to-task-to-saved-draft flow; AI remains optional |
| 09 | Visual editor / Layer Studio | Connected editing experience | Changes persist and appear in the same renderer/preview |
| 10 | Pages, navigation and sections | Multi-page website structure | Route and section changes round-trip through persistence |
| 11 | Blog, media and content | Durable tenant-safe content/assets | Asset access and content rendering are authorised and safe |
| 12 | SEO and social sharing | Metadata and sharing controls | Correct output, validation and no cross-tenant metadata leakage |
| 13 | Drafts, preview and versions | Recoverable edit history | Preview does not publish; failures preserve last good version |
| 14 | Publishing and domains | Reliable live delivery | Domain ownership, DNS/TLS, publish and live rendering separately verified |
| 15 | Forms, submissions and notifications | Functional website interactions | Server validation, anti-abuse and tenant-scoped submissions |
| 16 | Analytics and conversions | Privacy-aware measurement | Correct attribution, tenant scope and truthful reporting |
| 17 | Plans, trials and billing rules | Explicit plan/usage policy | Plan rules approved; no UI-only premium gates |
| 18 | Payment provider abstraction | Replaceable payment integration | Contract, retry, timeout and idempotency tests |
| 19 | Security, recovery and resilience | Security and operational readiness | Threat-focused checks and recovery evidence |
| 20 | Tenant billing ledger | Auditable financial state and entitlement basis | Ledger consistency, idempotency and reconciliation |
| 21 | Provider verification foundation | Trusted provider events | Signature/source verification, replay resistance and audit |
| 22 | Paystack adapter | Paystack-specific integration | Adapter contract/sandbox checks and secret safety |
| 23 | Server-side payment verification | Authoritative payment outcome | Redirect/query alone cannot confirm payment |
| 24 | Atomic settlement | Consistent payment/subscription transitions | Duplicate events cannot double-settle; partial failures recover |
| 25 | Unified workspace and navigation | Connected product experience | End-to-end cross-workspace journeys, mobile access, no dead controls |
| 26 | Store for sellers and buyers | Commerce catalogue and order lifecycle | Seller/buyer permissions, verified checkout and durable order state |
| 27 | Category-specific Portals | Purpose-built specialist workflows | Each shipped category has explicit specs and tenant/resource isolation |
| 28 | Business Admin | Company day-to-day operations | Scoped delegation, revocation, operational views and audit |
| 29 | Loom community | Discussions, groups, directory, connections and trust/safety | Verification, representative authority, consent, blocking, moderation and privacy |
| 30 | Premium access, ecosystem integration and release readiness | Consistent access gates and final product acceptance | Permission + entitlement enforcement, safe downgrade, E2E regression and explicit sign-off |

## Phase execution contract

### Phase 01 — Repository and product audit
Read the README, architecture, engineering standards, security baseline, unified blueprint, this roadmap, and relevant phase specs. Inspect real routes, UI actions, APIs, schema, migrations, tests, deployment assumptions, and known live-site regression fixtures. Produce an evidence-backed gap map. Do not claim a feature is complete based on docs alone.

### Phase 02 — Database foundation and tenant model
Read `docs/phase-2-database-foundation.md`. Reconcile the actual schema, organisation ownership, constraints, migrations and rollback. Do not reset production data. Test tenant-scoped reads/writes and invalid references.

### Phase 03 — LUCIA ID authentication
Read `docs/phase-3-lucia-id-auth.md` and `docs/core-auth-only-boundary.md`. Verify sign-in, callback, session/token checks, safe return paths and failure handling. Core authenticates only; LUCIA OS checks local membership and permissions.

### Phase 04 — Organisation workspaces
Read `docs/phase-4-organization-workspaces.md`. Verify organisation switching, membership, ownership and multi-organisation isolation.

### Phase 05 — Roles, permissions and audit
Read `docs/phase-5-roles-permissions-audit.md`. Verify server-side resource/action permissions, revocation and audit trails. Client checks are not sufficient.

### Phase 06 — Template design system
Read `docs/phase-6-template-design-system.md` and `docs/website-engine-blueprint.md`. Verify supported tokens/components, responsive/accessibility standards, schema compatibility and safe migrations.

### Phase 07 — Template catalogue / Loom Library
Read `docs/phase-7-template-catalogue.md`. Designs must differ in composition, not just colour. Previews must reflect actual supported designs. Customer edits cannot mutate shared designs or another tenant.

### Phase 08 — Guided onboarding and AI creation
Read `docs/phase-8-guided-onboarding.md` and the AI flow in `docs/website-engine-blueprint.md`. The create/proposal action must really trigger a durable task, validate output, save a real editable draft and hand off to Layer Studio. No fake progress. AI failure must not block manual/template creation.

### Phase 09 — Visual editor / Layer Studio
Read `docs/phase-9-visual-editor.md`. Every visible editor control must affect the actual draft, persist correctly, and appear in the shared renderer/preview. Test refresh, unsaved changes and failure states.

### Phase 10 — Pages, navigation and sections
Read `docs/phase-10-pages-navigation-sections.md`. Test page/route/section changes, stable IDs, navigation, responsive output and persistence.

### Phase 11 — Blog, media and content
Read `docs/phase-11-blog-media.md`. Verify tenant-scoped uploads/assets, content persistence, safe rendering, accessible alternative text and permission checks.

### Phase 12 — SEO and social sharing
Read `docs/phase-12-seo-social-sharing.md`. Verify metadata validation, canonical/share output and correct page-specific values without leaking private draft or tenant data.

### Phase 13 — Drafts, preview and versions
Read `docs/phase-13-drafts-preview-versions.md`. Preview the requested draft revision without changing live delivery. Failed saves/promotions preserve the last known-good live site and provide a recoverable error.

### Phase 14 — Publishing and domains
Read `docs/phase-14-publishing-domains.md`, root `PHASE_14_PUBLISHING_DOMAINS.md`, and `docs/website-domains.md`. Treat domain registration, ownership/DNS verification, TLS, publication and actual live rendering as distinct states. Do not alter DNS or production without explicit approval.

### Phase 15 — Forms, submissions and notifications
Read `docs/phase-15-forms-submissions-notifications.md`. Verify server-side validation, anti-abuse, tenant-scoped submission storage, notification delivery/failure and access control.

### Phase 16 — Analytics and conversions
Read `docs/phase-16-analytics-conversions.md`. Verify truthful events, attribution, tenant boundaries, privacy/consent and failure handling. Never fabricate metrics.

### Phase 17 — Plans, trials and billing rules
Read `docs/phase-17-plans-trials-billing.md`. Define explicit approved plan, trial, usage, grace and downgrade rules. Do not invent pricing or a final free/premium matrix.

### Phase 18 — Payment provider abstraction
Read `docs/phase-18-payment-provider-integration.md`. Keep provider integration behind a stable adapter; test timeouts, retries, idempotency and provider outage.

### Phase 19 — Security, recovery and resilience
Read `docs/phase-19-security-recovery-tests.md` and `docs/security-baseline.md`. Verify authorisation, rate limiting, backups/recovery, incident handling and safe degradation.

### Phase 20 — Tenant billing ledger
Read `docs/phase-20-tenant-billing-ledger.md`. Verify tenant-owned financial records, consistent ledger transitions, idempotency and reconciliation. Premium checks must be enforced on the server.

### Phase 21 — Provider verification foundation
Read `docs/phase-21-provider-verification.md`. Authenticate provider events, prevent replay, record audit evidence and reconcile mismatched states.

### Phase 22 — Paystack adapter
Read `docs/phase-22-paystack-adapter.md`. Verify the adapter in approved test/sandbox conditions, protect secrets, and keep provider-specific behaviour out of general product logic.

### Phase 23 — Server-side payment verification
Read `docs/phase-23-paystack-server-verification.md`. The server verifies payment with trusted provider evidence. Browser redirects or query parameters cannot activate paid access or mark an order paid.

### Phase 24 — Atomic settlement
Read `docs/phase-24-atomic-paystack-settlement.md`. Ensure duplicate/replayed events cannot double-settle; partial failures are recoverable and auditable.

### Phase 25 — Unified workspace and navigation
Connect Overview, Websites, AI Studio, Store, Portals, Business Admin, Loom and Plan & Billing through consistent navigation, organisation context, shared statuses and task handoffs. Layouts, Domains and Publishing may be contextual under Websites when clearer. Verify responsive/mobile access and real click-to-result behaviour.

### Phase 26 — Store for sellers and buyers
Build explicit slices: seller/store setup and catalogue; buyer discovery; cart/checkout; order/payment state; seller order operations; and any approved fulfilment capabilities. Storefront presentation may integrate with Websites, but visual edits must never mutate orders/payment records. Verify seller/buyer permission boundaries, price/stock validation, server-verified payment, idempotency and recovery. Do not claim unsupported shipping, tax or refund capabilities.

### Phase 27 — Category-specific Portals
Before each category, write/approve its requirements, data model, roles, protected workflows and acceptance tests. Build shared components only when they preserve category-specific rules. Verify resource/tenant isolation across APIs, public routes, preview, search and caches. Do not treat every portal as a generic skin.

### Phase 28 — Business Admin
Build the company day-to-day operations workspace: company overview, staff/invitations/roles, scoped delegation, organisation settings, operational entry points for Websites/Store/Portals, relevant reporting/audit, and plan status. Only add operational modules with defined scope. Verify owner/admin/staff boundaries and prompt revocation. Staff departure must not delete company-owned assets or records.

### Phase 29 — Loom community
Implement Loom as a first-class main-navigation destination—not a Business Admin subpage—with discussions, groups, public business directory, connections/messaging, collaboration spaces and trust/safety in the approved scope. Keep business verification separate from representative authority. Verify public/private visibility, consent, blocking (including shared-context bypass attempts), reporting, moderation, appeals, evidence access/retention and exports. Paid status cannot buy a verified badge. Do not implement broad cross-product data sharing without an explicitly approved policy.

### Phase 30 — Premium access, ecosystem integration and release readiness
Obtain explicit approval for the final plan/entitlement matrix, metering, grace and downgrade rules before enforcing commercial assumptions. Apply backend checks across Websites, Store, Portals, Business Admin, Loom-related paid capabilities and optional AI. Verify permission and entitlement independently. Run cross-product end-to-end/regression, security, privacy, accessibility, performance, backup/recovery and payment reconciliation checks. Downgrade must not accidentally destroy data, valid verification, orders or an existing published site. Release readiness requires recorded evidence and explicit sign-off.

## Cross-phase non-negotiable rules

- No fake/inert controls, simulated progress, fabricated metrics, or premature success messages.
- No phase is accepted without evidence.
- No customer-facing raw JSON editor or execution of arbitrary AI-generated code.
- AI is optional and provider-independent.
- LUCIA Core is global authentication only.
- Server-side authorisation and tenant isolation cover APIs, rendering, assets, background jobs, webhooks and exports.
- Roles, paid entitlements and Loom verification status are distinct.
- Save/publish failure preserves the previous known-good live website.
- Payment state is server-verified and idempotent.
- No destructive migrations, production resets, DNS changes or deployments without explicit approval.
- Do not merge to `main` until required verification is complete and the user explicitly authorises the merge.

## Codex end-of-session checkpoint

At the end of each session, update the relevant phase tracker or a linked progress log with:

- **Current phase and status**
- **What was inspected**
- **Files/behaviour changed**
- **Tests/checks run and actual results**
- **Acceptance criteria met, with evidence**
- **Known failures/open decisions**
- **Data/security/migration risks**
- **Next smallest safe action**
- **Explicitly not done**
- **Merge/deploy status and approval**

Never claim an action, test, deployment or merge occurred unless evidence confirms it.
