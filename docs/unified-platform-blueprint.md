# LUCIA OS Unified Platform Blueprint

**Status:** Approved product direction; implementation status must be verified separately.  
**Owner repository:** `trendorafindsinc-jpg/lucia-os`  
**Canonical roadmap:** [30-Phase Implementation Roadmap](implementation-roadmap-30-phases.md)  
**Existing website-engine contract:** [Website Engine Blueprint](website-engine-blueprint.md)

> This is the governing product and architecture blueprint for the unified LUCIA OS direction. It describes intended behaviour, not proof that features already exist. Before implementing any phase, inspect the current code and tests, report the actual state, and reconcile the plan with the repository without silently changing approved product decisions.

## 1. Product vision

LUCIA OS is a multi-tenant product operating system for people and organisations to create, publish, sell, serve customers, operate a business, and participate in the wider business community from one coherent workspace.

It must feel like one connected product, not a collection of disconnected applications. A shared shell, design system, project/organisation context, status language, and navigation provide coherence. Each major capability remains a purposeful workspace with its own workflows and backend-enforced permissions.

### Core navigation decision

The main LUCIA OS navigation includes these first-class destinations:

1. **Home / Overview** — resume work, see meaningful status, recent activity, and next actions.
2. **Websites** — website projects, Loom Library, Layer Studio editor, pages, preview, domains, and publishing.
3. **AI Studio** — AI-assisted creation and help. AI is optional; the rest of the platform must work when AI is unavailable.
4. **Store** — a seller and buyer commerce experience.
5. **Portals** — category-specific portal experiences.
6. **Business Admin** — day-to-day company operations and organisation administration.
7. **Loom** — a first-class business community destination, not hidden inside Business Admin, Store, or Portals.
8. **Plan & Billing** — plan, usage, billing records, and premium entitlements, visible according to permissions.

Supporting tools such as **Layouts**, **Domains**, and **Publishing** may appear as dedicated navigation entries or contextual sections under Websites where that produces a clearer experience. They must not be implemented as disconnected silos. The mobile navigation must preserve access to every permitted destination without making the main interface crowded.

### Workspace behaviour

- Preserve the current organisation/workspace context across destinations and clearly show which organisation is active.
- Provide direct, stable navigation between related tasks (for example, a website to its domain settings or a Store to its storefront).
- Use shared visual language, responsive layouts, meaningful loading/empty/error states, and accessible controls.
- A control must execute a real action. No inert buttons, fake progress, placeholder success messages, or UI-only permission checks.
- The user must understand what is saved, what is a draft, what is published/live, what failed, and what action can recover it.

## 1.1 V1 release scope and navigation contract

**V1 includes the website engine and Loom. Store, Portals, and Business Admin are not part of v1.** The long-term platform vision and later roadmap phases may describe these products, but that does not make them v1 commitments.

The workspace may keep Store, Portals, and Business Admin visible for discoverability, but each must be clearly labelled **Unavailable in v1** or **Coming in a future version** and must not expose incomplete workflows, misleading success states, or apparent working routes. If selected, the item must produce a truthful unavailable explanation rather than pretending to open a functioning product. Loom is available in v1 as a first-class destination and must not be marked unavailable.

The 30-phase roadmap remains the long-term sequence: Phases 26–28 (Store, Portals, Business Admin) are future-version work; Phase 29 (Loom) belongs to v1 scope. The website engine remains v1's primary focus; optional AI must not block manual/template website creation.

## 2. Product and service boundaries

### LUCIA Core / LUCIA ID

LUCIA Core is the global authentication authority only. It authenticates the person and provides the LUCIA ID identity/session contract. It is not the LUCIA OS application engine and does not own LUCIA OS organisations, memberships, roles, permissions, plans, invoices, entitlements, content, or operational data.

A successful LUCIA ID sign-in does **not** grant access to every product or organisation. Each LUCIA OS request must independently check local membership, role/permission, tenant scope, and applicable entitlement.

### Websites

The website engine is the foundation and first delivery priority. It owns website projects, saved Website Blueprints, pages, assets, drafts, revisions, preview, domains, and publication state.

