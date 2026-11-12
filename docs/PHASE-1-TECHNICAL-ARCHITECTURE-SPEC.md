# Lucia OS — Phase 1 Technical Architecture Specification

> **Document ID:** LUCIA-PHASE-1-TAS-001  
> **Version:** 0.1 (discovery baseline and architecture draft)  
> **Status:** In progress — not approved as an implementation contract  
> **Date:** 2026-11-12  
> **Branch inspected:** `development`  
> **Parent blueprint:** `docs/LUCIA-OS-MASTER-ARCHITECTURE.md`

## 1. Purpose

This document begins Phase 1 of the Lucia OS roadmap. It translates the approved product blueprint into an implementation-oriented technical specification.

This first revision records facts verified in repository files, the architectural direction already agreed with the product owner, and questions that must be resolved before Phase 1 can be marked complete.

**This document does not authorize application-code changes, database migrations, production changes, or deletion of legacy systems.** Existing implementation details must be inspected before implementation contracts are finalized.

## 2. Confirmed repository baseline

The following facts were verified on the `development` branch by reading the repository files listed in Section 3.

### 2.1 Application foundation

- Next.js: `^15.5.6`
- React / React DOM: `^19.1.1`
- TypeScript: `^5.9.3`
- PostgreSQL client: `postgres ^3.4.7`
- Drizzle ORM: `^0.44.5`
- Drizzle Kit: `^0.31.5`
- Zod: `^4.1.12`
- Vitest: `^3.2.4`
- Node.js engine requirement: `>=20.9.0`

Existing package scripts include development, build, lint, typecheck, Vitest, Drizzle generation/migration/check, and routing/settings HTTP checks.

### 2.2 Identity and tenancy

The current Drizzle schema defines:

- `app_users`, which stores a stable `core_subject_id`; its comments explicitly state that Lucia Core remains the identity authority.
- `organizations`.
- `organization_memberships`, including role and status.
- `app_sessions`.
- Platform staff grants and platform audit events.

The existing data model is already organization/tenant oriented. New platform records must retain explicit ownership and server-side authorization boundaries. Do not assume that a user-supplied organization or website ID is authorized.

### 2.3 Existing website data model

The schema currently includes:

- `websites`
- `website_pages`
- `website_domains`
- `website_versions`
- `website_structures`
- `website_content_libraries`
- `website_seo_settings`

The current model therefore contains several website-related persistence concepts. Their read/write paths, ownership semantics, snapshot formats, and relationships must be traced before specifying the graph cutover.

**Architecture requirement:** the target system has one canonical website graph. Existing structures may be retained temporarily as compatibility or migration inputs, but must not become a second permanent authority.

### 2.4 Existing media model

The current schema includes:

- `website_media`, with organization and website ownership, object key, media metadata, dimensions, checksum/ETag/upload fields, status, and creator.
- `media_storage_budget`.
- `website_media_limits`.

The existing media row is website-scoped. The agreed target is a central Lucia Media Library in which an organization can manage reusable assets and reference them from websites, blog posts, store products and other modules.

The transition must preserve existing object keys and asset identity where possible, avoid copying original binaries unnecessarily, and introduce explicit asset usage/reference tracking. Binary objects remain in object storage; PostgreSQL stores metadata and relationships.

### 2.5 Existing blog and billing foundations

The schema includes structured `website_posts` and `website_post_revisions`, including content blocks, publication snapshots, scheduling fields, SEO fields and featured-media references.

Billing-related tables include `billing_invoices`, `billing_payment_attempts`, and `billing_webhook_events`. These should be inspected and reused where compatible rather than replaced without evidence.

### 2.6 Existing routing evidence

The inspected `src/middleware.ts` contains host-based routing for platform hosts, Lucia subdomains and customer custom domains. It also restricts private/API/internal paths on customer domains.

This is evidence of existing publishing/routing infrastructure, not proof that all target publishing requirements are complete.

## 3. Files inspected in this baseline

- `AGENTS.md`
- `docs/LUCIA-OS-MASTER-ARCHITECTURE.md`
- `package.json`
- `drizzle.config.ts`
- `tsconfig.json`
- `src/lib/db/schema.ts`
- `src/middleware.ts`
- `src/app/layout.tsx`
- `src/app/page.tsx`

