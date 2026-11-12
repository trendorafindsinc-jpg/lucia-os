# Lucia OS — Master Architecture Blueprint

> **Document ID:** LUCIA-ARCH-001  
> **Version:** 1.0  
> **Status:** Agreed architectural direction; detailed technical specification pending  
> **Audience:** Codex, engineers, technical reviewers, product owners  
> **Last updated:** 2026-11-12  
> **Repository branch:** `development`

## 1. Purpose and authority

This document records the agreed target architecture for the next generation of Lucia OS. It is the architectural direction Codex and contributors must consult before proposing or implementing foundational changes.

This is a **blueprint**, not yet a complete implementation specification. It establishes system boundaries, invariants, responsibilities and sequencing. Exact database schemas, API contracts, migration mechanics and acceptance criteria must be elaborated in follow-up technical specifications and validated against the current repository.

When existing code conflicts with this target, do not silently force the target onto the current implementation. First inspect the implementation, identify the conflict, document a safe transition, and request approval for consequential changes.

## 2. Product vision

Lucia OS is an integrated website creation and online-business platform. Customers should be able to create, edit, publish and grow professional websites, manage content and media, add blogging and commerce capabilities, connect domains, and manage optional subscriptions without rebuilding their websites.

The experience is designed around customer outcomes rather than developer-oriented configuration.

### Product capabilities

- Create and manage responsive websites.
- Visually inspect and edit website structure.
- Preview real, interactive website output.
- Manage shared content and design data.
- Upload, organise and reuse media from one central library.
- Publish and manage blog content.
- Activate an optional online store.
- Connect custom domains through an optional capability.
- Publish, version and recover websites.
- Migrate supported existing websites into the new architecture.

## 3. Agreed architectural decisions

These decisions are foundational unless explicitly revised by the product owner.

1. **Graph-first:** one canonical, persistent website graph is the source of truth for website structure and composition.
2. **Deterministic-first:** core creation, composition, editing, validation and rendering must work without AI.
3. **Modular monolith initially:** maintain strong internal module boundaries in the existing application before considering independently deployed services.
4. **One source of truth:** legacy website formats may be migration or compatibility inputs, but must not become competing permanent authorities.
5. **New Lucia Studio:** replace the old editor interface with a completely new visual workspace. Do not extend the old editor as the foundation of the new experience.
6. **Selective reuse:** preserve compatible backend services and infrastructure; replace or adapt incompatible parts behind explicit contracts.
7. **Media is a platform capability:** one central Lucia Media Library is shared by Studio, Blog, Store and deterministic composition.
8. **Optional commerce and domain capabilities:** customers activate these through Lucia Store; backend entitlements enforce access.
9. **Data preservation:** subscription expiration or migration must not silently destroy customer data.
10. **No implementation is authorised by this document alone:** follow explicit task scope and approval from the product owner.

## 4. Target architecture at a glance

The major systems are:

- **Lucia Studio:** new visual workspace, graph canvas, inspector, preview and publishing controls.
- **Lucia Graph Engine:** canonical graph persistence, validation, relationships, operations and versions.
- **Lucia Design Intelligence:** design tokens, component/section recipes, page compositions and industry recipes.
- **Lucia Composition Engine:** deterministic translation of requirements into a validated website graph.
- **Lucia Rendering Engine:** responsive and interactive website output from the canonical graph.
- **Lucia Validation Engine:** structural, content, design, technical and accessibility checks.
- **Lucia Media Engine:** central asset registry, uploads, object storage integration, processing and delivery.
- **Lucia Blog Engine:** posts, drafts, categories, tags, authors, revisions, SEO and publishing.
- **Lucia Commerce Engine:** products, variants, inventory, carts, checkout, payments, orders and customers.
- **Lucia Subscription Engine / Lucia Store:** plans, billing lifecycle, payment verification and entitlements.
- **Lucia Domain Engine:** domain ownership verification, DNS guidance, SSL lifecycle, routing and entitlement checks.
- **Lucia Publishing Engine:** validated website versions, builds, deployment, hosting and rollback.
- **Lucia Migration Engine:** extraction, conversion, validation and controlled activation of existing websites.
- **Identity, Security and Administration:** authentication, tenant isolation, permissions, auditability and platform operations.

These are logical modules. They do not imply separate deployables or microservices in the initial architecture.

## 5. Lucia Studio — new user experience

### 5.1 Workspace entry

