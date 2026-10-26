# LUCIA OS — 30-Phase Delivery Roadmap

**Status:** Required implementation sequence; all completion states must be based on evidence.  
**Canonical product requirements:** [LUCIA OS Product Vision and Contract](lucia-os-product-vision.md)  
**Focused website requirements:** [Website Engine Contract](website-engine-blueprint.md)

This roadmap replaces conflicting product sequencing and scope assumptions in the earlier roadmap. Existing phase-specific documents may contain useful technical details, but if they conflict with the canonical product vision, pause and reconcile them before implementation. Do not infer that code exists because a phase document describes it.

## Operating rules

- Start with Section 1 (signed-in workspace), not the signed-out welcome page.
- Audit the current code, tests, branches, and active product behaviour before each phase.
- Build one phase at a time; do not start future sections merely because they are documented.
- Preserve working customer sites, customer data, purchase records, and known-good live versions.
- Run relevant tests and record actual outcomes. A successful build alone is not acceptance.
- Do not merge to `main`, deploy, alter production data/DNS/secrets, or perform destructive migrations without the required explicit approval.
- At each checkpoint report: phase/status, inspected areas, changed files, checks and outcomes, acceptance evidence, open decisions/risks, next smallest safe action, and merge/deployment status.

### Status vocabulary

- `NOT STARTED` — no evidence-based implementation audit completed.
- `IN PROGRESS` — work underway; acceptance criteria remain.
- `BLOCKED` — named dependency/decision prevents safe progress.
- `READY FOR VERIFICATION` — implementation present; required checks remain.
- `VERIFIED` — acceptance evidence recorded.
- `ACCEPTED` — evidence reviewed and phase explicitly accepted.

**Initial status:** all phases require an evidence-based audit; this roadmap does not claim completion.

## Section 1 — Workspace foundation (Phases 1–10; begin here)

### Phase 1 — Repository, branch, and product audit
Inspect main, active branches/PRs, current workspace, existing design work, routes, data flows, tests, and the current docs. Identify the unwanted design direction and safe reusable foundations without merging it. Record a baseline and regression risks.

### Phase 2 — Workspace architecture and navigation contract
Define app-shell boundaries, responsive breakpoints, navigation state, icon registry, app-launch contract, organisation context, and route/access rules. Keep the signed-out welcome page out of scope for this first task.

### Phase 3 — Shared visual and interaction foundation
Create/verify a coherent LUCIA design system: typography, surfaces, spacing, focus, motion, loading/empty/error/disabled states, touch targets, and reduced-motion behaviour. Do not copy proprietary Apple UI or branding.

### Phase 4 — Mobile workspace
Implement an iOS-inspired, touch-first workspace with clear app icons, settings, navigation, safe-area handling, and accessible icon movement/reordering where practical. Drag-and-drop cannot be the only way to arrange or launch apps.

### Phase 5 — Desktop workspace
Implement an original macOS-inspired desktop workspace with clear app navigation/launcher, useful desktop information density, keyboard access, and coherent content/app conventions. Do not stretch the mobile UI across a desktop.

### Phase 6 — Tablet workspace
Implement a deliberate iPad-inspired responsive composition using tablet space and touch affordances. Verify portrait and landscape; avoid simply scaling mobile or squeezing desktop.

### Phase 7 — App icon and launcher registry
Define stable app identifiers, labels, icon assets, launch destinations, availability states, and capability/entitlement metadata. Initial first-class entries include Overview, Website Engine, Layouts, Loom, Store, installed applications, and Settings. No fake installed apps or dead icons.

### Phase 8 — Settings and workspace context
Connect profile/workspace preferences, security entry points, organisation context where applicable, and persisted layout/icon preferences. Do not duplicate LUCIA Core authentication.

### Phase 9 — Cross-destination transitions and state
Ensure navigation between workspace destinations preserves context and unsaved work appropriately. Every visible control must trigger a real action with truthful success/failure and permission states.

### Phase 10 — Workspace acceptance gate
Verify real click/touch/keyboard flows at phone, tablet, laptop, and large desktop sizes; accessibility and reduced motion; reload/persisted preferences; permission-denied/error/empty states; no horizontal overflow; and no regressions in sign-in or existing customer work. Only then proceed to Layouts.

## Section 2 — Free Website Engine and Layouts (Phases 11–19)

### Phase 11 — Website Engine baseline and free-offer audit
Audit create/edit/preview/publish, domains, layouts, data persistence, entitlement checks, and current pricing gates. Remove any unsupported assumption that standard website creation/publishing requires a subscription, paid Layout, or AI purchase.

### Phase 12 — Layout catalogue design rubric and inventory
Inventory current catalogue entries, routes, screenshots, and rendered structures. Define per-layout purpose, design identity, sections, responsive composition, imagery, navigation, and content-replacement criteria. Identify near-duplicates.

### Phase 13 — Layout composition system
Build reusable primitives that allow different page structures and visual identities rather than forcing all designs into one skeleton. Preserve supported schema validation and safe rendering; do not execute arbitrary code.

### Phase 14 — First polished Layout exemplars
Design and finish a small representative set of genuinely different Layouts one by one. Use realistic demo content, complete sections, coherent navigation, and responsive states. Review quality before scaling the catalogue.

### Phase 15 — Accurate Layout previews and selection
Show meaningful previews before selection, with enough of the actual website to judge it. Ensure preview and published rendering use the same validated design definition and asset references. Selection must create a real project, not just change a title.