The root `README.md`, `src/lib/db/index.ts`, and root `middleware.ts` were not found at the inspected paths. Their absence must not be interpreted as absence of equivalent functionality elsewhere.

This is a focused first pass, not yet a complete repository audit. Routes, services, storage adapters, authentication flows, migrations, tests, deployment configuration and all current read/write paths still need inspection.

## 4. Agreed target architecture constraints

These constraints are carried forward from the approved master blueprint:

1. Lucia Studio is a new interface; the old editor is not its foundation.
2. Compatible backend infrastructure should be preserved and adapted where appropriate.
3. A persistent typed website graph is the single canonical source of truth for website structure and composition.
4. Graph node identity and relationships are distinct from canvas coordinates.
5. Canvas coordinates must never change the published website layout.
6. Core composition, editing, validation and rendering are deterministic and do not require AI.
7. Start as a modular monolith with clear internal module boundaries.
8. Preview and published output derive from the same approved graph model/version.
9. Media is a shared platform capability; asset binaries live in object storage and metadata/references live in PostgreSQL.
10. Blog and commerce data remain structured domain data and reference shared media assets.
11. Optional capabilities are enforced by server-side entitlements, not merely hidden UI.
12. Existing customer data and live websites must be protected throughout migration and replacement.
13. No destructive production, billing, domain, deployment or customer-data operation without explicit approval.

## 5. Proposed module boundaries

The following is the target modular-monolith boundary map. Exact source directories and API shapes are pending current-code inspection.

| Module | Owns | Must not own |
|---|---|---|
| Identity & Access | Core identity integration, sessions, membership and authorization | Website content authority |
| Organization / Tenant | Organization lifecycle and tenant context | Client-trusted authorization |
| Website Graph | Nodes, edges, constraints, graph operations and graph versions | Canvas-only presentation state mixed into site layout |
| Design Intelligence | Versioned tokens, recipes, compositions and compatibility rules | Customer-specific graph persistence |
| Composition | Deterministic requirement-to-graph construction | Independent website content store |
| Rendering | Graph-to-responsive-output resolution | Separate preview-only source of truth |
| Validation | Structural, content, technical, design and accessibility diagnostics | Silent destructive correction |
| Studio | Canvas, inspector, preview controls and user interaction | Canonical website data outside graph APIs |
| Media | Asset registry, upload lifecycle, processing, delivery and usage references | Binary object storage inside PostgreSQL |
| Blog | Posts, taxonomies, authors, revisions and publication state | Duplicated media binaries |
| Commerce | Products, variants, inventory, cart, orders and checkout | Presentation-specific product copies |
| Subscription / Entitlements | Plans, subscriptions, provider reconciliation and capability grants | Client-only feature enforcement |
| Domains & Publishing | Domain lifecycle, builds, releases, routing and rollback | Unversioned live edits |
| Migration | Source inspection, mapping, conversion, validation and recovery | Silent deletion of unsupported source data |

Modules should communicate through explicit application-service contracts and domain events where asynchronous work is justified. Do not introduce microservices solely to mirror this module list.

## 6. Graph Engine: preliminary data contract

This section records the minimum logical model. Exact SQL columns, constraints, indexes, JSON schemas and API payloads remain pending review.

### 6.1 Core records

- **Website:** tenant-owned site identity and lifecycle.
- **WebsiteNode:** stable node ID, website ID, node type, schema version, validated properties, timestamps and lifecycle state.
- **WebsiteEdge:** stable relationship ID, website ID, source node, target node, typed relationship and validated metadata.
- **WebsiteVersion:** immutable snapshot/reference to a specific graph state, created by an actor with a reason/label.
- **GraphOperation:** auditable operation record with actor, operation type, target, input, outcome and version linkage.
- **NodeConstraint / Recipe metadata:** versioned rules used to validate graph structure and compatible compositions.
- **CanvasPosition:** editor-only x/y/position/lock metadata, logically and operationally separate from website layout properties. It may be stored as graph-editor metadata or a dedicated table; final choice depends on collaboration and query requirements.

### 6.2 Initial node families

- Website and Page
- Section
- Component
- Design token/reference
- Shared data
- Interaction
- Responsive configuration
- Media reference