Canonical website terms:

- **Layouts** — the template/design library. Each Layout is a complete, reusable website composition, not merely a colour variation.
- **Layer Studio** — the visual website creation and editing workspace.
- **Website Blueprint** — the versioned, validated website definition used by the engine; never expose raw JSON as the customer editor.
- **loomifyAI** — the optional AI assistant that proposes a Website Blueprint and sends it through the same validation, save, and preview workflow as all other creation paths.
- **Preview** — renders a draft without changing the live site.
- **Go Live** — promotes a validated version to live delivery (working label; keep terminology consistent).

**Naming precedence:** Loom is the business community product, not a website template. Earlier website-engine documents may use the legacy terms “Loom” (template), “Loom Library”, “Loom Studio”, “Loom Blueprint”, and “LoomifiAI”. Treat those as historical terminology when reading existing specifications. New UI, new documentation and new implementation should use the canonical terms above; update legacy references deliberately without breaking internal code identifiers or persisted data.

### Store — sellers and buyers

Store is designed specifically for commerce participants: sellers manage products and sales; buyers discover products, purchase, and track their own orders. Store may power a storefront embedded in a website, but its transactional workflows and records must remain safe and coherent.

Expected capability areas, delivered incrementally:
- Seller/store setup and settings.
- Product catalogue, product details, images, variants, prices, and stock where applicable.
- Storefront presentation connected to the website engine.
- Cart, checkout, order creation, payment state, receipts, and order history.
- Buyer account/order views and seller order operations.
- Fulfilment, shipping, tax, refunds/cancellations, and notifications where supported and legally/operationally defined.
- Sales reporting and advanced commerce features gated by entitlements where appropriate.

**Integrity rules:** products and orders persist independently of visual template edits. Payment success is determined server-side from verified provider evidence, never from a browser redirect alone. Order/payment processing must be idempotent, auditable, and recoverable. A publish success does not prove checkout or payment works.

### Portals — category-specific experiences

Portals are tailored to their categories and user needs; they are not one generic portal with only its label changed. Each category has its own workflows, information model, roles, protected operations, and quality/acceptance criteria.

Potential categories include education, agriculture, healthcare/clinics, client services, memberships, and other approved specialist domains. These are extensible examples, not a promise that every category ships in the first release. Each category must be explicitly scoped before implementation.

- Shared platform foundations may be reused, but domain-specific rules and workflows must remain explicit.
- Portal UI customisation is allowed only within defined boundaries.
- Authentication, permissions, safety-critical steps, and protected workflows cannot be weakened by theme/editor customisation.
- A valid LUCIA ID is not sufficient portal access; the portal backend must authorise the person, organisation, role, resource, and action.
- Private portal content must not leak through public rendering, previews, search, cached pages, or cross-tenant requests.

### Business Admin — day-to-day company operations

Business Admin is tailored to companies managing their everyday activities. It is an operational control centre, not merely an account settings page.

Expected capability areas:
- Company overview and actionable operational dashboard.
- People, staff invitations, roles, responsibilities, and delegation.
- Business profile and organisation settings.
- Overview and management links for company websites, domains, Store, and Portals.
- Customer/service/operational workflows as each company capability is defined.
- Activity history, security events, audit records, and relevant reports.
- Plan, billing, usage, and premium feature access.
- Ownership transfer/recovery and safe staff offboarding.

Business Admin must not become a backdoor around the permissions of Websites, Store, Portals, or Loom. It can orchestrate and link to those workspaces; each domain must enforce its own operation-level permissions. Staff removal revokes access but must not delete organisation-owned assets, customer orders, websites, or shared work.

Candidate scoped roles include organisation owner, business admin, website manager/editor, store manager, portal manager, and other category-specific staff. This is a role vocabulary, not a final permission matrix. Multiple roles may be assigned, but no role receives unrestricted access by implication.

### Loom — business community

Loom is a first-class destination in the LUCIA OS main navigation. It is the community and collaboration surface for businesses and people; it is **not** a subsection of Business Admin and is not the Store or Portals.

