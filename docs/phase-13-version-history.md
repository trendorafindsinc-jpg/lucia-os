# Phase 13 — Layer Studio draft checkpoints

## Implemented in this track

- Layer Studio can save a named checkpoint through the tenant-scoped website versions API.
- A checkpoint includes the validated visual draft fields, page-structure snapshot, SEO title/description summary, and blog post count at checkpoint time.
- The API retains at most 25 checkpoints per website.
- Restoring a checkpoint updates the visual editor's local draft only. It does not publish or automatically overwrite the currently saved draft; the user must explicitly choose **Save draft**.
- Provider/API errors are shown without reporting false success.

## Scope limits

- The current restore action restores the visual editor fields only. It does not restore page structure, full SEO settings, or blog/media content.
- Published content and the last-known-good live version are not modified by checkpoint creation or restore.
- This UI does not prove tenant isolation or durable database behavior until tested with a non-owner `LOGIN NOBYPASSRLS` role.

## Verification still required

- Exact-head CI, browser flow, unauthorized/cross-tenant denial, version retention beyond 25, and reload persistence.
- Confirm failed checkpoint creation leaves the previous history unchanged.
- Confirm restored visual draft is not published and is only persisted after explicit Save draft.
