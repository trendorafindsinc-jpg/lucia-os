# Phase 1 — Existing Publishing Architecture Inspection

**Baseline:** `development` at `ac2e192ce80449fbd214d70c4cb0b14b8fe7f992` (after PR #151).

## Existing implementation

- **Article records:** `website_posts` is already the authoritative tenant-owned Blog/News table. It distinguishes `kind` as `blog` or `news`, and includes draft/publication state, optimistic revision number, SEO/taxonomy/news metadata, media reference, and a published snapshot.
- **Draft and revision persistence:** `website_post_revisions` records create/save/publish/restore snapshots. The existing article API creates drafts, lists website articles, and updates an existing article by ID with revision-conflict detection.
- **Website and tenant ownership:** every post has `organization_id` and `website_id`, with a composite foreign key to the owning website. API handlers resolve the authenticated session, active organization membership, required website permission, and website ownership server-side. RLS is enabled and forced on both article tables; tenant context is transaction-local.
- **Authentication:** `getCurrentUser()` resolves the existing product session. LUCIA Core remains the identity authority; no Core change is needed.
- **Media:** articles reference the existing `website_media` records and use `validateMediaOwnership`; no new storage path is required.
- **Authoring UI:** Layout Studio already launches `WebsiteStoryStudio` for Blog and News. It calls the website-scoped article API and supports creating, listing/reopening, saving, previewing, revision history, and the existing publication actions. The separate `/content` library explicitly identifies itself as a browser-local prototype and is not the authoritative article store.

## Phase 1 implementation decision

Extend `website_posts` rather than creating a second content table or backend. Add a non-null JSONB `content_blocks` column with an empty-array default and a database array/size guard. Validate reusable paragraph, heading, list, quote, and legacy-source block shapes at the application boundary. The existing body field and published snapshots remain intact; existing article bodies are represented as a single compatibility block when saved through the current authoring flow. Revision snapshots carry the structured blocks so draft restore preserves them.

The migration is additive and does not rewrite existing customer rows. Existing RLS policies and composite website/organization ownership constraints remain in place. No authentication, media-storage, publishing-rendering, or production configuration changes are required.

## Explicitly deferred

The current authoring UI remains the existing rich-text/Markdown/HTML authoring surface in this phase. The full Gutenberg-style block manipulation experience, media redesign, embeds, editorial management, scheduling enhancements, SEO UI, and website presentation redesign remain outside Phase 1.

## Release-gate baseline repair

The first Phase 1 quality run exposed a repository baseline omission, not a publishing regression. Two pre-existing layout tests (`src/lib/templates/premium-architecture.test.ts` and `src/lib/layout-blueprint/premium-layouts/meridian.test.tsx`) read `docs/layouts-48-premium-catalogue.md`; the file was absent from the `development` base used by PR #152. The tests exercise the approved canonical 48-layout inventory and Phase 12 architecture, so their dependency is valid. The authoritative versions were recovered byte-for-byte from the Phase 14 integration commit `5e584f35bff424e4163eb3f53a6c70070b012b01` (which carries the approved catalogue originally reconciled by PR #130), then restored to this feature branch. No placeholder, test skip, catalogue rewrite, or Phase 1 product change was made.

The same authoritative commit supplied `docs/phase-12-premium-layout-architecture.md`, which the first test also reads. Both documents are restored unchanged. The next quality run will establish whether this closes the baseline failure.

The Phase 1 authenticated acceptance harness is also extended to verify revision history visibility, restore persistence, cross-tenant revision read/restore denial, and stale-revision write conflicts for both Blog and News. These checks run against the disposable authenticated acceptance database, not the live staging tenant.