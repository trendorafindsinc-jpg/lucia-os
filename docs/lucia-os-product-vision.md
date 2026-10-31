# LUCIA OS — Unified Product Vision and Contract

**Status:** Canonical product direction captured from the founder's four-section briefing on 2026-10-26.  
**Repository:** `trendorafindsinc-jpg/lucia-os`  
**Implementation status:** This document records intended behaviour, not proof that features are implemented. Audit code and tests before claiming delivery.  
**Execution order:** Section 1 first, then Sections 2–4 integrated into the same workspace.

This document supersedes conflicting product/navigation assumptions in earlier versions of the unified platform blueprint, website-engine blueprint, and roadmap. Historical phase documents may be retained for implementation detail, but any conflicting product decision in them is superseded by this document until explicitly reconciled. Do not delete code, persisted data, or migrations as part of documentation cleanup.

## 1. Vision and business model

LUCIA is a technology provider building what comes next: a coherent operating environment where people and organisations can create a website for free, use technology applications, connect with credible professionals, and potentially commercialise software through their own websites.

LUCIA OS must feel like one premium, integrated product—not a collection of disconnected dashboards. Its workspace is the home for first-party and approved applications. Apps purchased or otherwise acquired through LUCIA Store appear as launchable workspace icons and open a useful, connected experience.

### Free Layout Studio is the acquisition strategy

**Creating and publishing a standard website through the LUCIA Layout Studio is free.** This is a deliberate customer-acquisition strategy: remove the initial cost barrier, bring people into the LUCIA ecosystem, and let them experience the product before deciding whether they need paid technology.

- Do not turn basic website creation into a subscription requirement.
- Do not gate the basic ability to create and publish a standard website behind purchasing a layout, AI, Store product, or paid plan.
- Layouts include polished starting designs; customers should not need to buy a design just to have a usable free website.
- AI may be optional and separately costed if it has real provider/compute costs; manual creation and layouts must remain usable without AI.
- Custom domains and other separately purchased services can be paid products, but the free website can use a LUCIA-provided address under the platform's supported policy.
- Disclose genuine third-party costs and any optional paid capabilities clearly. Do not imply that a free website includes a custom domain, paid third-party services, unlimited costly AI, or perpetual managed infrastructure where it does not.
- The free offer is a product rule, not an excuse to compromise security, reliability, accessibility, performance, or support transparency.

## Approved Paystack payment contract (documentation decision)

**Provider:** Paystack is the approved LUCIA OS payment provider for LUCIA Store purchases; this is a product decision, not a claim that Paystack checkout or credentials are already configured.

- Standard Layouts, website creation, editing, preview and publishing on a supported LUCIA address remain **free**.
- **Custom Domain Access** is a **₦5,000 one-time Store product**, purchased independently of software. It grants platform access to connect an eligible customer-owned domain; registration and registrar renewal costs are separate. Do not represent the charge as domain ownership, an annual renewal or a subscription.
- Commercial software is purchased as a **specific version** through a one-time purchase with the disclosed licence and one-year updates/maintenance coverage. A future major version is an optional separate purchase, not an automatic recurring charge.
- Customer-operated subscriptions to their own software end users are distinct from purchases from LUCIA.
- The server must establish the trusted order, user, product, amount and currency (**NGN 5,000 = 500,000 kobo**). Never trust client-supplied prices or payment-success flags.
- Create Paystack payment attempts with unique references. Activate a domain-access entitlement or software licence **only after server-to-server verification** of Paystack transaction status, amount, currency, reference, product and the intended customer. A return URL or screenshot is never proof of payment.
- Verify webhook authenticity using the provider's documented signing contract, process retries idempotently, and prevent duplicate activation. Reconcile pending/abandoned transactions; account for failed, disputed and refunded payments with auditable transitions.
- Check tenant ownership and domain verification independently of payment entitlement. A successful charge alone never proves domain ownership or authorizes cross-tenant association.
- Keep Paystack secret keys server-side in deployment secrets. Do not log secrets, expose them in browser bundles or hardcode endpoints/credentials.
- Implement checkout, Store entitlements, reconciliation and any required migrations only in their approved functional phases, with separate rollout authorization. Do not add fake checkout buttons or activate custom domains in a documentation-only change.

