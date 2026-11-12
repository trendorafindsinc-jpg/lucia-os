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


## 13. Investigation task 3 — editor save, composition, preview and publishing call paths

**Status:** Repository source inspection completed for the primary editor and publishing path. This is a source-level trace on the `development` branch; it is not a live production test. No application code, database, deployment or customer data was changed.

### 13.1 Current editor entry points and composition layers

Verified files:
- `src/app/editor/page.tsx`
- `src/components/editor/visual-site-editor.tsx`
- `src/components/editor/composition-studio.tsx`
- `src/components/editor/website-first-premium-editor.tsx`
- `src/components/editor/visual-experience-controls.tsx`
- `src/lib/editor/site-draft.ts`
- `src/lib/layout-blueprint/website-definition.ts`
- `src/lib/layout-blueprint/premium-composition.ts`

The `/editor` route renders `VisualSiteEditor`, but that export is an alias for `CompositionStudio`. This matters: the primary editor is not the large legacy component in isolation. `CompositionStudio` loads a saved website by `websiteId` from `/api/websites/:websiteId/draft`, validates it with `websiteDefinitionSchema`, and branches by definition type:
- Premium definitions use `WebsiteFirstPremiumEditor` by default.
- A `studio=classic` query can select a classic composition editor path.
- Non-premium definitions use the legacy visual editor.
- With no `websiteId`, it falls back to a template/demo-oriented legacy editor experience.

The premium editor models edits as typed `PremiumEdit` operations, applies them to a validated in-memory `PremiumLayout`, and keeps a bounded local edit queue. The component also supports workspace-tab recovery snapshots and a save/discard adapter. The old editor UI is therefore a collection of different experiences, not one uniform editor contract.

### 13.2 Draft loading and saving contract

Verified primary endpoint: `src/app/api/websites/[websiteId]/draft/route.ts`.

**GET**
1. Requires a current LUCIA ID session.
2. Validates the website ID as UUID.
3. Resolves an organization where the user has `website.read`.
4. Rechecks active membership and permission in a transaction, sets user/organization transaction-local RLS context, and verifies the organization is active.
5. Loads website pages and interprets the root page (`/`) `content` as a structured `WebsiteDefinition` only if JSON parsing and Zod validation both succeed.
6. Returns website metadata, the parsed draft or `null`, page count, and a content-derived revision. Sends `Cache-Control: no-store` and an ETag.

Older plain-text page content is deliberately not silently converted into a demo structured draft. An invalid or absent structured root draft is returned as unavailable, and editor UI paths disable unsafe saves or ask for recovery.

**PATCH**
1. Requires session, validates account-context header when present, validates website ID and request origin, and limits body size to 300 KB.
2. Parses the request using `websiteMutationSchema` (supports distinct mutation kinds, including complete draft, composition edits and layout assignment).
3. Requires `website.edit`, active membership and active organization.
4. Requires an `If-Match` draft revision; missing/invalid precondition returns HTTP 428.
5. In one transaction, locks the website row and root page row, compares the current content-derived revision, and returns HTTP 409 on stale edits.
6. Applies the typed mutation to the existing validated definition, validates media ownership, updates website name and root page `content`, then returns the persisted definition and new revision.
7. Invalid mutations/media ownership are rejected; authorization is rechecked within the transaction.

**Important distinction:** the draft endpoint persists the website definition JSON into the root `website_pages.content` field. It does not persist the complete composition as a graph of independently addressable nodes and typed edges. The website-level structure and version endpoints are additional persistence paths, not a canonical graph transaction.

### 13.3 Editor-local recovery versus durable history

The legacy visual editor stores unsaved recovery data in workspace-tab snapshots and protects against overwriting a newer server revision. It loads version checkpoints separately and can restore a checkpoint into the local draft, requiring a subsequent explicit save. The premium composition editor similarly stores a local bounded edit queue tied to the base revision and applies the queue to the in-memory definition before saving.

This provides useful UX safeguards—recovery, dirty state, explicit save, conflict detection and discard—but these are not the same as a server-side graph operation log with durable node-level undo/redo. The current local recovery mechanism should not be mistaken for the target graph history system.

### 13.4 Page structure and preview reconstruction

Verified files:
- `src/lib/site-structure/structure.ts`
- `src/lib/site-structure/layout-adapter.ts`
- `src/lib/layout-blueprint/blueprint.ts`
- `src/components/layout-studio/layout-renderer.tsx`
- `src/components/publishing/publishing-workspace.tsx`

The separate site-structure model defines pages with IDs, titles, slugs and ordered reusable section type names, plus a homepage ID and navigation page IDs. It validates uniqueness, homepage/root slug consistency and navigation references. Helpers add/remove pages, change homepage, toggle navigation and reorder/add section types.

The adapter `siteStructurePageToBlueprint` maps one selected structured page into a data-only `LayoutBlueprint`. It generates section IDs from page/section position, maps known section types to renderer section types, and reuses draft headline/description/button values. This is a conversion layer, not a graph resolver. The editor checkpoint code reads structure, content-library and SEO endpoints separately when assembling a snapshot.

The publishing workspace's private preview flow:
1. Fetches the selected website's saved `/draft` with `cache: no-store`.
2. Checks that returned revision still matches the selected website revision.
3. Validates the returned definition.
4. Builds a preview blueprint and renders it through the shared Loom/Layout renderer inside a private dialog.
5. Explicitly states that preview uses the saved draft, excludes unsaved publishing form details, and does not publish.

The preview is therefore not a full graph-canvas preview. It is a rendering of the saved website definition through the existing renderer. Some editor paths also render local in-memory edits directly, so preview behaviour depends on which editor/workspace path is being used.

### 13.5 Publish request and transaction

Verified files:
- `src/components/publishing/publishing-workspace.tsx`
- `src/lib/publishing/publishing.ts`
- `src/app/api/publishing/websites/route.ts`
- `src/app/api/publishing/publish/route.ts`

The publishing workspace loads websites through `GET /api/publishing/websites`. The endpoint returns only websites in organizations where the user has `website.publish`; it derives headline/description from a valid structured root-page draft and returns a content-derived revision and `draftValid` flag. Invalid or legacy content is not replaced with demo content.

The workspace sends an explicit `save` or `publish` action to `POST /api/publishing/publish`, including website ID, site details, slug, optional custom-domain text, and the selected draft revision in `If-Match`.

The server:
- Enforces request-origin validation, authenticated session and account-context consistency.
- Validates action and payload with Zod.
- Requires `website.edit` for save or `website.publish` for publish.
- Rechecks active membership and active organization within the database transaction.
- Locks the website and page rows, verifies the website slug matches the submitted slug, and compares the current root-page content revision.
- Parses and validates the stored structured website definition; validates media ownership.
- On save, writes the editable root content and website name while leaving existing published snapshots untouched.
- On publish, writes published snapshots, updates website status/time, and activates the exact LUCIA subdomain record in the same transaction. Existing custom-domain request text is not proof of ownership or activation; the endpoint explicitly reports custom-domain activation/DNS/TLS as pending and does not claim to have charged for it.

For premium definitions, publication writes the serialized definition snapshot into each registered page's `published_content`, updates page titles/statuses, and retires page paths no longer present in the definition. For non-premium definitions, the current handler writes the same published snapshot to the existing page rows (and creates a homepage if none exists). The server preserves the editable draft separately from the public snapshot; premium public contact sanitization is applied to the published copy only.

The operation uses a database transaction so page snapshot changes, website publication status and LUCIA subdomain activation commit together. Revision conflicts and invalid drafts return explicit errors; the handler's failure responses state that the previous live version is preserved.

### 13.6 Public website read path

Verified files:
- `src/app/tenant-site-internal/page.tsx`
- `src/lib/domains/public-site.tsx`
- `src/lib/domains/hostname.ts`
- `src/middleware.ts`

Customer host routing rewrites to the internal tenant-site route. The internal route delegates to `PublicWebsite`. The public-site reader obtains the request host, normalizes it, then resolves an exact active `website_domains` record joined to a website whose status is `published`. It then resolves the requested normalized page path under the same organization and website, requires page status `published` and non-empty `published_content`, parses and validates the stored website definition, and converts it to a renderer blueprint. Unknown hosts, paths, inactive domains, unpublished websites or invalid snapshots resolve to not-found.

React request-local caching shares resolution between metadata and page rendering within a request; it is not a cross-tenant global cache. The public content API is a separate host-based path that resolves the LUCIA subdomain and delegates to the published-article content contract.

**Architecture implication:** the existing public read path is already separated from the editor UI and uses an explicit published snapshot. This is a strong compatibility boundary for Lucia Studio replacement. It can potentially be retained while its source of published content changes from page JSON snapshots to an immutable published graph version, provided host-to-tenant resolution, page-path checks, media access and cache isolation remain intact.

### 13.7 Key findings and risks for the target architecture

