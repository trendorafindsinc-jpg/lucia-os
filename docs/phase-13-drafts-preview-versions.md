# Phase 13 — Drafts, preview, version history and rollback

## Implemented

- A draft-safety workspace at `/versions` with editable example website content and SEO copy.
- A Zod-validated immutable snapshot helper and unit tests for cloning, ordering, rollback copy safety, retention limits, and invalid data.
- A tenant-scoped `website_versions` database model and GET/POST API for named checkpoints.
- Layer Studio checkpoint UI that requests the version API, lists saved checkpoints, and lets the user restore supported visual editor fields into the local draft.
- API-side 25-checkpoint retention; the acceptance-hardening branch serializes concurrent checkpoint writes per website and rechecks active membership/action permission inside the version read/write transaction.
- Restore does not auto-save or publish; the user must explicitly choose Save draft.

## Important boundaries

- Website draft checkpoints are editing/version-control history, not a commercial product catalogue or purchased software versions.
- Commercial software versions are defined separately in `docs/commerce-model-one-time-purchases.md`. A purchase grants the documented rights to its exact product/version; later versions are separate purchases unless explicitly bundled.
- Website history must remain independent of paid entitlements. A checkpoint never grants access to a paid capability.
- The checkpoint snapshot currently stores visual draft fields, page-structure snapshot, SEO title/description summary, and blog post count. It does **not** yet contain complete restorable page structure, full SEO settings, blog post bodies, or media assets.
- Restore currently applies visual editor fields only. Page structure, complete SEO settings, blog content and media are not fully restored.
- The editor draft and checkpoint history must be loaded from server persistence when a saved website is opened. A browser refresh must not silently discard a server-saved checkpoint or draft.
- Preview is not considered production-complete until it renders the selected snapshot through the actual website renderer privately, without publishing it.
- No Core authentication endpoints are invented; LUCIA Core remains global authentication only.
- No production migration, production data mutation, payment activation, or public feature launch is authorized by this phase document.

## Acceptance still outstanding

Phase 13 is **not complete** until all of the following are evidenced:

1. A saved checkpoint survives refresh, sign-out/sign-in, and reopening the same website.
2. Checkpoint creation is atomic: failed writes leave the existing history unchanged.
3. Concurrent checkpoint creation cannot exceed the 25-entry retention policy or delete the wrong tenant's records.
4. Authentication, active membership, and action-specific permission are enforced server-side for every read and write, including rechecks inside the data transaction.
5. A non-owner `LOGIN NOBYPASSRLS` test role proves cross-tenant reads/writes are denied; owner-role success is not isolation evidence.
6. Browser/E2E tests cover create/list/restore/refresh, invalid website IDs, unauthenticated access, permission denial/revocation, cross-tenant attempts, retention beyond 25, and injected database failures.
7. Preview renders the chosen saved checkpoint privately using the real renderer; restore never publishes and never changes the last-known-good live version.
8. The supported snapshot contract is either expanded to restore the full promised website state or the UI explicitly limits the checkpoint to the fields it truly captures.
9. Exact-head CI, typecheck, lint, unit tests, database migration checks, and relevant browser tests pass.

Documentation or a successful build alone does not establish acceptance. Keep Phase 13 open until the evidence above is recorded.