The primary workspace opens directly into a full visual node canvas. The canvas represents the website graph; it is not a diagram-only feature and is not the website layout itself.

For a new project, the canvas presents a clear starting point for describing the desired website. Lucia then uses deterministic requirements processing and design recipes to construct an initial graph.

### 5.2 Canvas behaviour

- Lucia automatically creates and organises nodes.
- Users can select, inspect and rearrange nodes.
- Users can lock canvas positions and navigate relationships.
- Canvas layout is persisted independently of website layout.
- Moving a canvas node must never alter the published website's layout.
- Graph organisation should be automatic by default while preserving user-controlled positions where appropriate.

### 5.3 Contextual inspector

Selecting a node opens an inspector scoped to that object. Controls depend on node type. For example, a hero section exposes its content, design and layout settings; an image exposes its asset reference, crop and accessibility metadata; a page exposes page-level settings and SEO.

A local edit must not unexpectedly modify unrelated objects. Shared changes must be explicit and traceable.

### 5.4 Preview

Preview must render the actual website from the canonical graph, not a screenshot or a visualisation of the canvas. It must support desktop, tablet and mobile modes, navigation and supported interactions.

## 6. Lucia Graph Engine

### 6.1 Responsibility

The Graph Engine owns the canonical website structure and its relationships. Other modules must use its contracts rather than inventing parallel website representations.

### 6.2 Initial node families

- Website
- Page
- Section
- Component
- Design / design-token reference
- Data / shared-data reference
- Interaction
- Responsive configuration
- Media reference

Node families are conceptual at this stage. Exact discriminated unions, schemas and versioning rules belong in the Graph Engine technical specification.

### 6.3 Relationships and graph invariants

Edges represent typed relationships, such as page containment, section composition, component nesting, data binding, design-token usage, media usage and interaction dependencies.

The detailed edge catalogue must define allowed source and target node types, cardinality, ownership, cycle rules and deletion behaviour.

Required invariants:

- Every node has a stable identity and belongs to a website/tenant scope.
- Every edge references valid nodes in an allowed scope.
- Node properties are validated against a versioned schema.
- Graph mutations are transactional.
- Invalid mutations cannot leave partial graph state.
- Shared resources are referenced by stable IDs.
- Published versions are immutable snapshots or otherwise reproducibly addressable.
- Undo/redo is based on auditable operations or reliable version restoration.
- Canvas coordinates are stored separately from website layout properties.

### 6.4 Candidate graph operations

- `CREATE_NODE`
- `UPDATE_NODE`
- `DELETE_NODE`
- `CONNECT_NODES`
- `DISCONNECT_NODES`
- `MOVE_CANVAS_NODE`
- `RESTORE_VERSION`

Each operation must validate permissions and constraints, determine affected dependencies, apply atomically, record history and notify the preview/rendering path as appropriate.

### 6.5 Persistence direction

Use PostgreSQL for identities, ownership, relationships, indexes, version metadata and transactional integrity. Use JSONB for flexible node properties only when protected by versioned runtime schemas.

Candidate logical entities include:

- `websites`
- `website_nodes`
- `website_edges`
- `website_versions`
- `graph_operations`
- `design_recipes`
- `node_constraints`

These are candidate names, not approved migration/table definitions. Inspect current Drizzle conventions and data before specifying actual migrations. Do not make one unvalidated giant JSON document the permanent graph authority.

## 7. Design Intelligence

Design Intelligence provides reusable, versioned design knowledge to the composition and rendering systems.

### Layers

1. **Foundations:** typography, colour, spacing, borders, shadows, breakpoints and design tokens.
2. **Component recipes:** buttons, cards, navigation, forms, headers, footers and other reusable components.
3. **Section recipes:** hero, features, testimonials, pricing, gallery, contact and similar sections.
4. **Page compositions:** home, about, services, contact, blog, product and landing pages.
5. **Industry recipes:** patterns tailored to supported business categories.

A recipe should declare a stable ID, version, supported node types, compatibility constraints, required tokens, responsive rules, accessibility expectations, validation rules and preview metadata.

Do not hardcode all design intelligence into individual websites or UI components.

## 8. Deterministic Composition Engine

The Composition Engine constructs a website without requiring AI.

### Target pipeline