1. **The old editor UI is replaceable without necessarily replacing public delivery.** Public rendering is behind a server-side read contract and a renderer; the new Studio can become a new client for the same safe save/publish services during a transition.
2. **The draft is currently concentrated in one root-page JSON document.** This is a material mismatch with the canonical graph model. The new graph should not be added as a parallel source of truth while this root JSON silently remains authoritative.
3. **Structure is split across endpoints/tables.** Page/section structure, page content definition, content library, SEO and website snapshots are loaded/saved through different contracts. Phase 1 must define how these are represented as graph references versus domain-owned records.
4. **Blog posts should remain separate editorial entities.** Graph nodes should reference blog listing/article presentation and normalized post records; do not embed all post content in website graph snapshots.
5. **Preview semantics need one explicit contract.** The target Studio preview should render the current working graph (including unsaved valid operations) and clearly distinguish it from the last published immutable version. Current publishing preview is saved-draft-only.
6. **Revision protection is valuable and should be retained.** Existing If-Match/content-derived revision checks and transactional row locks provide a starting point. A graph engine needs equivalent optimistic concurrency at graph/version or operation-batch level.
7. **Publishing is a useful transactional foundation.** Keep the separation between editable draft and public snapshot, atomic activation and exact domain ownership checks. Replace the snapshot source only after the graph version model and migration are proven.
8. **The current editor paths are heterogeneous.** The new Studio should not inherit legacy editor components as its architectural foundation. Build a new interface over stable backend contracts and migrate each supported draft shape deliberately.
9. **Current multi-page publishing needs further edge-case verification.** Confirm path-to-page snapshot semantics, media references, SEO, article rendering, rollback and behavior when the registered page set changes. Source inspection alone does not establish production correctness.
10. **No live preview/publish test was run.** Repository source was inspected; no authenticated browser, staging tenant or production action was exercised.

### 13.8 Updated investigation gaps

Still to investigate:
- Complete migration SQL and RLS policy audit, with tests mapped to security invariants.
- All writers/readers for `website_structures`, `website_versions`, SEO, content library and legacy website content; define compatibility and migration precedence.
- API route tests and integration tests for draft concurrency, publishing transaction rollback, multiple pages, preview, public host routing and media.
- Custom-domain verification, DNS/TLS lifecycle and renewal.
- Deployment/build/release records and operational rollback path.
- Payment provider adapters, webhook verification/idempotency and entitlement lifecycle.
- Commerce/product/order coverage and whether any current implementation exists.
- A data migration inventory and backfill feasibility assessment before choosing exact graph schema.

**Phase 1 remains IN PROGRESS.** The editor save and publishing source trace is complete at the primary route level; it does not complete the overall architecture specification or authorize implementation.


## 14. Investigation task 4 — database migration, RLS and graph-transition audit

**Status:** Source-level review of the complete migration journal (32 entries, `0000`–`0031`), the SQL migration directory, current Drizzle schema, tenant-scope helper and its unit tests. This is not a connection to or inspection of a live database. Actual production catalog state, role ownership, applied migration ledger and customer row counts remain unverified. No SQL was executed against an environment and no application code was changed.

### 14.1 Migration chain inventory

The repository's `drizzle/meta/_journal.json` contains 32 ordered PostgreSQL migration entries, indexed 0 through 31, and the `drizzle/` directory contains matching SQL files. The sequence covers:
- Tenant foundation, sessions, billing ledger and management/support foundations (`0000`–`0003`).
- Website publication, public reads, domains, snapshots and tenant integrity (`0004`–`0008`).
- Tenant RLS hardening, website structure/content/SEO, billing RLS, staff grants and runtime identity/session RLS (`0009`–`0014`).
- Workspace preferences, media, normalized articles, article metadata/scheduling/import/revisions, typed media, upload reconciliation, media authorization, slug redirects and public host access (`0015`–`0031`).

The SQL files are ordered and the journal is aligned by tag. The repository's `drizzle/meta` directory currently exposes only `0016_snapshot.json` and `_journal.json`; no later snapshot files were found in that directory listing. This should be checked against the team's Drizzle Kit generation workflow before generating any new migration. Do not regenerate or rewrite migration history as part of this architecture work.

### 14.2 Tenant and identity security controls observed

The SQL and source establish several useful controls:

1. **Tenant ownership in relational constraints.** Website pages, domains, structures, content libraries, SEO settings, versions, media and normalized posts use organization/website composite foreign keys in the relevant migrations. Migration `0008` replaces the weaker page-to-website relationship with a composite organization-plus-website relationship. Cross-tenant parent-child mismatches are therefore constrained at the database layer.
2. **Transaction-local RLS context.** Policies read `app.current_organization_id` and/or `app.current_user_id`. `src/lib/db/tenant-scope.ts` sets these using parameterized `set_config(..., true)` calls inside a transaction and explicitly documents that these values are not authentication or permission checks.
3. **Application authorization remains required.** Route/service code must resolve the verified session, active organization membership and action-specific permission before setting scope. A caller-supplied organization UUID is only a selector, never proof of access.
4. **Least-privilege runtime intent.** `src/lib/db/client.ts` requires `DATABASE_URL_RUNTIME` in production and documents that it must use a dedicated `NOBYPASSRLS` runtime role. Actual role attributes and table ownership are not available from source inspection.
5. **Forced RLS is used selectively.** The reviewed migrations explicitly use `FORCE ROW LEVEL SECURITY` for billing ledger tables, workspace preferences, website media, website posts, post revisions and article slug redirects. Many other tenant tables use `ENABLE ROW LEVEL SECURITY` without `FORCE`. This is not automatically a defect if the runtime role is neither table owner nor privileged, but ownership and role grants must be verified. `NOBYPASSRLS` alone does not make a table owner subject to ordinary RLS policies; owner/role arrangement is a required production verification.
6. **Public access is deliberately separate.** Published website/page policies expose published snapshots; domain records have an active-host public-read policy. Article public-read policy history shows an important correction: migration `0028` broadened public article reads to published sites without requiring an active domain, and `0029` restored the active-domain binding. The final migration state should be tested, not inferred only from the initial policy.
7. **Privileged functions are constrained in SQL.** Reviewed `SECURITY DEFINER` functions set a fixed search path and revoke default PUBLIC execution before granting the runtime role explicit execution. Their owners, grants and runtime behavior still require catalog-level verification.

### 14.3 RLS coverage and verification gaps

The current Drizzle schema declares 24 tables. The migration chain adds the article slug redirect table as an additional table. RLS coverage is present across the main identity, tenant, website, billing, support, audit, version, structure, SEO/content, media and editorial data domains, but enforcement modes and access paths are not uniform.

Specific follow-up checks:
- `media_storage_budget` and `website_media_limits` are granted to the runtime role in `0016`, but that migration enables/forces RLS on `website_media`, not those two supporting tables. The budget is product-wide and limits are website-scoped; inspect every query path and decide whether explicit server-only access, narrowly scoped functions, or RLS is the right control.
- `website_domains`, `website_versions`, `website_structures`, `website_content_libraries`, `website_seo_settings`, `websites`, `website_pages`, organizations and memberships are not all marked FORCE RLS in the reviewed migrations. Verify their owner/runtime role relationship.
- Public read policies for published pages/sites and articles must be exercised with anonymous and cross-tenant requests, including inactive organization, inactive host, removed domain, unpublished page, invalid snapshot and hostname reassignment cases.
- The public media function uses a SECURITY DEFINER read and checks for a published website/page whose snapshot references the media ID. Confirm function owner, execute grants, exact reference serialization, and that unpublished or cross-tenant media cannot be resolved.
- Staff RLS context is a database visibility mechanism, not proof of a staff grant. Confirm every staff entry point checks active grant, expiry, role and permission before setting `app.is_platform_staff`.
- The application tenant-scope test (`src/lib/db/tenant-scope.test.ts`) verifies UUID normalization, transaction-local context setup and operation ordering. It does not execute PostgreSQL policies or prove cross-tenant isolation. No database-backed RLS integration test was confirmed in this focused review.

### 14.4 Data integrity and migration safety observations

- `0008_website_page_tenant_integrity.sql` introduces the composite page-to-website tenant relationship and removes the old single-column FK only after the new relationship is added. The migration's preflight behavior should be retained as a model: fail clearly on inconsistent legacy rows rather than silently reassigning or deleting them.
- Most later migrations are additive: new tables, columns, constraints, indexes, functions or policy replacements. Some migrations intentionally replace policies/functions. Treat those as security behavior changes requiring explicit regression tests.
- `0020` adds scheduled article publication and performs a data update to transition due scheduled posts into published snapshots/revisions. Migration execution must be understood as data-changing, not merely DDL.
- `0025` adds media upload reconciliation functions that update media lifecycle state and reserved-byte accounting. Preserve this recovery behavior if the media ownership model changes.
- Website and blog tables have different deletion semantics: many website-owned children cascade when their parent website is deleted, while organization and billing records use restrictive relationships. Migration planning must not assume all tenant data is safely cascade-deletable.
- The schema source contains two occurrences of `website_posts_legacy_source_uq` in its index declaration. This remains a source-level duplication requiring comparison with migration SQL, Drizzle snapshots and actual database indexes before any correction.