## 2. The four connected sections

The four sections are product capabilities within one workspace, not four unrelated products. Each has its own icon and destination, while sharing navigation, visual language, account context, permissions, notifications, and clear status.

### Section 1 — LUCIA OS Workspace (build first)

The signed-in workspace is the operating environment and app launcher. The welcome/landing page before sign-in is a separate experience; redesigning it is not the first task in this initiative.

Replace the unwanted workspace design branch/design direction rather than treating it as the target. First inspect its code and identify reusable safe foundations; do not merge or preserve its visual direction simply because work has begun.

Device-adaptive interaction:
- **Mobile:** an iOS-inspired home-screen metaphor, app icons, settings, and movable/reorderable icons where practical. Touch-first interactions, safe-area awareness, accessible labels, reduced-motion support, and no desktop-only hover requirements.
- **Desktop:** a polished macOS-inspired environment with an intentional desktop workspace, navigation, app launcher, window/content conventions where useful, and keyboard support.
- **Tablet:** an iPad-inspired adaptive layout that uses available space and touch interaction well; it must not be merely a stretched phone or cramped desktop.
- These are original LUCIA designs inspired by familiar interaction patterns, not copies of Apple branding, assets, or screens.
- Workspace navigation must retain clear access to Overview, Layouts, Loom, LUCIA Store, and installed/available applications. The Layout Studio is itself a first-class workspace icon.
- The interface should adapt by breakpoint/input capability and preserve the user's work and context across destinations. A mobile user should not be forced through a desktop-like sidebar, and desktop users should not get a phone screen stretched across a monitor.
- Every icon/control must have a meaningful action, status, focus/pressed/loading/error states, and permission-aware destination. No fake app icons, dead buttons, simulated success, or inaccessible drag-only interactions.

### Section 2 — Layouts (website design library)

**Canonical design specification:** `docs/layouts-48-premium-catalogue.md`. **Storage and payment contract:** `docs/layouts-s3-storage-contract.md`. Phase 11 owns existing website platform readiness and free offer; Phase 12 owns catalogue design and quality criteria; Phase 13 owns the shared validated composition engine. The catalogue specification does not imply completed production designs.


Use **Layouts**, never customer-facing “templates,” for the curated website design catalogue. Layouts are accessed through their own workspace icon or an equally clear first-class entry.

The catalogue must offer genuinely different designs, not one structure with changed titles, colours, or demo copy. The approved target is **48 Layouts in 8 categories of 6**. All 48 must be intentionally distinct design compositions. Design quality takes priority over rushing a catalogue count.

Each Layout should be a polished, ready-to-personalise website, with:
- Distinct page structure, information hierarchy, typography, spacing, colour system, navigation, imagery, component choices, and responsive composition appropriate to its use case.
- Realistic, clearly labelled demo content and imagery; no empty skeleton presented as a finished design.
- Complete relevant page sections and useful navigation, not just a hero section or a pretty thumbnail.
- Responsive desktop, tablet, and mobile rendering; accessible contrast, semantic structure, keyboard operation, and reduced-motion support.
- Content and assets that customers can replace without needing to rebuild the design.
- A meaningful preview before selection, showing enough of the actual design to judge it. Preview must accurately represent the selected Layout, not just a card with a title.
- Selection that creates a working site through the same validated website-definition, save, preview, and publish pipeline as other creation methods.
- Clear disclosure of any genuinely paid optional asset/service; the base website and usable Layout selection remain free.

**Quality gate:** no two catalogue entries count as distinct solely because their wording, brand name, or colour changed. Compare screenshots and structure at mobile/tablet/desktop sizes; reject near-duplicates unless they serve a clearly different, intentional design purpose. A customer should mostly replace demo content—not spend hours fixing navigation, layout, spacing, or missing sections.