1. Receive the customer's website requirements.
2. Classify website type and industry using deterministic rules.
3. Identify requested pages, features and constraints.
4. Identify missing essential information.
5. Ask focused questions or apply clearly labelled defaults.
6. Never fabricate customer facts, contact details, addresses, testimonials, credentials or business claims.
7. Select compatible design recipes.
8. Compose pages, sections and components.
9. Create graph nodes and typed relationships.
10. Resolve shared data and eligible media references.
11. Validate the resulting graph.
12. Send the graph to the rendering/preview pipeline.

The architecture may leave room for an optional future AI adapter, but AI must not be required for core functionality and must not silently rewrite unrelated parts of a site.

## 9. Rendering Engine

The Rendering Engine turns the canonical graph into functional website output.

Responsibilities:

- Resolve graph nodes and relationships.
- Resolve shared data references and design tokens.
- Render supported components and sections.
- Resolve media references.
- Apply responsive rules.
- Render supported interactions.
- Produce accessible output.
- Support preview and published output.

Preview and production rendering must use the same canonical graph model and compatible rendering contracts. They may differ in environment/configuration, but must not drift into separate sources of truth.

## 10. Validation Engine

Validation should be deterministic, explainable and navigable from each issue to the exact affected graph node.

### Validation categories

- **Structural:** missing pages, invalid node properties, broken relationships and missing required components.
- **Content:** placeholders, empty headings, missing business information and missing image descriptions.
- **Design:** inconsistent tokens, incompatible recipes and responsive problems.
- **Technical:** broken links, invalid media references, SEO configuration and unsupported features.
- **Accessibility:** missing alternative text, inaccessible controls, heading structure and other applicable checks.

Each finding should include severity, stable issue code, explanation, affected node/resource ID and a recommended remediation where possible.

## 11. Lucia Media Engine — central Media Library

### 11.1 Principle

**Upload once. Manage centrally. Reuse anywhere.**

The Media Engine is a core Lucia capability, independent of the website editor, Blog and Store subscriptions.

### 11.2 Consumers

- Lucia Studio: images, backgrounds, banners and video.
- Lucia Blog: featured images, inline media and galleries.
- Lucia Store: product photos, videos and promotions.
- Composition Engine: selecting eligible assets for generated website sections.
- Other future Lucia modules through stable media contracts.

Provide both a central Media Library management experience and an in-context media picker.

### 11.3 Capabilities

- Individual and bulk uploads.
- Large and resumable uploads.
- Folders and collections.
- Search by filename, tags, type and supported metadata.
- Image and video previews.
- Crop, resize and reposition workflows.
- Optimised responsive derivatives.
- Video processing and supported derivatives.
- Alt text, captions, descriptions and attribution.
- Asset version/history where appropriate.
- Usage/reference tracking.
- Safe deletion, recovery and lifecycle controls.
- Pagination, filtering and sorting for large libraries.

### 11.4 Storage and identity

- Store original binary assets and generated derivatives in object storage, not PostgreSQL.
- Store metadata, tenant ownership, permissions, processing state and relationships in PostgreSQL.
- Assign each asset a stable ID.
- Website graph nodes, blog content and products reference asset IDs; they must not create duplicate originals merely to reuse an asset.
- Use signed/resumable upload flows where appropriate.
- Validate actual file content, not just filename or claimed MIME type.
- Apply malware/security scanning appropriate to supported formats.
- Enforce tenant isolation and authorisation at every access path.
- Check references and retention rules before permanent deletion.

Do not promise unlimited physical storage merely because there is no arbitrary small asset-count cap. Storage and bandwidth limits/pricing must be transparent, and subscription lapse must not silently delete user assets.

Only select Lucia-owned, customer-owned or otherwise explicitly licensed assets for commercial website composition. Do not assume arbitrary internet imagery is licensed.

## 12. Lucia Blog Engine

Blogging is a first-class module within a Lucia website.

Expected capabilities:

- Posts and drafts.
- Publishing and scheduling where supported.
- Categories and tags.
- Authors and publication metadata.
- Featured images and inline media.
- Media Library integration.
- Revisions/history.
- SEO metadata.
- Blog listing, detail and archive rendering.

Blog content references central media asset IDs.

## 13. Lucia Commerce Engine

Commerce is an optional capability activated through Lucia Store. It is part of the customer's existing website, not a separate website-builder product.

Expected capabilities:

- Product catalogue.
- Product categories/collections.
- Variants and SKUs.
- Prices and currencies.
- Discounts.
- Inventory.
- Product images and videos via Media Engine.
- Cart and checkout.
- Payment integration.
- Orders and customers.
- Shipping configuration and order management.
- Individual product entry and bulk CSV import.