### 14.5 Database entity mapping to the agreed Lucia OS architecture

| Existing entity/domain | Recommended target treatment | Reason / migration note |
|---|---|---|
| `app_users`, `app_sessions` | Preserve | Identity authority and product session foundation; do not couple graph identity to auth internals |
| `organizations`, `organization_memberships` | Preserve and strengthen | Tenant boundary and permission authority for all graph/media/domain operations |
| `websites` | Preserve as website aggregate/root | Stable website identity, ownership, status and slug remain useful |
| `website_pages` | Transitional compatibility projection; progressively replace content authority | Current draft and published JSON are stored here; preserve paths/status/routing compatibility while graph becomes canonical |
| `website_structures` | Import then retire as independent structure authority | Its page/section/navigation model becomes graph nodes/edges; keep an adapter during transition |
| `website_versions` | Preserve as legacy archive; map snapshots to graph versions | Do not discard historical snapshots; validate/import what can be represented |
| `website_content_libraries` | Inventory and split by domain | Editorial content remains blog-owned; media references move to central Media Engine; avoid opaque JSON as canonical graph state |
| `website_seo_settings` | Preserve as SEO domain record or typed graph reference | Decide per-field ownership; retain existing values and public metadata behavior |
| `website_domains` | Preserve and adapt | Hostname ownership, verification and active status are infrastructure concerns, not canvas nodes |
| `website_media` | Migrate to organization-level media asset model | Existing website-scoped asset IDs/object keys/public references must remain resolvable through migration |
| `media_storage_budget`, `website_media_limits` | Revisit as centralized storage/entitlement accounting | Current quota model is product/website scoped and should be reconciled with organization library capacity |
| `website_posts`, `website_post_revisions`, slug redirects | Preserve as first-class Blog domain | Graph stores blog placements/templates/references, not full article bodies; retain revisions, published snapshots and redirects |
| Billing ledger, webhook events, support and audit tables | Preserve | Not graph content; protect financial, support and audit history |
| `workspace_preferences` | Preserve, evolve separately | User workspace settings are not website graph state |

No existing entity is authorised for deletion by this mapping. "Retire" means remove as an active source of truth only after successful import, compatibility validation, rollback window and explicit release approval.

### 14.6 Recommended graph schema boundary (proposal, not implementation)

Introduce graph persistence as a forward-only addition, with tenant and website ownership on every graph record:
- `website_graphs`: one canonical graph aggregate per website, organization-scoped, with active draft/version metadata and optimistic concurrency revision.
- `website_nodes`: stable node ID, organization ID, website ID, type, schema version, validated properties JSONB, timestamps and soft-delete/lifecycle fields.
- `website_edges`: stable edge ID, organization ID, website ID, typed source/target node IDs, relationship properties and constraints. Composite foreign keys should ensure both endpoints belong to the same graph/website/organization.
- `website_graph_versions`: immutable, validated graph snapshots or version manifests, creator, label, source revision, checksum and creation time.
- `website_graph_operations`: append-only operation batches with actor, idempotency key, base revision, resulting revision, operation payload/schema version and audit metadata. Do not rely on this table alone as the only recovery mechanism.
- `website_canvas_positions`: node-to-canvas coordinates, viewport/lock state, kept separate from website layout properties. This may be JSONB on a graph-scoped canvas state record if concurrent editing and access patterns justify it.
- Optional normalized design-token/recipe registries should be separate from customer graph content and versioned independently.

Use PostgreSQL relational columns and constraints for identity, tenant ownership, relationships, revisions and queryable invariants. Use JSONB only for versioned, Zod-validated node properties and operation payloads. Do not use one giant JSONB blob as the sole canonical editable graph. Exact names, constraints and indexes remain Phase 1 specification decisions.

### 14.7 Safe transition strategy

Use an expand → inspect/backfill → validate → switch → contract sequence:

1. **Baseline and backup:** capture migration ledger, schema/catalog, role attributes/ownership, row counts, storage inventory, public host mappings and checksums. Confirm recoverable database and object-storage backups.
2. **Additive schema:** add graph tables and RLS policies in forward-only migrations. Do not rewrite historical migrations or remove current tables.
3. **Deterministic importer:** convert each supported website definition and structure into graph nodes/edges using stable ID mapping. Preserve unknown legacy payloads and attach import warnings rather than dropping them.
4. **Domain reference mapping:** preserve blog post IDs, media IDs/object keys, SEO metadata, routes, domain records and published URL behavior. Do not copy binaries or create duplicate editorial records merely to populate graph nodes.
5. **Backfill in bounded batches:** idempotent jobs record source version, target graph revision, counts, checksums, warnings and completion state. Re-running a batch must not duplicate nodes or edges.
6. **Validation gate:** compare page/path sets, content values, navigation, media references, article references, SEO, domain mappings and published output. Reject cutover on missing references, cross-tenant edges, invalid node schemas or unexplained count/checksum mismatches.
7. **Controlled cutover:** select one canonical draft writer and reader at a time. After graph cutover, the graph is the canonical draft; old tables may be compatibility projections/read adapters, not a second independently writable source of truth. Keep the existing public published snapshot path until graph-version publishing has passed acceptance.
8. **Rollback window:** retain original content/snapshots and a tested route back to the previous reader/writer before contract/removal. Avoid bidirectional dual writes; if temporary compatibility writes are unavoidable, define a single owner, ordering, reconciliation and expiry date.
9. **Contract only after evidence:** remove obsolete read/write paths in a later release after all tenant data is migrated, acceptance tests pass, customer impact is checked and explicit approval is granted.

### 14.8 Required security and migration acceptance tests

Before graph schema or migration is approved, require:
- Tenant A cannot read, create, mutate, connect, move, version, publish or delete Tenant B graph data, including by guessing UUIDs.
- A graph edge cannot connect nodes from different websites or organizations; invalid/missing endpoint and cross-tenant references fail at database and service layers.
- Viewer/editor/admin/owner permissions are tested for every graph operation and publishing action.
- Anonymous public reads expose only the currently published graph version for the exact active hostname and published route.
- Pending, removed, suspended or reassigned domains cannot expose a website; stale host cache cannot leak content between tenants.
- Runtime role cannot bypass RLS; verify role is NOBYPASSRLS, not a table owner/superuser, and has only required grants.
- SECURITY DEFINER functions have safe owner, fixed search path, row-security behavior, narrow inputs/outputs and explicit EXECUTE grants.
- Migration preflight fails safely on inconsistent source records; importer is idempotent; rollback restores the previous read/write path.
- Counts/checksums and referential integrity are verified for pages, graph nodes/edges, versions, media references, posts/revisions, SEO and domains.
- Concurrent graph edits use revision checks/transactions; duplicate retries are idempotent; partial failures do not leave half-connected graph state.
- Media upload/reconciliation, published media access and article public access remain correct after asset ownership migration.

### 14.9 Audit conclusions and unresolved evidence

1. The migration chain is substantial and deliberately incremental; preserve its history and use forward-only changes.
2. Tenant isolation is a real existing architectural asset, but source inspection cannot prove production role configuration or catalog state.
3. RLS coverage is not equivalent to complete authorization: every route must continue to check authenticated identity, membership and action permission.
4. The graph should become canonical for website structure and design composition, while identity, billing, domains, blog editorial records and central media remain domain-owned systems.
5. The migration should be additive and staged. Do not delete `website_pages`, `website_structures`, `website_versions`, legacy libraries or media rows as part of initial graph introduction.
6. Current test evidence is insufficient to certify database RLS or migration safety; helper unit tests exist, but database-backed isolation and importer tests are required.
7. The Drizzle snapshot directory, runtime role/table ownership, applied production migration ledger, actual database indexes and production data inventory remain unverified.

**Phase 1 remains IN PROGRESS.** This task completes a repository-level migration/RLS assessment and a proposed entity mapping; it does not certify live database security, finalise exact DDL or authorise implementation.

---

## 15. Investigation task 5 — billing, subscriptions, entitlements and commerce audit

**Status:** Repository inspection complete for the billing/provider prototype and current schema. Subscription persistence, entitlement enforcement, commerce, and live payment operation are not implemented in the inspected branch. This is a source-code assessment only; it does not inspect live provider dashboards, production database contents, credentials, or actual payment transactions.

### 15.1 Evidence reviewed

Inspected the development branch repository tree and these implementation files:

- src/app/billing/page.tsx
- src/components/billing/billing-workspace.tsx
- src/lib/billing/billing.ts
- src/lib/billing/providers.ts
- src/lib/billing/paystack.ts
- src/lib/billing/verify-transaction.ts
- src/lib/billing/verify-paystack-server.ts
- src/lib/billing/record-verified-paystack-settlement.ts
- Billing/provider/settlement unit tests
- src/lib/db/schema.ts
- drizzle/0002_tenant_billing_ledger.sql
- drizzle/0012_force_rls_billing_ledger.sql
- Full recursive repository tree (752 entries; no commerce, subscription API, checkout API, or payment webhook route paths were present).