### Section 3 — Loom (verified professional network)

Loom is a first-class workspace destination for professional connection, influence, discovery, and relationships with credible people and organisations in the LUCIA ecosystem. It is not a website layout, Store subsection, or Business Admin page.

Participation model:
- A person with a LUCIA ID but without Loom verification is a **spectator**: may see content explicitly designated public/read-only, but does not automatically gain verified member privileges.
- A **verified LUCIA ID** is eligible for Loom member participation under Loom's permissions and rules. Account authentication and Loom verification are separate states.
- Verification should be evidence-based and staff-reviewed. The proposed process is application → identity/business evidence → website/domain/business review → staff interview → documented decision → badge and scoped participation rights.
- A custom domain, a real and credible website/business, and an interview are proposed evidence/criteria. Purchasing an eligible LUCIA product may be a qualifying signal or application route, but it is not proof of trustworthiness and does not automatically grant verification.
- Paid verification may be offered as a route to apply or cover a defined review service, but **payment alone must never guarantee approval or buy trust**. The exact paid route and eligibility rules need a published policy before implementation.
- **Founder-approved Loom badge policy:** **green** means approved through standard review; **blue** means approved through the optional paid priority-review bid route. A paid, pending, or rejected applicant receives no badge. The optional bid starts at **₦5,000**, may be higher at the applicant's choice, and may prioritize *review scheduling only*, never the approval decision. Application standards remain the same; paying does not guarantee approval. See `docs/loom-staff-verification-policy.md`.
- Business existence and a person's authority to represent it are separate checks. Verification evidence and decisions need restricted access, retention rules, an audit trail, and an appeal/re-review path.
- Loom should support professional discovery, discussions, groups, business profiles/directory, connections, messaging, collaboration, reporting, moderation, blocking, and appeals in defined increments. Connection and messaging workflows require consent and abuse protections.
- Paid Store status, product purchases, popularity, and advertising must not silently influence trust badges or organic ranking.
- Public content must not expose private tenant, website, Store, or account data. Loom restrictions remain Loom-only by default unless a separate explicit, auditable policy authorises wider impact.

- LUCIA staff workspace must have a dedicated, authorized **Loom management** section for application processing, priority bids, evidence, interviews, approvals/rejections, moderation, reports, appeals and audit history. Review fees require separately published refund/processing policies and verified payment implementation before collection. See `docs/loom-staff-verification-policy.md`.

Loom's interface should be a polished original LUCIA experience: structured collaboration and readable discussions combined with engaging social discovery. Do not copy another product's branding or literal screen design. Responsive mobile is focused and touch-friendly; desktop uses clear navigation, feed/content hierarchy, and relevant contextual discovery.

### Section 4 — LUCIA Store (technology marketplace)

LUCIA Store is the central discovery and purchasing destination for technology supplied by LUCIA and, when enabled under an approved policy, third-party publishers. It is not merely a seller/buyer shop.

Potential catalogue categories include AI providers and tools, healthcare technology, office management, education, commerce, business software, developer tools, website capabilities, custom domains, and other approved applications. These are an extensible vision, not a claim that every category is already available.

Purchase and installation experience:
1. Customers discover and compare products in the Store.
2. A listing clearly explains price, version, licence, included maintenance/update period, data handling, dependencies, infrastructure costs, support limits, and whether the product can be white-labelled or resold.
3. After purchase or free acquisition, an eligible product appears as an icon in the customer's workspace, with an obvious setup/open/update action.
4. The app opens into a connected LUCIA experience. Each app retains its own appropriate data model, permissions, tenant boundaries, and status.
5. Customers can manage product versions, licences, updates, configuration, and available support from the Store/product detail experience.
6. Layout Studio is a workspace icon and remains free for standard website creation/publishing. Custom domains and other purchasable LUCIA services are discoverable and purchased through the Store.

