# Phase 15 Upgrade — Integrated Blog, News and Media

**Approval:** Founder-approved specification (1 November 2026). **Implementation/acceptance:** pending.  
**Parent:** [Phases 14–16 Studio Upgrade Programme](../phase-14-16-studio-upgrade-programme.md).  
**Retains original Phase 15 obligations:** real previews, selection, durable project creation and fidelity between preview/selected/published Layouts.

## Mission

A customer selects **their existing website** in Layout Studio and can **Write Blog**, **Publish News** or **Manage Media**, all within the same website context. A genuine publication appears on their real domain and survives reload, new sessions and future Layout changes. There is no separate CMS vendor and no second site renderer.

## Approved customer experience

- Entry through the site's Studio card/actions or compact in-editor action rail. No compulsory trip through the existing \`/content\` prototype. Keep compatible deep links where feasible.
- **One writing surface with two content-type actions:** Blog (posts, article listing, tags, featured image, author, date, optional categories) and News (news category, headline, summary, event/publication timestamps, status, featured story and update/correction handling). Use sensible defaults, optional advanced fields, autosave, Preview, Publish/Unpublish and clearly labelled real scheduling.
- Plain text and rich text content: straightforward typing, headings, links, images, embeds where permitted, bullet lists and safe paste/import from documents; ensure accessible semantic output. Sanitize HTML and URLs on input and rendering; never trust a rich-text editor alone for XSS protection.
- **Actual live routes and listings:** posts can be discovered through the site's navigation and article index, with clean unique slugs, published page SEO/meta/OG, sitemap consideration and stable redirects on slug changes. News and blog may share the same data model but have appropriate public sections. Schedule means a real durable job/worker with idempotent publication, not a cosmetic status.
- Publish from the article editor using the site's current authenticated project context. Site Layout changes or code deployments must retain posts and media by stable references and safe content APIs; deleting a whole Layout must not wipe articles.
- The **media library** shows real uploaded and approved files (not arbitrary URL records claiming upload): select/replace/reuse, upload progress, captions, image alt descriptions, optimized derivatives, usage/quota, referenced-by summary and remove only when safe. Support images, approved videos and documents first; audio is a documented extension if actual safe upload/delivery and quotas are accepted.
- Publishing a media item alone should not silently expose private drafts or upload the file into unrelated websites. User must choose visibility/use; published references determine safe public delivery.
- When offline or upload fails, clearly show unsaved draft; do not show green Published until backend confirms publication and live rendering. Provide preview-on-real-Layout, revision/restore for posts, and meaningful conflicts.

## Current repository baseline — distinguish implemented from planned