The inspected branch contains Paystack and Flutterwave helper modules, a billing invoice page, and a tenant billing ledger. The tree did not contain a product catalogue, inventory, cart, order, commerce checkout, persisted subscription, entitlement, or subscription lifecycle module.

### 15.2 Existing payment and invoice foundation

The current database model includes:

- billing_invoices: tenant-owned invoice number, due/paid amounts in minor currency units, currency, status and due date.
- billing_payment_attempts: tenant/invoice relation, provider, provider reference, provider transaction ID, idempotency key, amount, currency, status, checkout URL and verification timestamp.
- billing_webhook_events: tenant/payment-attempt relation, provider, provider event ID/type, payload hash, processing state and timestamps.

Useful existing controls:

- Organization ownership is represented in the rows and composite foreign keys bind payment attempts and webhook events to records in the same organization.
- Unique constraints cover organization/invoice number, organization/provider/reference, organization/idempotency key, provider transaction ID, and organization/provider/event ID.
- Billing tables have RLS enabled in migration 0002 and FORCE RLS added in migration 0012.
- The runtime must still use a non-owner, non-superuser, NOBYPASSRLS role; FORCE RLS does not constrain superusers or BYPASSRLS roles.
- Invoice settlement locks the payment attempt and invoice, checks exact reference/amount/currency, and commits both payment and invoice state in one transaction.
- Repeat settlement for the same provider transaction is idempotent; a different transaction ID for an already settled attempt is rejected.
- Database constraints and application checks reject invalid amounts/currencies and prevent invoice overpayment.

The invoice ledger is reusable as a foundation for Lucia's platform billing. It is not yet a subscription or commerce ledger.

### 15.3 Provider integration: implemented versus missing

**Implemented as reusable helpers:**

- Paystack and Flutterwave checkout initialization requests.
- HTTPS callback URL validation and exact allowlisting of provider checkout hosts.
- Server-side credential lookup and fail-closed configuration checks.
- Paystack raw-body HMAC-SHA512 webhook signature verification.
- Flutterwave webhook secret-hash comparison.
- Webhook event parsing and normalization for a limited set of Paystack and Flutterwave events.
- Paystack server-to-server transaction verification by reference.
- Shared transaction verification of reference, success status, amount and currency.
- A Paystack-only atomic settlement function for an already verified transaction.

**Not found in the inspected repository tree:**

- A customer-facing checkout API route that creates a local payment attempt, invokes initiateCheckout, persists the provider checkout URL and returns it to the client.
- A Paystack or Flutterwave webhook route that verifies the raw request, resolves the local attempt, verifies the provider transaction server-to-server, persists the webhook event and processes it idempotently.
- A persisted webhook-event processor/retry/reconciliation worker.
- A Flutterwave server-to-server verification and settlement path equivalent to the Paystack path.
- A provider-independent settlement orchestration service.
- Refund, chargeback, dispute, payout or payment-reconciliation workflows.
- Evidence that the checkout/provider helper functions are called by a production route. They are currently tested as library functions, not shown as an end-to-end payment workflow.

Important distinction: accepting a correctly signed webhook is not the same as verifying and settling a payment. Provider event payloads must not directly grant paid access. The existing provider helper comments also require callers to perform server-to-server transaction verification and idempotent persistence.

### 15.4 Subscription and pricing contracts

src/lib/billing/billing.ts currently defines Zod contracts and pure helper functions for:

- Billing cadences: weekly, monthly and annual.
- Subscription statuses: trialing, active, past_due, cancelled and expired.
- Price records with plan key, cadence, currency, amount in minor units, active flag and effective date.
- Subscription records with tenant, product key, plan key, cadence, status and trial/period dates.
- Discount records with percent/fixed discount, date window, currency and redemption limit.
- Payment-record validation.
- Trial-window calculation and discount validation.

These are in-memory TypeScript contracts, not persisted subscription/price/discount tables. The repository does not contain a durable subscription lifecycle service or entitlement resolver. The current subscriptionSchema requires trial start/end dates even for statuses such as active; the final persisted lifecycle model should distinguish trial dates from paid billing-period dates and model cancellation timing explicitly.

The current billing screen is explicit that it is a prototype:
- It reads and displays saved invoice history for active organisations.
- The trial button creates only a browser-local preview window.
- Discount validation uses an empty in-memory code list.
- No payment is collected and no subscription is created.
- Pricing is not configured.

### 15.5 Schema and contract gaps to resolve

1. **Status consistency:** The pure payment contract includes refunded, while the payment-attempt database constraint allows initialized, pending, succeeded, failed and cancelled. Define canonical state machines and transitions before adding workflows.
2. **Webhook event identity:** The normalized provider helper returns provider transaction identity but not a durable provider event identity. Event identity, event deduplication and payload hash persistence must be wired into webhook processing.
3. **Provider symmetry:** Flutterwave has checkout and webhook-signature/normalization helpers, but no equivalent server-side verification/atomic settlement implementation was found.
4. **Currency minor units:** Checkout conversion currently divides Flutterwave minor units by 100. A production system must use currency-specific exponent rules rather than assume every supported currency has two decimal places.
5. **Invoice settlement policy:** Current Paystack settlement requires a payment to exactly clear the remaining invoice balance. Decide whether partial payments, multiple attempts, overpayment handling and invoice credits are required.
6. **Financial reversals:** Define refund, chargeback, dispute and failed-renewal handling without rewriting historical payment facts.
7. **Discount concurrency:** Discount validation is a pure function. Redemption limits need transactional reservation/consumption to prevent concurrent redemptions exceeding the cap.
8. **Subscription lifecycle:** Define renewal periods, cancellation-at-period-end, immediate cancellation, grace periods, retry/dunning, pause/resume, upgrade/downgrade proration, trial conversion and expiration.
9. **Auditability:** Persist who initiated plan changes, what entitlement changed, the source payment/provider event, and when each transition occurred.
10. **Operational evidence:** Unit tests cover provider helpers and the Paystack settlement function, but no end-to-end route, database-backed webhook idempotency, recurring billing, subscription state machine or entitlement enforcement test was found in the reviewed tree.

### 15.6 Commerce audit

No commerce domain implementation was found in the inspected repository tree. Specifically, there were no persisted entities or modules for:

- Products, product variants, SKUs or product categories.
- Inventory and stock movements.
- Carts and checkout sessions.
- Customer orders, order items or order status history.
- Shipping, fulfilment or tax calculation.
- Commerce-specific discounts or promotions.
- Storefront product and collection APIs.
- Merchant order-management workflows.

A commerce illustration/layout asset is not evidence of commerce functionality. The future Lucia Store must not assume that a working product/order engine already exists.

### 15.7 Recommended target architecture for Lucia Store

Keep four separate responsibilities:

1. **Payment provider adapter:** Initiates provider checkout, verifies signatures, retrieves provider transactions server-to-server, normalizes events, and supports refunds/reconciliation where providers allow.
2. **Financial ledger:** Immutable/append-only financial facts for invoices, payment attempts, verified settlements, refunds and provider events. Preserve existing invoice/payment foundations and evolve them additively.
3. **Subscription and entitlement engine:** Stores subscription state and billing periods; derives durable entitlements from verified financial/lifecycle events; enforces access on the server for every protected operation.
4. **Commerce engine:** Stores products, variants, inventory, carts, orders, order items, fulfilment and customer records. It is a customer-facing optional website capability, not the same thing as a Lucia platform subscription.

Suggested conceptual entities for later specification (not approved DDL):

- Catalog: billing_products, billing_plans, billing_prices, billing_price_versions.
- Subscriptions: subscriptions, subscription_items, subscription_events, subscription_periods.
- Access: entitlements, entitlement_grants or a deterministic entitlement projection with an auditable source.
- Financial operations: existing invoices/payment attempts/webhook events plus payment transactions, refunds and reconciliation records as required.
- Commerce: store_products, store_product_variants, store_inventory, store_carts, store_orders, store_order_items, and fulfilment records.

Names are illustrative. Final names, relationships, indexes, RLS policies and state machines belong in the database/API specification before implementation.

### 15.8 Lucia Store entitlement flow

1. A customer chooses a capability (for example, Lucia Store or custom-domain connection) and sees the price, billing period, currency, limits, renewal/cancellation terms and what happens after expiry.
2. The server checks tenant authority, eligibility, existing entitlements and price version; it creates an invoice/payment attempt with a unique idempotency key.
3. The server initializes checkout with the selected provider and stores the returned reference/checkout URL. The browser is never trusted to set price, amount, tenant or payment status.
4. A webhook route verifies the exact raw-body signature, validates the event, resolves the stored attempt and verifies the transaction directly with the provider.
5. One transaction records the provider event, settlement and invoice state idempotently. Repeated or out-of-order events must not duplicate grants or reverse a later valid state.
6. Subscription lifecycle logic records the paid period and grants the corresponding entitlement.
7. Every relevant backend route checks the entitlement and its scope. UI visibility is only a convenience; it is not access control.
8. Renewal, failed payment, refund, chargeback, cancellation or expiration produces an auditable entitlement transition.
9. Subscription lapse must not silently delete store products, orders, customers, media or website content. Define read/export and write restrictions separately.