### Phase 16 — Content replacement and customisation
Let customers replace demo text, imagery, contact details, and business information without breaking the design. Verify useful defaults and that customers do not need to rebuild navigation, spacing, or missing sections.

### Phase 17 — Distinct catalogue expansion
Expand the catalogue in reviewed batches toward the intended 36-layout target if that remains the approved count. Every entry must be meaningfully different in structure/design—not merely copy, title, or colour. Compare screenshots and DOM/page structure at phone, tablet, and desktop sizes; reject near-duplicates.

### Phase 18 — Free creation and publishing contract
Verify that a customer can create, customise, preview, and publish a standard website for free without AI or a purchase. A supported LUCIA address is available; custom domains remain an optional paid service. Preserve the previous known-good live version on failure.

### Phase 19 — Website end-to-end acceptance
Test layout selection → content replacement → save → preview → publish → public rendering; permissions and tenant isolation; error recovery; accessibility; mobile/tablet/desktop; and real domain/publishing state. Do not proceed based solely on a green build.

## Section 3 — Loom verified professional network (Phases 20–24)

### Phase 20 — Loom access and verification policy
Specify spectator vs verified-member permissions, eligibility evidence, custom-domain/business review, staff interview and decision workflow, appeals, evidence access/retention, and audit requirements. Badge colours (blue/green) remain undecided. Paid application/review cannot guarantee verification.

### Phase 21 — Loom information architecture and responsive UI
Audit existing Loom implementation, then design the first-class workspace destination for professional discovery, discussions, groups, business directory, connections, messaging, and collaboration. Use original LUCIA styling, readable structure, and responsive desktop/mobile/tablet behaviour.

### Phase 22 — Real community and connection flows
Implement only the scoped flows that have defined data and permissions: post/discussion, groups, profiles, discovery, connection consent, messaging, and collaboration as approved. No fabricated activity, inert actions, or UI-only authorization.

### Phase 23 — Staff verification workflow
Build application intake, evidence review, interview outcomes, approve/reject/review-again decisions, audit events, restricted evidence access, and appeals. Verify business existence separately from representative authority. Purchasing a product must not automatically verify a person/business.

### Phase 24 — Loom trust, safety, and acceptance
Verify public/read-only spectator boundaries, verified-member participation, blocking, reporting, moderation, appeals, abuse prevention, privacy, consent, evidence retention, and tenant boundaries. Paid status and sponsored placements must not silently affect trust badges.

## Section 4 — LUCIA Store and commercial application ecosystem (Phases 25–29)

### Phase 25 — Store catalogue and listing contract
Define free/paid listings, first-party vs approved third-party publishers, categories, version, licence, update window, dependencies, data handling, support, runtime fees, and product-specific white-label/resale rights. Do not claim every category is available at launch.

### Phase 26 — Version purchase and entitlement model
Implement one-time purchase of a specified software version as the default. Record licence, version, purchase, and the proposed one-year update/maintenance window. Keep roles, payment status, Loom verification, and entitlements separate. Do not introduce subscription expiry as the default.

### Phase 27 — Workspace app installation and upgrade
Make acquired apps appear as workspace icons with real open/setup/update actions. For major-version upgrades, validate the new licence, backup, data migration, recovery/rollback, and active-version switch before replacing old-version access. Never silently destroy customer data.

### Phase 28 — White-label and customer monetisation
For explicitly eligible products, implement branded deployment/resale or customer-facing use under product-specific licences. Define data ownership, tenant isolation, allowed branding, redistribution rights, support/security responsibilities, and integration with the customer's own payment provider (for example Paystack). Never promise customer earnings or expose payment credentials.

### Phase 29 — Custom domains, payments, and Store operations
Make purchasable LUCIA services such as custom domains discoverable and purchasable through Store. Verify payment server-side; make order, entitlement, domain, upgrade, refund/failure and webhook flows idempotent, auditable, and recoverable. Disclose domain renewals and third-party runtime/API charges separately. Keep standard website creation/publishing free.

## Cross-section release gate (Phase 30)

### Phase 30 — Integrated ecosystem and release readiness
Test the complete user journeys: sign in → workspace → free website → preview Layout → personalise → publish; Loom spectator → apply → staff review/interview → verified participation; Store discovery → purchase/version licence → workspace icon → update/upgrade → data preserved; eligible white-label app → customer deployment → customer's payment provider. Verify tenant isolation, permissions, accessibility, performance, failure recovery, backups/exports, payment reconciliation, and device-specific UX. Report actual evidence and unresolved gaps. Do not represent a product or category as available if it is not implemented and verified.

## Cross-phase non-negotiable rules

- Free standard website creation and publishing is a deliberate acquisition strategy.
- Start with the signed-in workspace; the welcome page is not the first task.
- Layouts are distinct finished designs, not renamed copies of one skeleton.
- Loom is a professional network; never use the name for website layouts.
- LUCIA Store is a technology marketplace; version licensing is the default, not subscriptions.
- White-label/resale rights are explicit and product-specific.
- LUCIA Core authenticates only; LUCIA OS enforces local authorisation and tenancy.
- No fake controls, fabricated data, simulated progress, or premature success.
- Payment and entitlements are server-authoritative, idempotent, and recoverable.
- Failed website publishing preserves the previous known-good live site.
- Do not merge/deploy or perform destructive production actions without explicit approval.
