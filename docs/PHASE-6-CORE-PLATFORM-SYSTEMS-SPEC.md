# Phase 6 — Core Platform Systems

**Target branch:** `development`  
**Status:** In progress  
**Scope:** Lucia-owned Media Library, Blogging, Commerce, Subscriptions & Entitlements, and Domain Management.

## 1. Objective

Build the shared platform capabilities required by Lucia Studio and the websites it authors. These are product systems, not isolated editor widgets. The same tenant-safe services must be usable by Studio, blogging, website rendering, commerce and later publishing workflows.

Implement one bounded increment at a time. Each increment must be committed to `development`, run focused regression tests and the full quality workflow before the next dependent increment begins.

## 2. Existing-system audit — reuse before extending

The repository already contains meaningful foundations. Phase 6 must extend these rather than create parallel systems.

### Media

- Additive customer-media schema is already present in migrations `0016_customer_media`, `0024_typed_customer_media`, `0025_media_upload_reconciliation`, and `0026_inline_article_media_authorization`.
- `website_media` stores website- and organization-scoped metadata, immutable object keys, status, media kind/MIME, checksums, dimensions, alt text, captions and upload reconciliation state.
- `media_storage_budget` and `website_media_limits` track shared product capacity and per-website quotas.
- `src/lib/media/service.ts` owns tenant authorization, quotas, image optimization, reference-aware deletion and media lookup.
- `src/lib/media/storage.ts` and `src/lib/media/multipart-storage.ts` provide server-signed S3-compatible object storage and multipart transfer.
- `src/app/api/websites/[websiteId]/media` and `media/assets` expose authenticated library and upload operations.
- `src/app/api/media/[id]` delivers private/public media under explicit authorization.
- `src/components/editor/media-library.tsx` is an existing legacy-editor UI. It must not become the new Studio foundation; extract/reuse its API behavior and build a Studio-native surface.
- Existing upload limits are safety and capacity controls, not a promise of infinite storage. Future entitlements must own plan-based quotas and limits. Do not silently increase live quotas or storage budgets in this phase.

### Blogging

- Existing `website_posts` and `website_post_revisions` tables and migrations `0017`–`0023` already establish article records, taxonomy/SEO, schedules, legacy import metadata, news metadata, and revision restore.
- Media references are already validated for featured and inline article media.
- Phase 6 blogging work must audit and complete this existing system; do not create a second posts/content model.

### Commerce, subscriptions and domains

- The existing billing ledger, payment-attempt and webhook foundations are present.
- Existing website-domain records, hostname availability and publishing integrations are present.
- These systems require audit and hardening before adding new customer-facing commerce or subscription behavior. No live payment, domain registration, DNS, billing or entitlement changes are authorized by this specification.

## 3. Platform invariants

1. LUCIA Core remains the identity authority.
2. Every customer asset and business record is tenant-scoped and website-scoped where appropriate.
3. Organization/website identifiers supplied by clients are selectors, never authorization.
4. Existing RLS, tenant transactions, permission guards and server-only storage credentials remain authoritative.
5. Object keys and provider credentials never reach client components. Browser upload URLs are short-lived, object-specific and restricted to the intended upload operation.
6. Media references are opaque stable IDs, never caller-supplied object keys or arbitrary URLs.
7. Rendering and publishing must resolve media only through an authorized server-side resolver bound to the exact website and organization.
8. An asset referenced by graph nodes, drafts, published output, article bodies, featured images, revisions or recovery snapshots cannot be deleted. Reference checks and save/publish operations must share compatible locking/order to prevent races.
9. Uploads are bounded by file signature, MIME, byte limits, checksums, quotas, concurrency/rate controls and reconciliation. Uncertain provider outcomes retain reservations until safely reconciled.
10. Media deletion is explicit and recoverable; no bulk deletion, orphan cleanup of customer data, or storage-bucket-wide operations.
11. No production migrations, live storage acceptance, publishing, payment settlement, DNS operations or changes to customer quotas without separate explicit approval.
12. Core deterministic platform behavior must not depend on AI.

## 4. Media Library target

### Product behavior

