# Phase 13 — Layer Studio draft checkpoints

## Delivery status

**Code-scope review: ready for controlled beta after exact-head CI passes.** This is not a claim of production acceptance. Code review and automated checks are the available pre-beta evidence; real-browser and non-owner database isolation checks are explicitly deferred to beta and must be logged as issues if they fail. Keep checkpoint functionality scoped as a visual-draft checkpoint, not full-site rollback.

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

## Pre-beta checks and beta follow-up

Pre-beta code checks:

- Exact-head lint, typecheck, Drizzle migration consistency, unit tests and production build must pass.
- API review confirms UUID validation, authentication, active membership and action-specific permission checks, transaction-local RLS context, active-organization checks, website existence checks, no-store responses, validated snapshots, a per-website transaction advisory lock, and transactional retention capped at 25 entries.
- Checkpoint restore changes editor state only. The UI explicitly warns that page structure, full SEO settings, blog bodies and media are not restored; saving and publishing remain separate actions.

Beta follow-up (not represented as already verified):

- Browser create/list/restore/reload and sign-out/sign-in flows.
- Non-owner `LOGIN NOBYPASSRLS` cross-tenant denial against a disposable staging database.
- Concurrent retention, permission revocation, malformed historical rows and injected database failures.
- Confirm a restored visual draft persists only after explicit Save draft and never changes the last-known-good live site.

If beta cannot exercise a check, record it as unverified rather than converting it to a pass. Do not enable public commerce or represent this phase as production-ready.