Commercial model — version-based, not subscription-first:
- The default model for purchasable software is a **one-time purchase of a specific version**, with the licence terms disclosed before purchase.
- A version includes a defined **one-year update/maintenance window** under the proposed standard. During that window, updates may include security patches, bug fixes, compatibility corrections, and improvements/amendments based on customer feedback. Exact scope and dates must be recorded in the entitlement.
- A later major version is a separate purchase unless the listing explicitly includes it. Buying a new version activates its licence/update window.
- Upgrading switches the customer's active entitlement to the new version while preserving and migrating eligible customer data and configuration. The product must provide a tested migration, backup/recovery path, and clear notice before irreversible changes.
- The founder's intended rule is that upgrading replaces active access to the old version. Implement this as an entitlement/version switch only after the licence, data export, rollback, and migration behaviour are explicitly specified. Do not silently delete data or promise that an old version remains accessible if the customer-facing licence says otherwise.
- The licence may grant continued use of the purchased version without recurring subscription fees, but that does not automatically include perpetual hosting, third-party API costs, domain renewals, unlimited usage, future major versions, or indefinite support/security maintenance.
- **Do not introduce recurring subscriptions as the default Store model.** If a product genuinely depends on ongoing paid infrastructure or a third-party service, disclose that dependency and price separately before purchase.
- Free products are allowed where ongoing operating/support costs are sustainable and the listing makes limits clear.
- Payment verification, entitlement issuance, upgrades, refunds/failed purchases, and provider webhooks must be server-authoritative, idempotent, auditable, and recoverable.

White-label and commercial deployment:
- Some products may be licensed for customers to rebrand, embed, deploy through their own LUCIA website, and offer to their own customers.
- Some products may support customer monetisation through the customer's own payment provider (for example, Paystack), so the customer can charge end users and earn revenue.
- This right is **product-specific**, not automatic for every Store item. Listings and licences must define white-label rights, redistribution/sub-licensing, branding, customer limits, data ownership, support responsibility, security obligations, payment integration responsibilities, and any prohibited uses.
- Separate the customer's software purchase from their downstream revenue. LUCIA does not guarantee customer earnings, and customer payment accounts/credentials must not be shared with LUCIA.
- For LUCIA-hosted or provider-dependent software, disclose runtime/service charges and availability boundaries. A one-time licence cannot make expensive third-party inference, storage, messaging, or healthcare infrastructure free to operate forever.
- Third-party publishers require approval, security/privacy review proportionate to risk, versioning/support expectations, and a clear publisher contract before their software is listed.

## 3. Shared platform rules

### LUCIA ID/Core and authorisation
LUCIA Core is the global authentication authority only. It authenticates identity; it is not the LUCIA OS application engine and does not replace local authorisation. LUCIA OS owns local organisation membership, roles, permissions, product records, purchases, entitlements, website content, Loom membership/verification records, and app configuration.

A valid LUCIA ID is not universal permission. Each protected action checks authenticated identity, organisation/product membership where applicable, resource scope, role/permission, entitlement/licence, and safety/business rules on the server. UI visibility is never the security boundary.

### Tenancy and data ownership
- Organisations own their websites, assets, app configurations, business data, purchases, licences, and records; individual ownership rules must be explicit for personal resources.
- Every protected read/write/render/export/background job/webhook/admin action is tenant-scoped and authorised.
- IDs, slugs, hostnames, browser state, and user-supplied metadata are locators, never proof of permission.
- Cross-tenant access must be tested at API and data-layer boundaries, not only hidden in UI.
- App installation grants only the explicitly licensed capability; it must not automatically expose another app's or organisation's data.

### Privacy, safety, and recovery
- Collect only necessary information. Verification evidence, health data, payment details, messages, and private business records need stricter access and retention rules appropriate to their risk.
- Log security-sensitive permission, verification, domain, publication, purchase, entitlement, version upgrade, and moderation changes without logging secrets or unnecessary private content.
- A failed website save/publish preserves the previous known-good live version.
- A failed purchase/update/migration must not double-charge, duplicate entitlements, corrupt customer data, or silently remove a working version.
- Every meaningful operation needs truthful loading, success, empty, error, permission-denied, and recovery states. No fake progress, fabricated data, inert buttons, or success before server confirmation.
- Backups, exports, migration rollback, account recovery, and deletion/retention policies must be defined before risky production changes.