- Lucia owns and operates the storage integration; customers own their tenant-scoped media records and choose where each asset is used.
- A website has a reusable Media Library available from Lucia Studio and the blogging workflow.
- Supported types in the first release: optimized JPEG/PNG/WebP image uploads, MP4/WebM video uploads, and PDF documents. New types require explicit format/security review.
- Browse/search/filter by type and status; show thumbnail or safe type icon, filename, alt text, caption, dimensions/duration, file size, upload state and storage usage.
- Upload progress, cancellation, retry guidance and refresh/reconciliation state must be explicit.
- Selecting an asset inserts a stable media reference into the graph or article draft; it must never copy a provider URL or storage key into content.
- The same website-scoped asset can be reused across pages, sections and articles.
- Show quota usage and explain when a plan or storage limit prevents an upload.
- Preserve the current safe retention rules and make protected/reference state visible.

### Graph and renderer integration

- A selected asset is represented by a `media_reference` graph node whose `assetId` is the existing `website_media.id`.
- A section/component connects to that node using the typed `references_media` edge.
- Node and edge creation must be one Graph Engine mutation batch with expected revision and idempotency key.
- The renderer must resolve the asset with a server-only resolver scoped to the exact organization and website. It must return only safe metadata and the platform media route, never storage credentials or object keys.
- Validation, preview and published rendering must use the same resolver contract.
- Deletion checks must include active graph media-reference nodes and immutable graph history snapshots, in addition to existing legacy drafts, article bodies, published snapshots and revisions.
- A media asset must not become publicly retrievable merely because it exists. Public delivery continues to require a published reference under the existing public-media authorization function.

### Initial implementation sequence

**6A.1 — Media architecture and boundary audit**
- Document existing schema, API, storage, quotas, RLS and reconciliation.
- Identify all reference sources and the exact lock order used by save/publish/delete.
- Add no duplicate media table or provider integration.

**6A.2 — Secure graph media resolution**
- Implement an authenticated website-scoped resolver for the renderer.
- Wire the resolver into Studio preview and validation.
- Add tests for missing, cross-website, cross-tenant, pending/deleted, malformed and valid media references.
- Ensure public rendering still uses the separately authorized published-media path.

**6A.3 — Graph reference integrity**
- Extend deletion protection to active graph references and immutable graph versions.
- Add concurrency/regression coverage so a media asset cannot be deleted while a graph mutation or publish operation attaches it.
- Do not mutate existing graph content or media records during this change.

**6A.4 — Lucia Studio Media Library**
- Add a Studio-native Media panel using existing list/upload/delete endpoints.
- Include type/status filters, search, accessible metadata, usage and upload progress.
- Add asset-to-selected-section/component attachment through a single Graph Engine mutation batch.
- Disable or explain attachment when the selected node is not a supported graph source.
- Do not extend the legacy editor UI as the new platform surface.

**6A.5 — Media acceptance**
- Focused service, API, resolver, graph-reference and Studio UI tests.
- Full unit suite, typecheck, lint, production build, routing/security checks and disposable PostgreSQL migration/RLS checks.
- Live object-storage acceptance remains a separately gated manual workflow and is not part of ordinary CI or this approval.

## 5. Remaining Phase 6 systems

### 6B — Blogging

Audit and complete the existing post/revision model and editor workflow. Require tenant isolation, safe rich content, slug uniqueness/redirects, taxonomy, SEO, featured/inline Media Library references, scheduling and immutable revisions. Publishing remains behind the existing controlled publishing path.

### 6C — Commerce

First define catalog/product/order/inventory boundaries and payment-provider contracts. Use integer minor currency units, idempotent order creation, verified provider callbacks, append-only settlement evidence, and explicit inventory reservation/release rules. No payment collection or live settlement until separately approved.

### 6D — Subscriptions and entitlements

Define plan catalog, subscription lifecycle, entitlement evaluation and quota enforcement. Entitlements must be deterministic server-side policy, not client flags. Media quotas, website limits, feature access and billing status must be derived consistently. Do not retroactively change existing customers' access or quotas without an approved transition.

### 6E — Domain management

Audit existing domain ownership/verification, hostname uniqueness, TLS readiness and publishing integration. Separate domain intent from external DNS/provider side effects. Domain registration, DNS changes and production cutover require explicit per-action approval.

## 6. Phase acceptance

Phase 6 is complete only when each subsystem has:
- A documented stable contract and clear ownership boundaries.
- Tenant/RLS and role-based authorization tests.
- Input validation, idempotency and concurrency protections where relevant.
- Focused regression tests and complete CI verification on the exact accepted commit.
- No destructive change to existing customer content or production state.
- A documented manual gate for any external provider or live operation.

The Media Library is the first deliverable. Blogging, commerce, subscriptions/entitlements and domains remain separate increments and must not be treated as complete merely because related legacy tables already exist.
