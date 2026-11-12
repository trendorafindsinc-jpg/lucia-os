# Phase 2 — WordPress-style Block Editor and Public Content

**Repository:** `trendorafindsinc-jpg/lucia-os`  
**Target branch:** `development`  
**Implementation branch:** `feature/phase-2-block-editor-public-content`  
**Status:** Implementation review; automated and staging acceptance pending.

## Existing architecture retained

- `website_posts` remains the only authoritative Blog/News content table.
- `content_blocks` remains the structured JSONB content representation.
- `website_post_revisions` remains the revision history.
- Website-scoped article APIs continue to enforce LUCIA ID session, active organisation membership, website ownership, edit/publish permissions, RLS and optimistic revision checks.
- The existing publication operation remains responsible for creating or replacing `publishedSnapshot`.
- No second articles table, WordPress backend, auth system, tenant model or media store is introduced.

## Block editor

The Publishing Studio uses a structured writing canvas with:

- Paragraphs, headings H2–H6, ordered/unordered lists, blockquotes, tables, dividers and links.
- Block insertion, inline editing, type conversion, reordering, duplication and deletion.
- Paragraph formatting for bold, italic, underline, strikethrough and links.
- Optional advanced source editing retained for existing workflows.
- A 200-block limit matching the existing persistence contract.

The article title remains the page H1; content headings start at H2 to preserve page hierarchy.

## Persistence and public rendering

- Structured blocks are validated by the existing article model.
- Draft saves and revision snapshots retain block order and content.
- Authorized publish snapshots now include the structured blocks.
- Draft preview and public article detail rendering use the same block renderer.
- Structured output passes through the existing HTML sanitizer. Legacy Markdown/HTML source remains supported through a compatibility block.
- The public content contract includes structured blocks for consumers that use it.

Public Blog and News resolution continues to filter by the exact `kind` and `status = 'published'`. Article detail URLs use the published slug under `/blog/{slug}` or `/news/{slug}`. Drafts without a published snapshot and published slug are not public.

## Staging data inspection (read-only)

On the staging database branch, the selected published website had one Blog row in `draft` state, with no published snapshot, no published slug, an empty body and zero content blocks. It had no News rows and no published Blog or News rows. Its website record was published and its staging hostname binding was active.

This explains why the public Blog/News listings were empty at the time of inspection: the public query correctly excludes drafts, and there was no publishable content. The existing draft was not modified or promoted. This database inspection does not replace the required authenticated publish journey.

## Acceptance still required

- Run lint, typecheck, Drizzle consistency, focused unit tests, production build and host-routing checks on the final PR head.
- Complete the authenticated staging workflow: create and save a Blog draft, reload, reorder/edit blocks, preview, publish, and verify its public listing and detail URL.
- Repeat for News and confirm Blog/News separation.
- Verify unpublished URLs fail closed and a second tenant cannot read or mutate the article.
- Complete mobile browser acceptance.
- Manually trigger the staging deployment only after automated checks pass. No production deployment or `main` change is authorized by this work.