### 15.9 Product rules to preserve

- Lucia Store is an upgrade marketplace inside Lucia OS, not a separate website builder.
- Lucia Store features attach to the customer's existing website and must be addable later without rebuilding that website.
- A platform subscription (payment for Lucia capabilities) is distinct from a customer's own commerce transactions with their shoppers.
- A customer's store orders and shopper payment records must never be mixed with Lucia's invoices/subscriptions.
- Product, price and inventory data must remain independent from page presentation; graph nodes reference commerce data but do not become a second product/order database.
- Media used by store products must reference the central Media Engine assets; do not duplicate original uploads.
- Entitlement scope must be explicit (organisation, website, or module) and server-enforced.
- A failed payment or expired subscription changes access according to a documented policy; it does not erase customer data.

### 15.10 Phase 1 acceptance requirements for billing and commerce

Before Phase 1 is considered complete, specify and test:

- Canonical state machines for payment attempts, provider events, invoices, subscriptions, refunds and entitlements.
- End-to-end checkout initiation, raw-body webhook verification, server-to-server transaction verification and atomic idempotent settlement for every supported provider.
- Duplicate, delayed, reordered, malformed and forged webhook tests.
- Provider outage, retry, reconciliation and recovery behavior.
- Currency exponent and rounding rules.
- Discount concurrency and redemption limits.
- Tenant isolation and authorization for billing, subscription, entitlement and commerce records.
- Server-side entitlement enforcement across every protected API and background job.
- Renewal, grace-period, cancellation, downgrade, expiration, refund and chargeback behavior.
- No data deletion on entitlement lapse.
- Separation of Lucia platform billing from customer store sales.
- Commerce product/order/inventory integrity and migration/back-up requirements.
- Tests using the actual runtime DB role and RLS policies, not only mocked query helpers.

### 15.11 Audit conclusion

The existing invoice ledger, tenant isolation, Paystack/Flutterwave provider helpers, Paystack verification and atomic settlement function are valuable foundations and should be evaluated for reuse. However, the current billing page is a prototype, provider helpers are not connected to an end-to-end route in the inspected tree, subscription contracts are not persisted, entitlement enforcement is absent, and commerce has not been implemented.

**Recommendation:** retain and harden the existing financial ledger and provider adapters; design subscription/entitlement as a distinct domain; build Lucia Store commerce as a separate optional module that integrates with the existing website graph and central Media Engine. Do not treat current trial previews, schemas or provider helpers as production-ready billing.

**Phase 1 remains IN PROGRESS.** This audit does not change application code, database state, payment-provider configuration, live subscriptions or customer data. It does not certify production payment operations.

---

## 16. Investigation task 6 — domain, hosting, deployment and operational lifecycle audit

**Status:** Repository-level inspection complete for domain registry, hostname routing, publishing, media object storage and scheduled workers. Custom-domain activation/TLS automation, production hosting configuration, backup/restore evidence and live provider state are not established by this source review. No live DNS, hosting account, Vercel project, database or storage provider was accessed or changed.

### 16.1 Evidence reviewed

Inspected the development branch recursive tree, domain/publishing routes and libraries, relevant migrations, media storage adapters, cron authorization and worker routes, and GitHub Actions workflows, including:

- src/lib/domains/hostname.ts and hostname.test.ts
- src/lib/domains/public-site.tsx
- src/lib/publishing/host.ts and host.test.ts
- src/lib/publishing/platform-hosts.ts
- src/lib/publishing/publishing.ts and publishing.test.ts
- src/app/api/domains/route.ts
- src/app/api/domains/[domainId]/route.ts
- src/app/api/domains/verify/route.ts
- src/app/api/websites/[websiteId]/domains/route.ts
- src/app/api/publishing/publish/route.ts
- src/app/api/publishing/websites/route.ts
- src/app/workspace/domains/page.tsx
- src/lib/media/storage.ts and multipart-storage.ts
- src/lib/media/service.ts
- src/lib/cron/authorization.ts
- src/app/api/cron/publish-articles/route.ts
- src/app/api/cron/reconcile-media/route.ts
- drizzle/0004_website_publishing.sql
- drizzle/0006_website_domains.sql
- drizzle/0025_media_upload_reconciliation.sql
- GitHub Actions workflows under .github/workflows

### 16.2 Domain registry and hostname model

The repository has a domain registry, not just a free-form domain field.

- website_domains records organisation, website, globally unique hostname, type (lucia_subdomain/custom), lifecycle status, primary flag, verification-token hash and verified timestamp.
- Database constraints enforce hostname formatting, same-organisation website ownership, one hostname globally, at most one non-removed Lucia subdomain per site, and at most one primary domain per site.
- Domain statuses include pending, verifying, verified, active, suspended and removed.
- Tenant RLS is enabled; active domains also have a public-read policy so the public resolver can identify an exact active hostname.
- Hostname normalization lowercases, handles trailing dots and IDNs, rejects URL syntax/wildcards, and reserves platform subdomains.
- Public routing requires an exact active hostname joined to the same organisation/website and a published website; requested page paths must resolve to a published page with a valid published snapshot.
- The public renderer is request-cached, and its comment explicitly documents request-local caching so tenant host authorization/data is not shared across different requests.
- Platform-host detection and tenant-host routing are deliberately separate. Host selection is not resource authorization.

This is a useful foundation to preserve. Wildcard DNS is only transport; it must never be treated as proof of domain ownership or permission to publish.

### 16.3 Free Lucia subdomain lifecycle

The free subdomain path is comparatively complete in application code:

1. A website has a slug.
2. The owner can request a one-level, non-reserved subdomain.
3. Availability is checked against the hostname registry/database function.
4. The website must be published before its Lucia subdomain is activated for public routing.
5. The publish transaction writes published page snapshots, marks the website published and activates/creates the exact Lucia hostname record atomically.
6. Renaming the subdomain locks the website/domain rows, updates the website slug and matching hostname in a transaction, and writes an audit event.
7. Public routing only serves the exact active hostname and published page snapshot.

The migration history includes the website domain registry and a later global hostname availability function. Domain uniqueness is therefore enforced beyond a UI availability check.

### 16.4 Custom-domain lifecycle: partial and not production-complete

The repository has useful ownership-verification pieces:

- Custom hostname registration creates a pending domain record and generates a random 32-byte token; only its SHA-256 hash is stored.
- The verification API resolves the TXT record at _lucia-verification.<hostname>, hashes the returned value and compares it using timing-safe comparison.
- A successful DNS TXT check advances pending to verified.
- Domain status is not changed to active by this verification endpoint.
- Domain activation policy helper requires verified status, ownership proof, expected-deployment DNS target, HTTPS readiness and (for custom domains) verified paid access.
- A helper test verifies these gates.

However, the reviewed tree does not contain a complete activation controller that proves all those gates and changes a custom domain to active. In particular, no provider API integration or worker was found for:
- checking authoritative A/AAAA/CNAME target against the current expected deployment,
- provisioning/observing a TLS certificate,
- retrying certificate issuance/renewal,
- validating certificate hostname and expiry,
- transitioning verified to active only after all checks pass,
- suspending a domain when DNS/TLS is broken or entitlement is revoked.

The publish UI/schema explicitly says the separate one-time custom-domain purchase and DNS/TLS verification are not connected. The older website-scoped domains POST route also fails closed for custom domains because purchase verification is not connected. A newer top-level custom-domain registration route permits a pending claim after website-publish authorization and TXT token creation; that is only a claim/verification start, not activation. These route variants should be consolidated behind one domain service/API contract to avoid confusing or divergent lifecycle behavior.

The domain page's text and helper function must not be interpreted as proof that automated custom-domain TLS is already working.

### 16.5 Hosting, DNS and deployment evidence

- Source code contains the default public host lucia.name.ng and known Vercel-style deployment hostnames; it reads APP_BASE_URL, VERCEL_URL and VERCEL_BRANCH_URL for platform-host classification.
- The project uses Vercel-oriented environment conventions and GitHub Actions, but vercel.json is empty.
- No infrastructure-as-code, custom-domain provider adapter, explicit Vercel domain provisioning API, certificate-management integration, DNS provider adapter, or deployment promotion/rollback controller was found in the inspected repository tree.
- The publish route creates a database publication snapshot and activates a Lucia subdomain record; this is application-level publication, not evidence that a new hosting deployment is built for every customer edit.
- The public Next.js renderer resolves the current published snapshot at request time. This is compatible with a shared multi-tenant hosting model, provided host routing, database availability and cache isolation remain correct.
- Production deployment provider, project settings, wildcard DNS records, edge routing, custom-domain onboarding, TLS provider, regions and runtime limits cannot be confirmed from repository code alone. They require an authorised live infrastructure inventory.

### 16.6 Object storage and media operations

The media system uses S3-compatible object storage through server-side AWS Signature Version 4 adapters.