Loom's main areas:
1. **Discussions** — public business conversations organised by topic.
2. **Groups** — public joinable groups and private groups requiring approval/invitation.
3. **Business Directory** — public discovery of published business profiles.
4. **Connections & Messaging** — mutual-consent connections, direct messages subject to policy, and business contact requests to authorised representatives.
5. **Collaboration Spaces** — scoped shared spaces for approved collaboration.
6. **Trust & Safety** — business verification, reporting, moderation, appeals, and account restrictions.

#### Loom UI direction — GitHub structure + Facebook discovery

The approved visual direction is a **beautiful, original blend of GitHub's structured collaboration UI and Facebook's social discovery UI**. Borrow the useful interaction principles, not either product's branding or literal screen layouts:

- **Structure from GitHub:** clear information hierarchy, topic/context labels, readable discussion threads, contribution actions, activity context, predictable navigation and well-scoped collaboration spaces.
- **Discovery from Facebook:** an engaging central feed, easy discovery of groups and businesses, people/connection suggestions, notifications and natural paths from a post or profile into a conversation.
- **Desktop composition:** a shared top bar with Loom identity, prominent search, create action, notifications and account/workspace context; a left navigation rail for Home, Discussions, Groups, Business Directory, Connections/Messages and relevant spaces; a central feed or selected content; and a contextual right rail for relevant groups, suggested businesses/people or useful activity.
- **Responsive composition:** at tablet/mobile widths, simplify to a focused single-column content experience with clear navigation/drawers. Keep primary actions reachable and avoid horizontal overflow or hover-only interactions.
- **Premium LUCIA styling:** restrained indigo/violet accents, refined typography, balanced whitespace, soft surfaces and borders, subtle purposeful motion, strong focus states and accessible contrast. Avoid visual clutter and avoid copying either reference product.
- **Connected workflows:** the feed, discussions, groups, business profiles, connections, messages, collaboration spaces and trust/safety actions must link into real product flows and reflect persisted server state. Do not ship a visual shell with inert controls or fabricated activity.
- **State and accessibility contract:** include meaningful loading, empty, error/offline, permission-denied, blocked-user and moderation states; keyboard navigation, semantic structure, accessible names, reduced-motion support and suitable touch targets.

The precise component layout may evolve during implementation, but the GitHub-plus-Facebook product direction and the behaviour/accessibility requirements above are canonical.

#### Loom trust and participation rules

- Eligible LUCIA ID holders may join Loom, but an account alone does not make a person a verified business representative.
- Business verification is evidence-based. Acceptable evidence must meet the approved formal business-registration or qualifying domain-control rules; do not invent manual exceptions for evidence-free informal businesses.
- Business existence/verification and a person's authority to represent the business are separate checks.
- Public content and published business profiles may be readable without sign-in. Posting and member participation require the applicable Loom membership and verification policy.
- Organisation-owned business profiles and official business posts remain with the organisation when a representative leaves.
- Connections require mutual consent. Blocking must prevent direct messages and connection requests from the blocked party, including attempts through shared groups or collaboration contexts.
- Platform-wide moderation authority belongs to authorised LUCIA staff; group owners can manage routine group matters but cannot override platform enforcement.
- Penalties, appeals, urgent restrictions, evidence access, retention, exports, and deletion must follow documented trust/safety and privacy rules.
- Paid status is independent of verification. A software purchase can never purchase or preserve a verified-business badge.
- Paid placements must be labelled and kept separate from organic ranking. Paid status must not silently influence verification or trust decisions.
- Loom bans are Loom-only by default. Cross-product restrictions require a separate explicit authorisation and audit trail.

#### Loom integrations

Loom may link to other LUCIA OS products where this is useful, but its public links must not grant access to private websites, Store operations, Portals, or Business Admin. Every destination checks its own authentication, membership, permissions, tenant scope, and entitlements.

Explicit, scoped, auditable consent-controlled integration is the proposed safe default for cross-product links and data exchange. The detailed cross-product sharing policy remains a design item to confirm before implementing data-sharing integrations. Do not implement automatic broad data sharing.

