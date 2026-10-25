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

## Phase 13 exit decision

Phase 13 may exit **implementation and enter controlled beta** when the exact-head automated checks pass, code review covers the security and failure boundaries, and the interface accurately describes what restore does. It is not represented as production acceptance. This staged exit follows the project owner's instruction to use documented/code-reviewed evidence before beta, then capture runtime findings from the owner and beta testers.

Pre-beta code-review criteria:

1. Exact-head CI passes lint, typecheck, Drizzle migration consistency, unit tests and production build.
2. Authentication, active membership and action-specific permissions are enforced server-side and rechecked in read/write transactions.
3. Organization status and website existence are checked inside the relevant transaction; version writes serialize per website and prune history transactionally to 25.
4. Invalid IDs and payloads are rejected; responses containing private draft/history data are not cached.
5. Restore is accurately described as visual-fields-only; it never auto-saves or publishes. The live version is not modified by checkpoint creation or restore.
6. Scope limits and the beta verification checklist are recorded in `docs/phase-13-version-history.md`.

Beta follow-up remains open and must not be reported as already verified: cross-tenant denial using a non-owner `LOGIN NOBYPASSRLS` role; browser refresh and reauthentication persistence; permission revocation; concurrent retention; injected database failures; and preview privacy/rendering. Run those against a disposable staging environment. An owner-role query is not isolation evidence. Do not apply migrations to production, enable public commerce, or claim production readiness from this staged exit.