- Required configuration includes S3 endpoint, bucket, region and access credentials.
- The endpoint must be HTTPS; endpoint credentials/query/path are rejected.
- Object keys are constrained to tenant/website/asset UUID paths; signed URLs/credentials are not sent to callers for ordinary image operations.
- Images use server-side PUT/GET/DELETE and WebP processing.
- Large video/document uploads use multipart storage, signed individual-part URLs, bounded part numbers, server-side completion and object verification.
- Upload records and reserved capacity are persisted before external object writes, avoiding false success on uncertain storage outcomes.
- Scheduled reconciliation claims stale pending/deleting records with a bounded batch and SKIP LOCKED; it verifies objects before finalizing or removes invalid partial objects and releases reserved bytes.
- The scheduled worker also removes old orphaned multipart uploads.
- Product storage budget and per-website quotas exist, with a staff storage view and audit-logged quota updates.

Important limits/gaps:
- The inspected image library is capped at 200 images per website and uses website quotas; this is not the proposed central, reusable, large-library Media Engine.
- Storage quota/reservation tracking is not a backup system. It does not prove object versioning, replication, retention, off-site backup, restore testing or disaster recovery.
- Storage reconciliation protects against abandoned uploads, not accidental bulk deletion, compromised credentials or provider-wide outage.
- Public delivery and CDN behavior, cache invalidation, bandwidth accounting, storage lifecycle policies and provider SLA are not fully specified in source.
- Current signed multipart URLs are time-limited; the final media design should preserve short expiry, tenant-scoped authorization, size/type validation and resumable upload recovery.

### 16.7 Scheduled workers and operational automation

The repository has a GitHub Actions scheduled workflow running every five minutes. It obtains a short-lived GitHub OIDC token with a fixed audience and invokes:
- /api/cron/publish-articles
- /api/cron/reconcile-media

The API validates the token signature against GitHub JWKS and checks issuer, audience, repository, owner, main branch, exact workflow reference, event type and token time bounds. A constant-time CRON_SECRET fallback remains supported.

The worker endpoints:
- are dynamic Node.js routes,
- reject unauthorized requests,
- return no-store responses,
- publish due articles in bounded batches,
- reconcile stale media uploads and old multipart uploads,
- report failures so the workflow can fail and be retried.

This is a meaningful scheduled-worker foundation. It is not a general durable job system. No generic queue, job dashboard, retry schedule/dead-letter queue, alerting integration, worker lease/heartbeat model or operational runbook was found for future graph builds, publishing, video processing, TLS renewal or backup workflows.

### 16.8 Backup, restore, rollback and observability gaps

The inspected source tree did not establish a complete operational safety system for:

- automated PostgreSQL point-in-time recovery and scheduled logical backups,
- object-storage backup/versioning and cross-region recovery,
- tested full restore of database plus object storage and domain mappings,
- defined RPO/RTO targets and disaster-recovery runbooks,
- deployment health checks, canary rollout and automatic rollback,
- publish-version rollback through an operator/customer workflow,
- centralized structured logs, metrics, traces and alert routing,
- domain DNS/TLS expiry monitoring and incident escalation,
- storage/provider outage handling and customer status communication.

Existing immutable published page snapshots and website versions are application recovery aids, not substitutes for database/object-store backups. A database restore without matching media objects (or vice versa) can leave broken content; recovery must coordinate both.

GitHub Actions quality and acceptance workflows exist, including isolated PostgreSQL/RLS acceptance and browser evidence. Their presence is useful but does not establish production deployment approval, live backup coverage or successful restore drills. Workflow definitions and run history should be reviewed separately before claiming those controls operate successfully.

### 16.9 Recommended target lifecycle architecture

Define these independent but connected services:

1. **Domain Registry:** Canonical hostname ownership, tenant/site binding, primary host, lifecycle status and audit history.
2. **DNS Verification Service:** TXT ownership challenge plus expected A/AAAA/CNAME target checks; bounded retries and evidence timestamps.
3. **Domain Provisioning Adapter:** Provider-neutral interface for supported hosting/DNS provider operations; idempotent add/remove/update and provider operation IDs.
4. **TLS Lifecycle Service:** Certificate provisioning, readiness, renewal, expiry monitoring, failure retry and safe suspension.
5. **Publishing/Deployment Service:** Validates and publishes a graph version, creates immutable deployment/publication records, exposes health/status and supports rollback.
6. **Public Runtime Router:** Exact active host → tenant/site → published graph version → page route; never trusts host headers as tenant authorization by themselves.
7. **Durable Job Runner:** Idempotent jobs with retries, leases, backoff, dead-letter state, bounded concurrency and audit trail.
8. **Backup/Recovery Service:** Coordinated database and object storage backups, retention, restore drills, RPO/RTO and recovery validation.
9. **Observability/Incident Service:** Structured logs, metrics, traces, uptime checks, alerting, provider status and customer-visible incident states.

Do not bind core domain logic to Vercel or one DNS vendor. Provider adapters should be replaceable. Lucia's internal domain state machine remains authoritative; external provider state is observed evidence, not the canonical customer entitlement or website ownership record.

### 16.10 Suggested domain/deployment state machines

- Domain claim: requested → pending_dns → ownership_verified → target_verified → tls_pending → active; terminal/recovery states include verification_failed, provisioning_failed, suspended and removed.
- Provider provisioning operation: queued → running → succeeded/failed; retryable failures retain bounded attempt count, next-attempt time and provider correlation ID.
- Deployment: draft → validating → ready → publishing → live; failures preserve the prior live version; rollback creates a new deployment referencing a prior immutable graph version rather than mutating history.
- TLS: not_requested → pending → issuing → ready → renewal_due → renewing → ready; failed/expired certificates must never be treated as HTTPS-ready.
- Worker job: queued → leased → succeeded or retry_wait → queued; exhausted jobs enter dead_letter with operator-visible diagnostics.

These are target-state proposals, not descriptions of current production statuses.

### 16.11 Phase 1 acceptance requirements

Before Phase 1 is complete, specify and verify:

- Single consolidated domain API/service with explicit organisation/website authorization and subscription entitlement checks.
- TXT ownership verification, DNS target verification and TLS provisioning/renewal for every supported custom-domain provider.
- Domain activation only after all independent gates succeed; removal/suspension immediately stops public routing.
- Exact host-to-tenant binding and cache isolation across active, pending, removed, reassigned and unknown domains.
- Free Lucia subdomain rename behavior, collision handling, redirects/SEO policy and atomic publication behavior.
- Provider-neutral DNS/hosting/TLS adapter contracts and idempotent provisioning reconciliation.
- Immutable publication/deployment records, deployment health checks and rollback acceptance.
- Durable job retries, duplicate execution, worker crashes, lease expiry and dead-letter tests.
- S3 object storage backup/versioning/retention and database backup consistency.
- Full restore drill for database, media objects, domains, website publication state and credentials/configuration.
- Defined RPO/RTO, monitoring, alerting, operational runbooks and incident ownership.
- Runtime limits, upload/video-processing limits, storage and bandwidth costs, CDN/cache policy and regional availability.
- Production deployment and DNS/provider configuration inventory, verified by an authorised operator.

### 16.12 Audit conclusion

Lucia already has a credible foundation for free subdomain routing, exact active-domain lookup, published snapshot rendering, custom-domain TXT ownership challenges, S3-compatible media storage, stale-upload recovery and authenticated scheduled workers. The free subdomain publication path is substantially more complete than custom-domain activation.

However, custom-domain activation and TLS provisioning are not connected end-to-end; Vercel/DNS deployment configuration cannot be certified from this repository; the scheduled worker is narrow rather than a general job platform; and coordinated database/object-store backup, restore, monitoring and disaster recovery are not evidenced.

**Recommendation:** preserve the current exact-host routing and immutable publication snapshot protections. Consolidate domain claim/verification/activation into one state machine and provider adapter boundary. Treat DNS target checks, TLS, backups, restore drills and operational observability as launch-critical infrastructure—not optional polish.

**Phase 1 remains IN PROGRESS.** This repository audit did not access or alter live DNS, hosting, Vercel, TLS, database, object storage, deployment or customer data. It does not certify production availability, domain activation or disaster recovery.


---

## 17. Phase 1 consolidation — architecture decisions, contracts and readiness register

**Status:** Consolidated architecture baseline. Repository investigations 1–6 are recorded above. This section supersedes earlier preliminary notes wherever it makes a more explicit decision. It does not claim that target systems have been implemented or that live infrastructure has been verified.

### 17.1 Authority and decision vocabulary

Use these labels throughout future work:

- **AGREED:** a product/architecture decision already established by the product owner or master blueprint. Codex must preserve it unless the owner explicitly changes it.
- **SPECIFIED:** a recommended technical contract adopted as the Phase 1 design baseline. Implementation must still validate it against current repository conventions and tests.
- **PROPOSED — OWNER APPROVAL:** a material product or operational choice that must not be silently decided by an engineer or Codex.
- **VERIFY LIVE:** requires authorised inspection of deployed infrastructure, provider accounts, production database configuration or operational evidence; repository source alone is insufficient.
- **DEFERRED:** intentionally not required to complete the architecture specification; resolve before the dependent implementation or launch gate.