## 3. Shared platform foundations

### Organisation and tenant isolation

- One LUCIA ID may belong to multiple organisations.
- An organisation owns its membership, scoped roles, projects, websites, Store, Portals, assets, records, domains, purchases, entitlements, and billing records.
- Every protected read, write, render, export, background job, webhook, and administrative action must be tenant-scoped and authorised on the server.
- Organisation IDs, hostnames, slugs, URL parameters, browser state, and user-supplied metadata are locators—not proof of permission.
- Use database constraints and row-level security as defence in depth where supported by the existing architecture.
- Tenant ownership must be explicit for uploaded assets, website revisions, orders, portal resources, and business records.
- Test direct API access and cross-tenant identifiers, not only the visible UI.

### Permissions and premium entitlements

Access requires independent checks:
1. Authenticated identity.
2. Active organisation/product membership where required.
3. Permission for the requested action and resource.
4. Active entitlement/plan and within-limit usage, when the capability is paid or metered.
5. Resource status and safety/business rules.

Payment does not grant an administrative role. Administrative role does not automatically grant premium entitlements. Verification badges are not paid entitlements. UI hiding is convenience only; backend enforcement is mandatory.

Potential paid areas include advanced website capabilities/limits/analytics, custom-domain capability, premium design/tools, optional AI packages, and future software modules or product versions. LUCIA's default commercial model is a one-time purchase of a specified product/version, with durable rights to use that purchased version under its licence terms. A later version is a separate purchase unless the listing explicitly includes an upgrade. Exact prices, included features, usage limits, licence terms, discounts, and support/security-update commitments must be documented before sale.

A one-time LUCIA purchase does not cover third-party recurring charges by implication. Domain registration/renewal, paid email, or other external services must be disclosed and charged separately or paid directly to the provider. Do not promise lifetime hosting, unlimited usage, ongoing support, or perpetual security updates unless LUCIA can fund and contractually provide them. Previously purchased versions must not be revoked solely because a newer version is released.

### Billing and payments

LUCIA OS owns its versioned product catalogue, one-time prices, orders, discount rules, payment records, entitlement decisions, and billing ledger. Provider adapters (including Paystack and other explicitly approved providers) are replaceable. Provider status must be verified server-side using authenticated webhooks/API verification, idempotency, and reconciliation. Never commit secrets or trust client-submitted payment state. Recurring billing is not the default and must not be introduced without a separate explicit product decision.

### Persistence, versioning, and failure safety

- Separate website working drafts from immutable/recoverable published snapshots.
- Every saved project and long-running task has durable state and a recoverable outcome.
- A failed save/publish operation preserves the previous known-good live site.
- A failed Store/payment operation must not create duplicate orders, charge twice, or lose settlement evidence.
- Portal and Business Admin changes need audit trails proportional to their impact.
- Errors must explain the failed operation, what was preserved, and the safe next action.
- Do not report success until the relevant server operation and required verification actually succeeded.

### Privacy, audit, moderation, and recovery

- Collect only necessary data; use least-privilege access.
- Record security-sensitive role changes, domain changes, publication, billing/entitlement changes, moderation decisions, and sensitive evidence access.
- Do not log secrets, access tokens, payment credentials, or unnecessary private content.
- Define retention separately for verification evidence, messages, reports, audit logs, financial records, and backups, with legal holds where required.
- Provide export/deletion workflows consistent with organisation ownership, privacy rights, retention duties, moderation/appeal requirements, and recovery windows.
- Have documented backup, restore, incident severity, accountable response, and post-incident review processes.

## 4. UI and interaction quality contract

