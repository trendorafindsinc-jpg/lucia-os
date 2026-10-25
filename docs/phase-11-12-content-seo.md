# Phases 11–12 — persisted content and SEO settings

## Phase 11: Blog and media library

- `website_content_libraries` stores a validated content-library document per website, separate from published output.
- Posts remain drafts/review/scheduled/published/archived labels only; changing a label does not publish or schedule a post.
- Media records are references to HTTPS URLs or safe storage keys. This phase does not upload files or create storage credentials.
- Payloads are schema-validated and capped at 5 MB. Post slugs and IDs must be unique, and featured-image references must point to a registered image asset.
- GET/PATCH routes require local LUCIA OS membership and website read/edit permissions, set transaction-local user/organization context, and use tenant-scoped RLS.
- On load/validation failure the UI disables saving; changes are persisted only after the user explicitly chooses Save library.

## Phase 12: SEO and social settings

- `website_seo_settings` stores validated SEO/social settings per website, separate from the live published site.
- Canonical and social image URLs must be HTTPS and cannot include embedded credentials or fragments.
- Index/follow controls and Open Graph/X preview data are saved as workspace metadata. This phase does not automatically change robots, sitemap, canonical tags, or public page metadata.
- GET/PATCH routes require local membership and website read/edit permissions. Invalid stored JSON fails closed rather than silently resetting.
- On load failure, saving is disabled; settings are explicitly saved by the user.

## Verification still required

- Run migration `0011_website_content_seo.sql` on a disposable Neon branch and verify rollback/recovery.
- Test all GET/PATCH routes under a non-owner `LOGIN NOBYPASSRLS` role, including cross-tenant denial, missing context, inactive membership, and denied permissions.
- Browser-test save/reload, validation errors, concurrent saves, content size limit, media references, and failure-preserves-last-saved-data behavior.
- Publishing integration remains separate: draft status must not publish, and SEO metadata must not be applied to live output until the publishing pipeline explicitly consumes it.
- No production migration or deployment is implied.
