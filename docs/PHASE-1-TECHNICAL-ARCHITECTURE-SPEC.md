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
