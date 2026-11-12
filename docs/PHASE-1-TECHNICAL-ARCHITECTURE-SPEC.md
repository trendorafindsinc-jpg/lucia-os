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


## 11. Repository investigation — website persistence, publishing, identity and media

This section records additional verified implementation details from the next repository investigation pass. It does not claim that all website routes and call sites have been traced.

### 11.1 Website persistence and publishing evidence

Verified from `src/lib/db/schema.ts` and migrations:

- `website_pages` stores tenant-owned page rows with `title`, `path`, draft `content`, status and a separate `published_content` field.
- `website_structures` stores one serialized `structure` text value per organization/website pair. Migration `0010_website_structures.sql` explicitly describes it as separate from page content, drafts and published snapshots.
- `website_versions` stores durable labeled text snapshots. Migration `0007_website_versions.sql` states that existing drafts and published content are untouched.
- Migration `0004_website_publishing.sql` introduced a published timestamp, page-level published content and public-read policies for published websites/pages.
- Migration `0008_website_page_tenant_integrity.sql` adds a composite foreign key ensuring a page belongs to the same organization as its website. Its preflight deliberately fails rather than silently reassigning/deleting mismatched data.
- Migration `0009_tenant_rls_hardening.sql` and subsequent migrations add database row-level security protections.

**Architecture implication:** the new graph must not be treated as a simple rename of `website_structures`. We still need to inspect the actual serialization formats and all writers/readers. The migration design should map existing page content, structure, versions and published content into a graph-backed working version and a graph-backed immutable published version while retaining recoverable legacy records until acceptance.

### 11.2 Public website request routing

Verified from:

- `src/middleware.ts`
- `src/lib/publishing/host.ts`
- `src/lib/publishing/platform-hosts.ts`
- `src/app/tenant-site-internal/page.tsx`
- `src/app/api/public/v1/content/route.ts`

The middleware distinguishes platform hosts, Lucia subdomains and custom domains. Lucia subdomains are parsed with reserved-slug and hostname validation; platform hosts bypass customer-site rewriting. Customer-domain requests are rewritten to an internal tenant-site route, while private/API/internal paths are blocked from customer domains. The internal root page delegates rendering to `PublicWebsite` from `@/lib/domains/public-site`.

The public content endpoint resolves the Lucia subdomain from the request host and calls `readPublishedContentContract`. It uses a host-varying cache policy.

**Important boundary:** host resolution is routing, not authorization. The middleware comment explicitly says host selection does not grant resource authorization. Public rendering and data access must independently bind the requested hostname to an active domain/site and only expose approved published data.

The implementation of the imported `PublicWebsite` and `readPublishedContentContract` symbols was not located at the first guessed file paths; their actual module paths and complete data access must be traced before the publishing contract is frozen.

### 11.3 Identity, tenant authorization and database scope

Verified from:

- `src/lib/auth/session.ts`
- `src/lib/access/guards.ts`
- `src/lib/access/policy.ts`
- `src/lib/db/tenant-scope.ts`
- `src/lib/tenancy/tenant-context.ts`
- `src/lib/db/client.ts`
- `drizzle/0001_product_sessions.sql`
- `drizzle/0009_tenant_rls_hardening.sql`
- `drizzle/0014_runtime_identity_session_rls.sql`

Findings:

- The local session cookie is HttpOnly-read through the server cookie API; the raw token is SHA-256 hashed before lookup.
- Lucia Core is documented as the identity authority. Lucia OS maintains a local user reference and product-local session after its Core identity exchange.
- Organization membership and product permissions are resolved from Lucia OS database records, not trusted from request payloads.
- Organization roles currently include owner, admin, editor and viewer, with explicit permission sets.
- Platform staff privileges are separately granted and do not derive from organization roles.
- Database helpers set transaction-local user/organization context for RLS. Their comments explicitly warn that context setup is not authentication or authorization by itself.
- The production DB client selects `DATABASE_URL_RUNTIME` and documents the requirement for a dedicated non-BYPASSRLS runtime role.
- Migrations enable and, for selected tables, force row-level security.

**Target requirement:** every graph, media and module operation must resolve a verified actor and active tenant membership, apply the specific permission, and execute all tenant queries in the correctly scoped transaction. New graph tables must receive RLS policies and least-privilege grants as part of their migrations. Public reads need separately designed host/site/published-state policies; tenant RLS must not be bypassed casually.

### 11.4 Existing media implementation

Verified from:

- `src/lib/db/schema.ts`
- `src/lib/media/service.ts`
- `src/lib/media/storage.ts`
- `src/lib/media/multipart-storage.ts`
- `src/lib/media/references.ts`
- `src/app/api/media/[id]/route.ts`
- migrations `0016_customer_media.sql`, `0024_typed_customer_media.sql`, `0025_media_upload_reconciliation.sql`