Product data must be independent of presentation. A price or stock update must resolve consistently wherever that product is displayed. Adding commerce later must not require rebuilding or migrating the website graph.

## 14. Subscription Engine and Lucia Store

Lucia Store is the in-product marketplace/upgrade centre for optional capabilities, initially including online store and custom-domain connection.

### Entitlement lifecycle

1. Customer reviews capability, price, billing period, limits and terms.
2. Customer completes checkout with a supported payment provider.
3. Server verifies the payment/provider event.
4. Subscription state is persisted and reconciled.
5. The entitlement becomes active only after trusted server-side verification.
6. Relevant UI and backend operations become available.

Entitlement checks must be enforced by backend services. Hiding or disabling UI controls is not sufficient security.

Support renewal, upgrade, downgrade, cancellation, expiration, failed payments, payment history and clear access states. Define grace periods and post-expiry behaviour in the billing specification.

Never silently delete products, orders, customer records, media or other customer data when an entitlement expires. Restrict relevant operations according to a clearly communicated policy while preserving data and recovery options.

## 15. Domain Engine

Responsibilities:

- Domain-to-website mapping.
- Domain configuration and DNS guidance.
- Ownership verification.
- Connection status and lifecycle.
- SSL provisioning/renewal status.
- Routing configuration.
- Subscription entitlement checks.

Domain registration and Lucia's domain-connection subscription are distinct. A customer may own a domain independently and subscribe to Lucia for connection/management capability.

## 16. Publishing Engine

Publishing turns an approved, validated graph version into a live website.

Responsibilities:

- Build and publish.
- Hosting and routing configuration.
- Deployment/version records.
- Domain integration.
- Publishing status and diagnostics.
- Rollback to a known-good version.
- Runtime monitoring.

Customers must be able to edit an unpublished working version without unexpectedly changing the currently live website. Publish from an explicit, validated version.

## 17. Migration Engine and legacy transition

Existing websites must be migrated through controlled adapters rather than by abruptly replacing live data.

### Migration pipeline

1. Inspect the source website and its representation.
2. Extract pages, content, navigation, media references, SEO and supported configuration.
3. Identify integrations and unsupported features.
4. Convert supported structures into canonical graph nodes and edges.
5. Resolve shared data and media references.
6. Validate the resulting graph.
7. Present migration issues and required user decisions.
8. Back up source state and provide recovery.
9. Activate only after acceptance.

Preserve content, URLs, media, business information, navigation, SEO, forms/integrations and publishing configuration where supported. Report unsupported features; never silently discard them.

Keep currently published websites operating during parallel development, migration testing and acceptance. The old editor interface is ultimately retired, but compatible backend infrastructure may remain behind the new contracts.

## 18. Data, infrastructure and technology direction

### Current technology foundation identified in the repository audit

- Next.js
- React
- TypeScript
- PostgreSQL
- Drizzle ORM
- Zod
- Existing authentication infrastructure
- Existing payment integrations
- Object storage
- Vitest

These are a starting point, not a blanket instruction to retain every implementation. Verify actual branch state and compatibility before reuse.

### Storage responsibilities

- **PostgreSQL:** identities, structured records, relationships, metadata, entitlements, transactions and indexes.
- **Object storage:** original media, generated derivatives and other supported binary objects.
- **Background workers/jobs:** media processing, video processing, publishing and migration tasks.
- **CDN/delivery:** public website assets and authorised optimised media.

Keep module boundaries clear inside the modular monolith. Introduce separate deployables only when scale, reliability or operational needs justify them.

## 19. Security and operational requirements

- Tenant isolation for every customer-owned resource.
- Server-side authorisation for graph, media, commerce, billing and domain operations.
- Validated inputs and versioned schemas.
- Safe file upload and processing.
- Payment webhook verification, idempotency and reconciliation.
- Audit trails for consequential operations.
- Transaction safety and recoverable migrations.
- Backups, restore procedures and publishing rollback.
- Monitoring, structured logs and actionable diagnostics.
- No secrets in source control or client bundles.

## 20. Development roadmap

Implementation should proceed in dependency order. The phases below are a target sequence, not permission to execute all phases automatically.

