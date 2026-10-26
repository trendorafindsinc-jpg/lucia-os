# LUCIA OS — 30-Phase Delivery Roadmap

**Status:** Required implementation sequence; all completion states must be based on evidence.  
**Canonical product requirements:** [LUCIA OS Product Vision and Contract](lucia-os-product-vision.md)  
**Focused website requirements:** [Layout Studio Contract](website-engine-blueprint.md)

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

### Phase 2 — Workspace architecture and navigation foundation
Foundation contract: [Workspace Architecture Contract](workspace-architecture-contract.md). Define and test the pre-UI architecture required for a coherent, device-adaptive app workspace. This phase is foundation work, not the visual redesign. Specify the shared shell boundaries, responsive capability rules, typed app registry, route/access rules, workspace-tab lifecycle, app-state preservation contract, split-view capability contract, and Assistive Orb integration boundary. A workspace tab represents one app workspace (for example Layout Studio or a purchased portal), not an arbitrary browser URL. Users can open, activate, close, and return to the launcher from tabs without needlessly losing each app's work. Split view is supported on desktop/laptop and capable tablets; phones use a full-screen app switcher. Define keyboard, touch, accessibility, reduced-motion, and safe-area requirements. Keep the signed-out welcome page and full visual redesign out of scope. Do not start Phase 3 until Phase 2 foundation acceptance is explicitly recorded.

### Phase 3 — Shared visual and interaction foundation
After Phase 2 is accepted, create the visual language for the workspace shell and its primitives: typography, surfaces, spacing, focus, motion, loading/empty/error/disabled states, touch targets, tabs, split-view affordances, and the Assistive Orb's compact/expanded states. Do not copy proprietary Apple UI or branding. This phase establishes the design system; it does not replace the need for Phase 4/5 device-specific implementation.

### Phase 4 — Mobile workspace
Implement the phone-first workspace composition with touch-friendly app navigation, compact app switcher, safe-area handling, and a small expandable Assistive Orb. Phones use one active app workspace at a time; switching tabs preserves app state as supported by the app-state contract. Do not force split view onto phone screens. Drag-and-drop cannot be the only way to arrange or launch apps.

### Phase 5 — Desktop workspace and multi-workspace interactions
Implement the desktop/laptop workspace composition with app tabs, reliable open/activate/close behavior, keyboard shortcuts where appropriate, and split view for two eligible app workspaces. Each pane must maintain its own route/context and permission checks. Preserve a useful desktop information density; do not stretch the mobile UI across a desktop. Coordinate with Phase 6 for capable-tablet split view.

### Phase 6 — Tablet workspace
Implement a deliberate tablet composition using tablet space and touch affordances. Verify portrait and landscape; avoid simply scaling mobile or squeezing desktop. Support split view only when the viewport, app capabilities, and interaction density make both panes usable; otherwise retain the app switcher.

### Phase 7 — App and workspace registry
Define stable app identifiers, labels, original icon assets, launch destinations, availability states, and capability/entitlement metadata. The registry also declares whether an app supports split view, how it saves/restores workspace state, and its contextual requirements. Initial first-class entries include Overview, Layout Studio, Layouts, Loom, Store, installed applications, and Settings. Portals and Business Admin are future Store products, not unavailable launcher apps. No fake installed apps or dead icons.

### Phase 8 — Settings and workspace context
Connect profile/workspace preferences, security entry points, organisation context where applicable, and persisted layout/icon preferences. Do not duplicate LUCIA Core authentication.

### Phase 9 — Cross-destination transitions and state
Ensure navigation between workspace destinations preserves context and unsaved work appropriately. Define app-tab open/activate/close, safe close when edits are dirty, tab restoration limits, deep-link behavior, browser back/refresh, and independent pane navigation for split view. Do not claim state is preserved unless the app has a real state persistence/restoration mechanism. Every visible control must trigger a real action with truthful success/failure and permission states.

### Phase 10 — Workspace acceptance gate
Verify real click/touch/keyboard flows at phone, tablet portrait/landscape, laptop, and large desktop sizes; app-tab lifecycle and state preservation; close-with-unsaved-changes handling; split view with two independently navigable eligible apps; fallback when an app cannot split; phone app switching; Assistive Orb open/close and non-obstructive behavior; accessibility and reduced motion; reload/persisted preferences; permission-denied/error/empty states; no horizontal overflow; and no regressions in sign-in or existing customer work. Only then proceed to Layouts.

## Section 2 — Free Layout Studio and Layouts (Phases 11–19)

### Phase 11 — Layout Studio baseline and free-offer audit
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


## Workspace interaction architecture — cross-phase requirement

- **Workspace tabs are app workspaces:** one tab per app instance/context, not a general-purpose browser URL tab. The default is one tab per app; separate instances may be supported only when their context and state model are explicit.
- **State preservation:** tab switching must not itself discard the active app's state. Each app declares its supported in-memory and durable draft/state restoration behavior. Unsaved changes are protected with an honest prompt or app-specific recovery; never promise restoration that has not been implemented.
- **Split view:** desktop/laptop and capable tablets only. Two eligible app workspaces render side by side with independent navigation, focus, context, and server-enforced authorization. Phones use the app switcher. Split view is a shell capability, not permission to bypass app boundaries or embed arbitrary unsafe content.
- **Assistive Orb:** a small, floating, expandable LUCIA shortcut surface. It can expose launcher, app-switching, and permitted navigation actions. It must not block primary controls, be the only navigation method, impersonate a native OS feature, or trigger privileged actions without normal authorization.
- **Phase sequencing:** Phase 2 documents/contracts and narrowly scoped foundation only. Phase 3 defines the shared visual language; Phase 4 implements the mobile workspace; Phase 5 implements desktop and multi-workspace interactions; Phase 6 adapts split view to capable tablets. Do not begin Phase 3 before Phase 2 is explicitly accepted.