Findings:

- The current media registry is scoped to an organization **and a website**, rather than a reusable organization-level library.
- The current model supports image, video and PDF document assets.
- Image uploads are compressed to WebP; large video/document uploads use S3-compatible multipart storage with signed part URLs.
- Storage is configured through S3-compatible endpoint/bucket/region/credentials. Original binaries are stored outside PostgreSQL.
- Media references use opaque `media:<uuid>` identifiers; object keys are not intended to be embedded in content.
- Media operations resolve website membership and permissions server-side.
- Existing implementation has a 200-image library item cap in the inspected image upload path, per-website byte quotas, product-level reserved-byte accounting and upload-rate limits. Do not mistake the target aspiration for large reusable libraries as already implemented.
- Media deletion checks draft pages, published page content, website version snapshots, blog content and article revisions, and applies a 30-day published-media grace period.
- Stale multipart uploads have a reconciliation path using database functions and storage cleanup.
- Public media delivery checks publication/access conditions; private media responses use private no-store caching.

**Architecture implication:** preserve the current safe upload/storage and reconciliation mechanisms where compatible, but evolve the ownership model. The target library should have organization-level asset identity, with website/blog/store references represented separately. A migration must retain current website-scoped assets and map them into the organization library without changing their public URLs or deleting binaries. The final design must also decide whether shared assets are organization-owned with optional website-level visibility, or whether a more granular permission model is required.

### 11.5 Blog and content model evidence

Verified from `src/lib/db/schema.ts`, `src/lib/content/article-model.ts`, `src/lib/content/content-library.ts`, and migrations `0017_website_articles.sql`, `0024_typed_customer_media.sql`, `0031_article_content_blocks.sql`.

The schema has both an older serialized `website_content_libraries` record and normalized `website_posts` / `website_post_revisions` tables. The normalized post model supports blog/news kinds, structured content blocks, revision numbers, published snapshots, featured media references, taxonomy/SEO fields and scheduling metadata.

Migration `0017` explicitly says legacy JSON drafts remain intact while normalized posts are introduced. Migration `0031` adds structured content blocks while preserving existing body and published snapshots.

**Architecture implication:** blog content should remain a first-class domain module, not be converted wholesale into generic graph nodes. The website graph should represent where/how blog listings and article templates appear; normalized post records remain the source of truth for editorial content. Existing legacy libraries require a controlled import/compatibility plan.

### 11.6 Migration chain reviewed

The Drizzle journal lists migrations from `0000_tenant_foundation` through `0031_article_content_blocks`. Key reviewed migrations are referenced above. The migration history confirms that the existing product has evolved incrementally and has explicit tenant-integrity, RLS, publication, versioning, media and content compatibility concerns.

The full migration chain and generated SQL still need a systematic audit before any schema migration is proposed. Do not edit historical migrations to retrofit the graph. New schema changes should use forward-only migrations with preflight checks, explicit backfills, validation queries and a documented recovery plan.

### 11.7 Schema observation requiring verification

The current `website_posts` table declaration in `src/lib/db/schema.ts` appears to register `website_posts_legacy_source_uq` twice with the same columns and predicate. This is a source-level duplication observation only. Check generated schema/migration state and database reality before proposing a correction; do not assume a production index is duplicated or remove anything without verification.

### 11.8 Remaining investigation gaps

The following are still not verified:

- Complete writer/reader call graph for `website_pages.content`, `published_content`, `website_structures.structure` and `website_versions.snapshot`.
- Actual current editor UI routes and save/publish request contracts.
- Implementation and all dependencies of `PublicWebsite` and `readPublishedContentContract`.
- Custom-domain ownership verification, DNS/SSL provisioning and operational renewal flow.
- Exact publication/build/release records and rollback mechanics.
- Payment provider adapters, webhook signature verification and subscription entitlement lifecycle.
- Current commerce/product/order implementation, if any.
- Complete migration SQL audit, RLS policy audit and CI/test coverage mapping.

## 12. Updated investigation conclusions

1. The existing backend has substantial reusable foundations: tenancy, session security, RLS, website routing, page publication, version snapshots, object storage, media reconciliation and normalized blog records.
2. The current website editing/persistence model is not yet the agreed canonical graph architecture.
3. The existing media implementation is website-scoped and quota-limited; the agreed target is a centrally managed reusable organization media library.
4. The existing public website delivery path can potentially be adapted to resolve an approved published graph version, but this must be designed only after tracing its complete data access.
5. Existing page, structure, snapshot, media and blog records must be migrated or adapted with explicit validation and recovery. No silent data loss.
6. No application implementation or production operation has been performed as part of this investigation.

**Phase 1 remains IN PROGRESS.**