### Phase 1 — Technical Architecture Specification
- Finalise graph schema and node/edge contracts.
- Define module boundaries and dependency direction.
- Define API/event contracts.
- Define tenancy, permissions and transaction rules.
- Define migration and compatibility strategy.
- Define acceptance tests and non-functional requirements.

### Phase 2 — Graph Engine
- Graph persistence and schema validation.
- Typed relationships and constraints.
- Transactional graph operations.
- Versioning, snapshots and undo/redo.
- Separate canvas-position storage.

### Phase 3 — Design Intelligence
- Token system.
- Component and section recipes.
- Page compositions.
- Industry recipes.
- Recipe compatibility and versioning.

### Phase 4 — Composition and Rendering
- Deterministic requirements processing.
- Graph composition.
- Graph-based rendering.
- Responsive behaviour.
- Interactive preview.

### Phase 5 — New Lucia Studio
- Node canvas and automatic organisation.
- Contextual inspector.
- Preview controls.
- Validation navigation.
- History and editing workflows.

### Phase 6 — Platform systems
- Media Engine.
- Blog Engine.
- Commerce Engine.
- Subscription and entitlement services.
- Domain lifecycle services.

### Phase 7 — Migration and Publishing
- Migration adapters.
- Validation and acceptance.
- Graph-version-based publishing.
- Rollback and recovery.
- Existing live-site compatibility.

### Phase 8 — Acceptance and replacement
- Functional, security, accessibility and performance testing.
- Customer workflow acceptance.
- Migration acceptance.
- Permanent retirement of old editor interface.
- New Lucia Studio launch.

## 21. Non-negotiable invariants

1. One canonical website graph.
2. No competing permanent website representations.
3. No AI dependency for core functionality.
4. Canvas coordinates never control website layout.
5. Shared data is stored once and referenced by stable IDs.
6. Media originals are stored once and reused by stable asset IDs.
7. Backend services enforce subscription entitlements.
8. Subscription lapse does not silently destroy customer data.
9. Preview and published output share the canonical graph model.
10. Existing infrastructure is reused only after compatibility review.
11. The old editor UI is replaced, not extended as the new foundation.
12. Graph mutations are validated and transactional.
13. Customer data is tenant-isolated, backed up and recoverable.
14. Migration reports unsupported features and never silently discards data.
15. Composition never invents customer business facts.
16. Commerce can be added to an existing website without rebuilding it.

## 22. Codex execution guidance

When working in this repository:

1. Read this blueprint and the root `AGENTS.md` before making architecture-related changes.
2. Inspect the current branch, working tree, package scripts, database schema, relevant modules and tests before proposing implementation.
3. Treat the blueprint as target direction, not evidence that a capability already exists.
4. Distinguish **current state**, **target state**, **proposed change** and **verified behaviour** in reports.
5. Do not assume audit findings from an older commit still describe the current branch.
6. Do not implement the entire roadmap in one task. Work in small, reviewable, dependency-ordered increments.
7. Do not introduce AI as a required dependency.
8. Do not create a second website source of truth or a parallel graph model.
9. Do not replace or delete legacy data paths until a tested migration and rollback plan exists.
10. Do not remove or alter production behaviour, database data, payment flows, domains or live websites without explicit task approval.
11. Do not change the production branch as part of ordinary architecture work. Use the designated development workflow.
12. Before a schema change, inspect existing Drizzle conventions, data, migrations and rollback constraints.
13. Add tests for invariants, tenant isolation, graph operations, entitlement enforcement and migration safety as relevant.
14. Run the relevant checks and report exact commands/results. Never claim tests passed unless they were run.
15. If an implementation decision is ambiguous or conflicts with product decisions, stop and ask rather than inventing policy.
16. A request to analyse or plan is not authorisation to modify code. A request to document is not authorisation to implement the documented roadmap.

## 23. Next required document

The next architecture artefact should be the **Lucia OS Technical Architecture Specification (TAS)**, beginning with the Graph Engine.

It must define, with implementation-level precision:

- Canonical graph schema and schema versioning.
- Node type catalogue and property contracts.
- Edge type catalogue, cardinality and cycle rules.
- Graph mutation transaction semantics.
- Version snapshots, undo/redo and publication semantics.
- Tenant ownership and permission enforcement.
- Canvas coordinate model independent of website layout.
- Module interfaces and dependency direction.
- API/event contracts.
- Migration and compatibility strategy.
- Test matrix and acceptance criteria.

**Do not treat this blueprint as a substitute for that specification.**