### 17.2 Canonical decisions

| Area | Decision | Status |
|---|---|---|
| User experience | Permanently replace the old editor interface with the new Lucia Studio; do not use the old editor as its foundation. | AGREED |
| Existing systems | Preserve compatible backend capabilities and customer data; adapt or replace incompatible interfaces and persistence paths through controlled transitions. | AGREED |
| Website authority | One canonical persistent graph per website is the long-term authority for website structure and composition. | AGREED |
| Core operation | Creation, composition, editing, validation and rendering work deterministically without AI. | AGREED |
| Deployment shape | Begin as a modular monolith with explicit module/service boundaries; do not split into microservices prematurely. | AGREED |
| Canvas | Canvas coordinates and graph organisation are separate from website layout and rendering properties. | AGREED |
| Preview | Preview and published output use the same graph and rendering contracts; preview is interactive website output, not a canvas screenshot. | AGREED |
| Graph persistence | Relational PostgreSQL identities, tenant ownership, typed edges, revisions and constraints; schema-validated JSONB for extensible node properties. No giant unvalidated JSON document as permanent authority. | SPECIFIED |
| Blog | Blog posts and revisions remain a first-class editorial domain; graph nodes describe their placement and presentation, not duplicate editorial records. | SPECIFIED |
| Media | Central organisation-scoped media library with stable asset IDs; binary originals/derivatives in object storage and metadata/references in PostgreSQL. | AGREED |
| Commerce | Optional store capability integrated into the existing website; product and inventory records remain independent of presentation and graph layout. | AGREED |
| Subscription | Lucia platform subscriptions and entitlements are separate from payments made by shoppers to a customer's store. Entitlements are enforced server-side. | AGREED |
| Domains | Domain ownership, DNS target, TLS readiness and entitlement are separate gates; a hostname or TXT proof alone never authorises public routing. | SPECIFIED |
| Publishing | Publish immutable, validated website versions; a failed publish must preserve the prior live version. Rollback creates a new deployment/publication pointing to a prior immutable version. | SPECIFIED |
| Migration | Import legacy content through repeatable adapters, preserve unknown source data, report unsupported features, validate before cutover, and retain a tested recovery path. | AGREED |
| Data lifecycle | Subscription lapse, migration or feature removal must not silently delete customer content, media, products, orders or records. | AGREED |

### 17.3 Target module boundaries and ownership

The following ownership rules prevent duplicate sources of truth. These are logical modules inside the initial modular monolith.

| Module | Owns | Must not own |
|---|---|---|
| Identity and Access | Authenticated identity mapping, organisation membership, roles, permissions and authorization decisions. | Website content or product entitlements. |
| Website Registry | Website identity, tenant ownership, lifecycle and stable website-level settings. | Canonical page/section/component composition. |
| Graph Engine | Draft graph, node/edge schemas, graph constraints, graph operations, revisioning and immutable graph versions. | Blog post bodies, product inventory, payment ledger or binary media. |
| Design Intelligence | Versioned tokens, component/section recipes, page compositions, industry recipes and compatibility rules. | Per-customer graph state. |
| Composition Engine | Deterministic requirements-to-graph pipeline and recipe selection. | Independent website persistence. |
| Rendering Engine | Graph resolution, token/data/media binding, responsive output and supported interactions. | Editing or publishing authority. |
| Validation Engine | Deterministic findings, issue codes, severity and affected resource references. | Silent mutation of customer content. |
| Media Engine | Organisation-owned asset identity, metadata, processing, storage references, usage tracking and lifecycle. | Copies of blog/product/graph content as separate asset authorities. |
| Blog Engine | Posts, drafts, revisions, authors, taxonomy, scheduling and editorial SEO data. | Website section composition or binary asset storage. |
| Commerce Engine | Products, variants, SKU, price, stock, cart, checkout, customer/order and fulfilment records. | Product presentation or Lucia platform subscriptions. |
| Billing Ledger and Provider Adapters | Invoices, payment attempts, provider references/events, verified settlements and financial audit. | Entitlement policy or website graph. |
| Subscription and Entitlement Engine | Plans, subscriptions, lifecycle state, capability grants, limits and entitlement decisions. | Customer store shopper orders. |
| Domain Engine | Hostname claims, verification evidence, DNS target state, TLS state, activation and domain audit. | Authentication or billing settlement. |
| Publishing Engine | Validated publication/deployment records, activation, health and rollback orchestration. | A second editable website source of truth. |
| Migration Engine | Source inspection, import mappings, validation reports, cutover and recovery orchestration. | Long-term parallel legacy content authority. |
| Job Runner | Durable jobs, leases, idempotency, retries, backoff and dead-letter diagnostics. | Domain-specific business policy. |
| Operations and Recovery | Backup policy, restore evidence, monitoring, alerting, incident/runbook and operational audit. | Customer-facing product content. |

Cross-module calls must use explicit internal service contracts. Modules must not reach into another module's private tables or bypass its authorization and lifecycle rules merely because they share a database.

### 17.4 Canonical data ownership and transition rules

1. **Website structure:** Graph Engine becomes the sole writer/authority after a website's graph cutover. Existing `website_pages`, `website_structures`, `website_versions` and serialized draft/published payloads may serve as import sources or explicitly defined compatibility projections during transition. Do not permit indefinite dual-write.
2. **Routes and public URL identity:** Website Registry/Domain Engine own website and hostname identity. A route projection may be retained for efficient public resolution, but it must be derived from and validated against the canonical published graph/version.
3. **Published state:** Publishing Engine records which immutable graph version is live for a site/host. The public runtime resolves only the exact active hostname and its authorised published version/path.
4. **Editorial content:** Blog Engine owns normalized post/revision content. Graph references post identity and presentation placement. Do not copy full post content into graph nodes as a competing authority.
5. **Products and orders:** Commerce Engine owns product, price, inventory and order records. Graph references product/collection identities and presentation configuration only.
6. **Media:** Media Engine owns stable asset IDs and binary-object lifecycle. Blog, commerce and graph store references and usage metadata, not duplicate originals.
7. **Billing:** Billing ledger owns financial events and settlements. Subscription Engine derives entitlement state from verified financial/lifecycle events; client UI state is never proof of payment.
8. **Canvas:** Canvas positions are user/workspace presentation state and cannot be interpreted as website layout instructions.
9. **Unknown legacy content:** Preserve original source payload and import diagnostics until the owner accepts the converted result and the retention/rollback window is complete.
10. **Deletion:** Every destructive lifecycle action must first check ownership, references, retention, dependencies and recovery policy; provide soft-delete/quarantine where appropriate.

### 17.5 Contract baseline

These are logical contract shapes and responsibilities, not a demand to implement every endpoint in one change. Exact route naming may follow established repository conventions after implementation inspection.

#### Graph Engine

- Read graph: website scope, authorised actor, draft revision, schema version and requested expansion.
- Apply operation batch: website ID, actor, base revision, idempotency key, ordered typed operations and validated payloads.
- Return: accepted/rejected result, resulting revision, affected node IDs, validation findings and operation/version reference.
- Read/restore version: immutable version ID, actor, permission check and explicit restore operation.
- Canvas state: independently read/write positions, lock state and viewport metadata; never modifies graph layout properties.
- Invariants: tenant/site consistency, edge type/cardinality/cycle constraints, schema validation, permission checks, transactional atomicity, optimistic concurrency and idempotent retries.

#### Composition and Design Intelligence

- Input: structured requirements, explicit user-provided facts, selected industry/design direction and deterministic defaults.
- Output: proposed graph plus recipe/version provenance, unresolved questions, assumptions and validation findings.
- Must never fabricate business facts, testimonials, addresses, contact details, credentials or licensing rights.
- Recomposition must be scoped and reviewable; it must not silently overwrite unrelated user edits.

#### Rendering and Validation

- Rendering input: graph/version ID, route, viewport, environment configuration and authorised data/media resolvers.
- Rendering output: deterministic accessible website representation and diagnostics.
- Validation output: stable issue code, severity, explanation, affected node/resource ID, rule version and actionable remediation.
- Preview must be interactive and use the same renderer/graph contract as publication.

#### Media

- Upload initiation: organisation, actor, declared metadata, expected size/type and idempotency key.
- Upload completion: asset ID, storage upload reference and server-verified object metadata/checksum.
- Asset read/update: tenant-authorised metadata and processing state.
- Usage operations: attach/detach stable asset ID to an authorised graph/blog/product resource.
- Delete: reject or quarantine when references, retention or published usage prevent safe deletion.
- Large uploads: bounded resumable/multipart workflow with short-lived signed parts and reconciliable state.

#### Blog and Commerce

- Blog operations use stable post IDs and revision preconditions; publishing/scheduling is server-authoritative.
- Commerce product and inventory mutations are transactional and auditable; cart/checkout/order state is independent from graph presentation.
- Product media is a reference to Media Engine asset ID.
- Price, currency, stock and availability are resolved from Commerce Engine at render/checkout time, not copied into static graph content as authoritative values.