- V1 available navigation destinations are Overview, Websites, AI Studio, Loom, and Plan & Billing, subject to role/entitlement visibility.
- Store, Portals, and Business Admin may remain visible in the v1 navigation only with an unmistakable unavailable/future-version state. They must not open unfinished workflows or display fake functionality. Loom must remain available in v1.
- Use a consistent shell and design system; allow each workspace to have a distinct information architecture suited to its purpose.
- Make primary actions visible and reachable on mobile.
- Every button, menu item, form, tab, dialog, and navigation affordance must have a real, tested behaviour.
- UI events must connect to the correct server action/API, validate inputs, handle pending/success/failure, and refresh the correct state.
- For AI Create Proposal: clicking must start a real task; its status must be durable; generated output must be validated; a real editable project/draft must be saved; and the user must be routed to it. A change to environment variables alone is not a fix for an inert button.
- Use accessible names, keyboard operation, focus states, semantic headings, responsive behaviour, and useful empty/loading/error states.
- Avoid unrelated screens that feel like separate products. Keep shared navigation, organisation context, breadcrumbs/back paths, and consistent status vocabulary.
- Do not expose raw database structures, JSON schemas, provider internals, or infrastructure jargon in normal customer workflows.

## 5. Product-specific acceptance gates

### Website engine
- Looms are compositionally distinct and previews use the same validated Blueprint/renderer as the site.
- Manual, template-based, and LoomifiAI creation share the same save/preview/publish pipeline.
- Draft changes never mutate the live version until explicit successful promotion.
- Existing customer websites remain regression fixtures and are not overwritten by schema or template work.
- Domain registration, ownership/DNS verification, TLS, publication, and actual live rendering are separate states and individually verified.

### Store
- Seller and buyer permissions are distinct and enforced server-side.
- Product, inventory, order, payment, refund/cancellation, and fulfilment state transitions are validated.
- Checkout cannot trust client-side payment success.
- Idempotency and reconciliation tests prevent duplicate charges/orders and preserve evidence.
- Store visual customisation cannot mutate transactional records.

### Portals
- Each approved category has explicit requirements and workflows.
- Role/resource authorisation is enforced for every protected route/API.
- Cross-tenant and unauthorised access tests fail closed.
- Public pages, previews, indexing, and caches cannot expose protected portal information.

### Business Admin
- Company owner can delegate and revoke scoped access.
- Staff cannot perform operations outside assigned scope.
- Revoking a staff member does not destroy organisation-owned assets or operational records.
- High-impact actions are auditable and recovery paths are defined.

### Loom
- Public directory/discussion visibility follows the selected public-content policy.
- Business verification and representative authority are separate, evidence-backed decisions.
- Connection consent, messaging rules, blocking, reports, moderation, and appeals work end-to-end.
- Paid status cannot confer verification or bypass moderation.
- Loom links do not bypass other products' permission or tenant checks.

### Premium access
- Backend enforces both permission and entitlement.
- Plan changes, expiry, grace, and downgrade follow explicit rules.
- Existing data and live services are preserved unless a separately approved policy says otherwise.
- UI state accurately reflects server entitlement state.

## 6. Delivery governance

The 30-phase roadmap is the implementation sequence. Existing phase documents remain useful detailed specifications; the roadmap is the single index and dependency map. A phase is not complete merely because a screen exists or a commit was made.

For every phase:
1. Read this blueprint, the roadmap, relevant phase specs, and current code.
2. Report the actual implementation state and gaps before coding.
3. State the narrow scope and files/systems likely affected.
4. Add tests that prove behaviour, including negative/security cases.
5. Implement only the phase scope; do not silently pull in future phases.
6. Run relevant tests, lint, type-check, build, and browser checks as applicable.
7. Record evidence, limitations, migration/rollback considerations, and remaining work in the phase tracker.
8. Update the phase status only from evidence. Never mark work complete from intention or a successful build alone.
9. Preserve existing customer data and working live sites.
10. Do not deploy, mutate production, change DNS, or run destructive migrations without explicit approval for that action.

## 7. Non-goals and unresolved decisions

This blueprint does not, by itself, approve:
- A final premium pricing/plan/usage matrix.
- Every possible Portal category for the initial release.
- Broad or automatic cross-product data sharing.
- A specific implementation of Loom moderation tooling beyond the policy requirements.
- A migration that rewrites existing customer data or replaces current live sites.
- A production deployment or a claim that any described feature is already implemented.

Record open decisions in the roadmap/phase tracker and ask only when the decision blocks safe progress. Do not invent a user approval.