- \`src/lib/content/content-library.ts\`: validated JSON-based posts, media URL/key references, \`draft/review/scheduled/published/archived\` **labels**, limits; not a complete public blog/news engine.
- \`src/app/api/websites/[websiteId]/content-library/route.ts\`: authorized GET/PATCH of a persisted whole-library JSON payload, not per-article publication or scheduled jobs.
- \`src/components/content/content-library-workspace.tsx\` and \`src/app/content/page.tsx\`: prototype UX; the UI explicitly says changing a status label does not publish/schedule; a media record does not upload bytes.
- \`src/lib/media/storage.ts\`, \`src/lib/media/image.ts\`, \`src/app/api/websites/[websiteId]/media/route.ts\`: genuine **image-only** IDrive adapter/route. Key regex and MIME enforcement are WebP-only; the original image accepts bounded JPEG/PNG/WebP, compresses and stores ≤260 KB. Not a general video/document service.
- \`drizzle/0011_website_content_seo.sql\`, \`drizzle/0016_customer_media.sql\`: current content/media metadata and RLS foundation; do not silently replace with incompatible records.

## Persistence/content architecture

Use the existing PostgreSQL/Drizzle database. Add narrowly scoped normalized, tenant-authorized records as needed, e.g.:

- \`website_posts\`: immutable ID, organization/site association, author identity, contentType (blog/news), title, slug, excerpt, sanitized rich-content representation, status, created/updated/published/scheduled timestamp, SEO, content revision.
- \`website_post_categories\` / tags as validated per-website association; stable slugs and uniqueness scoped to website+content route.
- \`website_post_revisions\`: snapshots (or normalized revision entries), author, time, publishing/rollback trace.
- \`website_publication_jobs\`: schedule/execute idempotently, timezone-aware, retries with audit trail, no publication on unauthorised/deleted website.
- \`website_post_media\`: verified references to \`website_media\` or generalized typed media records, including publication retention and safe deletion checks.
- Required indexes and RLS policies must use existing organizational authorization; ensure reads from public custom-domain routes resolve ONLY published content from the correct tenant/site. Avoid global slug collisions, count/rate limits and unbounded queries.

**Legacy migration:** preserve JSON drafts from \`website_content_libraries\`. Introduce a compatibility reader/import, use idempotent migration with audited reconciliation, protect slug collisions and featured-image references, and keep the original rows until verified. A production migration requires separate release safeguards and a rollback plan. Do not map the old \`published\` label to a public release without explicit, validated publish action and evidence.

**Content-to-Layout contract:** the same renderer/registered section architecture exposes supported blog/news index, article and featured-content slots; built-in Layouts need consistent safe fallback compositions when a design lacks a dedicated journal/news region. All 48 must be able to present article content appropriately without requiring 48 independent CMS engines. Expose a read-only, versioned published-content contract for Code Studio (Phase 16), and do not reveal author drafts or private API credentials to custom scripts.

## IDrive e2 extension without a second provider

Reuse existing private LUCIA OS bucket and S3-compatible adapter boundary. **Do not claim the existing WebP-only adapter can already store videos.** Implement separate safe object key categories and metadata (mime, kind, bytes, checksum, status, duration/derivative when relevant, organization/site IDs). Validate source contents independently of file extension; quota per site/product and independent video byte/bandwidth policy. Image optimisation and EXIF removal remain. Documents require safe inline/download behaviour, MIME sniffing, appropriate Content-Disposition, no active HTML/JS/SVG injection and malware screening as needed.

For large video: authenticated intent → server-validated short-lived direct-upload or multipart authorisation → browser-to-IDrive transfer with restricted key/prefix/content constraints → server-side HEAD/checksum/size/type verification → DB finalized ready state → publication only when approved. Handle aborts, retries, orphan cleanup and provider failure without falsely clearing reserved quota. Do not stream multi-megabyte payloads through the small-image endpoint. Confirm approved bucket CORS, prefix restrictions and least-privilege key scope. Credentials are server-only; **prefer existing S3 variable family**. Do not invent a new media vendor or misrepresent cloud/provider usage/billing.

Public delivery may require streaming/range/caching for video and different storage tiers later; validate egress cost and performance before enabling high-volume videos. A current tentative 5 MB/image budget is not a usable video quota; set separate configurable policy, not unlimited uploads. Media referenced by historic page/post/deployment snapshots may not be deleted until retention rules permit.

**Phase 16 historic storage acceptance blockers remain in scope:** prove true persisted v2 rollback after image replacement and least-privilege bucket denial with an explicitly authorized evidence method. These are not satisfied by mock unit tests alone.

## Engineering delivery order

1. Audit and route integration: define real website-context UI, persistence mapping and public renderer hooks. Make a single blog post publish on a real domain via existing website infrastructure.
2. Normalize article data and safe migration from current JSON. Add per-post revision, status and authorized publish transaction with atomic public visibility and cache invalidation.
3. Add News using the common content engine; real lists/categories, SEO, archive/updates, idempotent scheduling worker and controlled unpublish.
4. Extend the existing IDrive media adapter for approved file kinds and delivery, configurable quota, cross-tenant protection and lifecycle. Verify true provider behaviour.
5. Integrate with all 48 Layouts and test content unchanged through edits, switches, rollbacks and Phase 16 custom-code handoff.

## Acceptance checklist

- [ ] A customer opens one existing website and creates, saves, reloads, previews, **publishes**, updates and unpublishes a Blog post on its public hostname; correct visibility in listing and article pages.
- [ ] The same for News with category and publication metadata; scheduled publication actually occurs at the requested timezone-aware time, idempotently; expired/revoked sites are denied.
- [ ] Rich text safe against XSS/unsafe embeds and accessible; title/slug duplication and malformed dates return useful errors, no loss of existing content.
- [ ] Article SEO/social metadata, site navigation, archive/listing, stable article URLs, authenticated revision/restore and imported legacy draft integrity are tested.
- [ ] Images persist through real IDrive upload→reload→preview→publish→rollback; supported video/document direct upload, checksum/type/size/quota/cancellation, public playback/download access and private access denial tested with actual objects.
- [ ] Site, post, media, author, category and published routes deny cross-tenant reads/writes; public routes resolve current domain owner only; deleting referenced media is blocked.
- [ ] All 48 Layouts can retain/render valid content and article links through Layout changes; Code Mode published-content contract is documented and secure.
- [ ] No additional CMS, storage vendor, client-side-only posts, misleading Published labels, unbounded files or public draft assets.
- [ ] Targeted tests, exact-head required CI, genuine mobile/browser, provider integration and founder acceptance evidence captured.

**Phase 15 DONE:** an ordinary person can author/publish Blog, News and approved media within the same website Studio; records, files, publication and ownership are durable and verified—not merely UI prototypes.