### Accessibility, performance, and design quality
- Responsive behaviour must be designed and tested across phone, tablet, laptop, and large desktop.
- Keyboard navigation, visible focus, accessible names, semantic landmarks, suitable contrast/touch targets, and reduced-motion preferences are required.
- Motion should communicate state and spatial relationships, not slow routine work.
- Premium visual polish must not come at the cost of legibility, predictable controls, speed, or accessibility.
- Real screenshots and task-based usability checks are required for the workspace and Layouts catalogue; build success alone does not establish design quality.

## 4. Navigation and v1 scope

The workspace's first-class icons/destinations for this direction are:
- **Home / Overview**
- **Layout Studio** (free website creation and publishing)
- **Layouts**
- **Loom**
- **LUCIA Store**
- **Installed applications** (catalogue-driven, permission/licence-aware)
- **Settings** (profile, workspace, security and application preferences)

AI assistance may be available inside the Layout Studio and other eligible applications, but AI is optional and must not be a mandatory standalone gate to basic website creation.

The founder has previously specified that Portals and Business Admin are not part of v1. They must not be presented as functioning v1 products. If retained for future discoverability, label them clearly as unavailable in v1 and do not expose incomplete workflows. The Store vision is documented here, but its delivery timing and available catalogue must be represented truthfully; documentation does not imply that Store is already implemented or that all catalogue categories are available.

The signed-out welcome/marketing page is not the first task in this initiative. Start with the signed-in workspace foundation and then integrate Layouts, Loom, and Store coherently.

## 5. Required delivery order and checkpoints

1. **Section 1 — Workspace foundation:** audit the current app and unwanted design branch; establish the responsive mobile/desktop/tablet shell, icon system, settings, navigation, app-launch contract, and interaction/accessibility baseline. Do not start by redesigning the signed-out welcome page.
2. **Section 2 — Layouts:** audit the existing catalogue and preview flow; define a design-quality rubric; build and verify genuinely distinct, ready-made designs; preserve free website creation/publishing.
3. **Section 3 — Loom:** audit existing Loom docs/code; define spectator vs verified member permissions, evidence criteria, interview workflow, undecided badge colours, safety, and staff auditability before implementing verification.
4. **Section 4 — Store:** define product catalogue, free vs paid products, version licence and one-year update entitlement, upgrades/migrations, white-label/resale rights, and infrastructure-cost disclosures. Integrate Store purchases with workspace app icons and the free Layout Studio.
5. Cross-section integration: test end-to-end identity, workspace context, app installation/launch, tenant isolation, purchase/entitlement, website publish, Loom verification, upgrade/data migration, accessibility, and failure recovery.

Each task must record current phase/status, files changed, actual tests and outcomes, acceptance evidence, unresolved decisions, risks, and whether merge/deployment occurred. Do not claim implementation or verification based on this document alone. Inspect the code first, make narrow changes, run appropriate checks, and do not merge/deploy or make destructive production changes without the required explicit approval.

## 6. Decisions intentionally left open

- Final icon artwork, exact motion language, window/launcher mechanics, and detailed breakpoint specifications.
- The exact number and sequence of Layouts; the design rubric and distinctness gate are mandatory even if the initial catalogue count changes.
- Loom badge colours (blue/green proposed, not decided), precise eligibility criteria, whether purchasing a qualifying LUCIA product is a criterion, and paid verification pricing/terms.
- Store listing rules for third-party publishers, individual product prices, exact licence wording, refunds, support, and product-specific update guarantees.
- Runtime fees for applications that require paid hosting, AI/API usage, storage, email, messaging, or other third-party infrastructure.
- Whether/when to enable reseller marketplace submissions versus offering only first-party LUCIA applications initially.

These decisions must be resolved and documented before they affect customer-facing promises or production enforcement.