Node type definitions must be versioned and validated. Unknown node types must be handled safely and must not be silently discarded during import or migration.

### 6.3 Typed relationship examples

- website contains page
- page contains section
- section contains component
- node references design token
- node references shared data
- node references media asset
- node configures interaction
- node has responsive configuration

Allowed source/target combinations and cardinality must be explicit per relationship type.

### 6.4 Required graph operations

- `CREATE_NODE`
- `UPDATE_NODE`
- `DELETE_NODE`
- `CONNECT_NODES`
- `DISCONNECT_NODES`
- `MOVE_CANVAS_NODE`
- `RESTORE_VERSION`

Every mutation must authenticate the actor, authorize tenant and website access, validate schemas and graph constraints, calculate affected dependencies, execute transactionally, record history, and trigger only the necessary preview/render invalidation.

A canvas-only move must not create a website layout change or alter published output.

### 6.5 Persistence direction

Use relational PostgreSQL tables for identities, ownership, relationships, versions and queryable indexes. Use JSONB for flexible node properties only when protected by explicit versioned schemas and validation.

Do not use one giant JSON document as the permanent graph source of truth. Immutable snapshots may be used for recovery, comparison and publication, but the normalized graph records remain canonical.

## 7. Cross-cutting contracts to finalize

Before Phase 1 is complete, the technical specification must define:

- Tenant context resolution and authorization checks.
- Stable ID formats and tenant-scoped foreign-key strategy.
- Node type registry and schema versioning.
- Edge type registry, cardinality and cycle/containment rules.
- Transaction boundaries and concurrency/conflict handling.
- Graph operation idempotency and audit history.
- Version snapshot and restore semantics.
- Draft versus published graph/version semantics.
- Preview/render invalidation and cache strategy.
- Domain events and background job reliability.
- Media ownership, reuse, reference counting and deletion lifecycle.
- Subscription entitlement evaluation and webhook idempotency.
- Migration checkpoints, dry-run, rollback and recovery.
- API error format, pagination, filtering and rate limits.
- Observability, privacy-safe logging and audit retention.

## 8. Open questions and required repository investigation

These are investigation tasks, not assumptions:

1. Trace every read and write path for `website_pages`, `website_structures`, `website_versions` and any JSON snapshot format.
2. Identify the actual current editor routes/components and determine which backend services they call.
3. Identify the object-storage provider, upload protocol, media processing pipeline and public/private delivery rules.
4. Trace Core authentication/session verification and tenant membership authorization.
5. Inspect all Drizzle migrations and compare them with the current schema.
6. Trace blog publishing, featured-media references and public rendering.
7. Trace payment providers, webhook signature verification, reconciliation and entitlement state.
8. Trace custom-domain verification, SSL lifecycle, build/publish and rollback paths.
9. Identify current background-job/queue mechanisms, if any.
10. Inspect tests and identify existing coverage and missing critical scenarios.
11. Confirm repository branch head and working-tree/CI state through the connected development workflow before implementation planning.

### Schema review note

The inspected `website_posts` declaration appears to define the same `website_posts_legacy_source_uq` unique index twice. Verify whether this is present in the committed file and generated migrations, and determine whether it is harmless duplication or a migration/schema issue before changing anything.

## 9. Phase 1 completion gate

Phase 1 is complete only when all of the following are delivered and reviewed:

- Current-state inventory with evidence and known gaps.
- Target module and dependency map.
- Approved canonical graph logical model and versioning rules.
- Approved database schema proposal and migration plan.
- API/application-service and domain-event contracts.
- Tenant security and authorization model.
- Media, blog, commerce, subscription, domain and publishing integration contracts.
- Legacy compatibility and data-recovery strategy.
- Test strategy and measurable acceptance criteria for all eight phases.
- Explicit record of unresolved decisions and product-owner approvals.

No implementation phase should rely on unresolved foundational assumptions.

## 10. Immediate next work

Continue repository discovery before freezing the schema or API contracts. Prioritize tracing the existing website persistence and publishing paths, then identity/tenant authorization and media storage. Update this document with verified findings, file references, diagrams and proposed contracts.

**Phase status remains: IN PROGRESS.**