#### Billing and Entitlements

- Checkout initiation creates a local invoice/payment attempt before redirecting to a provider.
- Webhook handling verifies raw-body signatures, resolves the local attempt, verifies transaction status/amount/currency server-to-server, and settles idempotently.
- Provider events are persisted with unique event identity and replay/reconciliation support.
- Entitlements are granted only from verified state transitions; every protected API and worker checks them server-side.
- Platform billing must be isolated from customer store sales and their payment credentials/ledgers.

#### Domain and Publishing

- Domain activation requires verified ownership, expected DNS target, TLS readiness, website/tenant authorization and applicable entitlement.
- Provider provisioning is idempotent and asynchronous; provider response is evidence, while Lucia's domain state machine is authoritative.
- Publishing validates the selected immutable graph version and dependencies before activation.
- Failed publication leaves the previous live version untouched.
- Public resolution requires exact active host → tenant/site binding → live immutable version → valid published path. Cache keys and request context must not cross tenant/host boundaries.

#### Migration

- Each adapter declares source type/version, supported mappings, unsupported features, stable identity strategy and source-retention policy.
- Imports are idempotent and restartable; each batch records source identity, destination identity, checksum/status and diagnostics.
- Cutover requires counts/checksums, route/content/media/SEO validation, user acceptance and tested rollback.
- No legacy writer is disabled until the corresponding graph-backed read/write path has passed acceptance.

### 17.6 Required security and operational invariants

These are non-negotiable acceptance properties:

- Authentication and authorization precede tenant-scoped data access; RLS context is defence in depth, not proof of identity or permission.
- Every tenant-owned graph node, edge, media asset, post, product, order, domain and billing record is checked against organisation/site ownership.
- Runtime database credentials must be least-privilege and non-BYPASSRLS; table ownership and FORCE RLS requirements must be explicitly verified for the deployed role.
- SECURITY DEFINER functions require fixed search path, narrow owner privileges, explicit grants and security tests.
- Anonymous public reads expose only published content for the exact active host/path and approved public media.
- Payment events are authenticated, idempotent, replay-safe and verified with the provider; client redirects never settle payments.
- Uploads are content-inspected, size/type-limited, tenant-authorised and protected from object-key/path injection.
- Signed upload/download URLs are short-lived and scoped.
- Secrets never enter source control, client bundles, logs or public responses.
- Destructive operations require dependency checks, audit records and recoverability.
- Backups include both database metadata and referenced binary objects; a restore drill validates the combined system.
- Job execution is idempotent and bounded; duplicate delivery, crash recovery and poison jobs are observable.
- Logs and diagnostics must avoid secrets and unnecessary personal data.

### 17.7 Decision register — owner approvals and deferred choices

The architecture should not invent the following commercial or operational values. Record the eventual choice in a product/operations decision record before implementing the dependent feature.

| Decision | Recommended approach | Status / when required |
|---|---|---|
| Custom-domain provider and hosting integration | Keep provider-neutral adapter boundary; choose the first supported provider after reviewing existing production hosting and cost. | PROPOSED — OWNER APPROVAL before custom-domain provisioning implementation. |
| Custom-domain subscription price, billing interval and included limits | Define explicit plan catalogue and server-authoritative prices; do not hardcode UI prices. | PROPOSED — OWNER APPROVAL before Lucia Store checkout launch. |
| Subscription grace period and post-expiry access | Preserve customer data; define which operations remain read-only, which are blocked, notification timing and reinstatement. | PROPOSED — OWNER APPROVAL before subscription enforcement launch. |
| Supported payment providers and settlement currencies | Reuse existing Paystack/Flutterwave foundations only after end-to-end provider verification; define currency-specific minor-unit rules. | PROPOSED — OWNER APPROVAL and provider verification before live billing. |
| Commerce payment, shipping and tax providers/markets | Select based on launch geography, legal obligations, provider availability and fees; keep adapters replaceable. | DEFERRED until Commerce implementation scope is approved. |
| Media storage/bandwidth quotas and overage policy | Transparent usage limits and pricing; avoid arbitrary item-count caps as the primary commercial limit. | PROPOSED — OWNER APPROVAL before central Media Library launch. |
| Supported media formats, maximum sizes and video processing profiles | Start with a documented safe allowlist and bounded processing profiles; expand only with scanning and cost controls. | SPECIFY during Media implementation; exact limits require owner approval. |
| Backup RPO/RTO, retention and recovery regions | Set measurable objectives based on customer impact, provider capability and budget; prove them with restore drills. | PROPOSED — OWNER APPROVAL before production launch. |
| Initial supported industries and recipe catalogue | Launch with a deliberately bounded catalogue and versioned recipes; expand from observed customer demand. | PROPOSED — OWNER APPROVAL before Design Intelligence content production. |
| Legacy migration coverage | Publish a supported-source matrix; unknown features must be reported and preserved, not silently dropped. | PROPOSED — OWNER APPROVAL before migration promises/cutover. |
| Public hosting regions, CDN and bandwidth policy | Verify current deployment topology and choose explicit availability/cost targets. | VERIFY LIVE; operational policy before launch. |

These decisions do not justify guessing during Phase 1. Provider-neutral interfaces and state machines can be specified now; provider-specific implementation must wait for the relevant decision.

### 17.8 Phase 1 completion checklist

| Deliverable | Result |
|---|---|
| Agreed product direction and eight-phase sequence | COMPLETE — captured in the master blueprint. |
| Current repository baseline and evidence inventory | COMPLETE for the reviewed areas; findings are source-level and branch-specific. |
| Editor, draft-save, preview and publishing call-path audit | COMPLETE — Section 13. |
| Database, migrations, tenant isolation and graph transition audit | COMPLETE — Section 14. |
| Billing, subscriptions, entitlements and commerce audit | COMPLETE — Section 15. |
| Domains, hosting, object storage, workers and operational gaps audit | COMPLETE at repository level — Section 16. |
| Target module boundaries and canonical data ownership | SPECIFIED — Section 17.3–17.4. |
| Graph, composition, rendering, media, blog, commerce, billing, domain, publishing and migration contract baseline | SPECIFIED — Section 17.5. |
| Security and operational invariants | SPECIFIED — Section 17.6. |
| Product-owner and live-infrastructure decision register | RECORDED — Section 17.7; choices remain open where identified. |
| Exact implementation schema, endpoint payload schemas and event catalog | NEXT IMPLEMENTATION-DESIGN DETAIL — refine per phase/module against current code before coding; do not infer these as already implemented. |
| Production database role, live provider settings, DNS/TLS, backup and restore evidence | VERIFY LIVE — not accessible or certified by repository audit. |
| Product-owner approval of the consolidated architecture baseline and module boundaries | APPROVED — user confirmation received on 2026-11-12. Outstanding commercial/operational decisions remain individually open as listed in Section 17.7. |

### 17.9 Phase 1 exit interpretation

Phase 1 has produced a consolidated, implementation-guiding architecture baseline. It is suitable to guide the next detailed implementation specifications, but it is **not a production-readiness certification** and it does not authorise broad implementation or destructive migration.

The product owner approved the consolidated architecture baseline and module boundaries on 2026-11-12. Phase 1 is therefore **CLOSED — ARCHITECTURE BASELINE APPROVED**. Items labelled PROPOSED — OWNER APPROVAL remain open decisions for their dependent implementation or launch gates; items labelled VERIFY LIVE remain operational verification work. Closing the architecture phase does not certify production readiness or imply that these later decisions and checks are complete.

Phase 2 must begin with a focused Graph Engine implementation specification: final node/edge discriminated unions, schema versions, constraints/cardinality/cycle rules, relational schema and RLS policies, operation-batch contract, concurrency/idempotency, immutable version model, canvas-state contract, migration adapter boundary and executable acceptance tests. Inspect the current branch and code again immediately before implementation.

**Scope and safety:** This consolidation changes documentation only. It does not change application code, database schema/data, customer websites, payment configuration, subscriptions, domains, DNS, TLS, object storage, hosting or deployments. No live infrastructure or backup/restore drill has been verified.


---

## 18. Phase 1 approval record

- **Decision:** Approved.
- **Approver:** Lucia OS product owner (approval received in the project conversation).
- **Date:** 2026-11-12.
- **Approved scope:** Consolidated architecture baseline, canonical decisions, module boundaries, data ownership rules, contract baseline, security/operational invariants and the eight-phase roadmap.
- **Phase status:** **CLOSED — ARCHITECTURE BASELINE APPROVED.**
- **Remaining work:** Product and commercial choices in Section 17.7 remain open until their dependent implementation/launch gate. Live infrastructure, provider configuration, backup/restore and production database-role checks remain VERIFY LIVE items. They do not prevent closure of the architecture-definition phase, but they must be completed before relevant production launch gates.
- **Next phase:** Phase 2 — Graph Engine.
- **Implementation guardrail:** Begin with a focused Graph Engine implementation specification and a fresh inspection of the current development branch. Do not implement the whole roadmap in one change. No application code or production resources are authorised by this approval record alone.

