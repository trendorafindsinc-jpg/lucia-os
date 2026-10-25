# Phase 13 — Drafts, preview, version history and rollback

## Delivered in this phase
- A draft-safety workspace at `/versions` with editable example website content and SEO copy.
- Named version checkpoints with optional notes and timestamps.
- A private visual preview of the current draft or a saved checkpoint.
- Restore/rollback that copies the selected snapshot into the current working draft.
- A pure, Zod-validated version-history module with immutable snapshots and a 25-version limit.
- Unit tests for snapshot cloning, version ordering, rollback copy safety, history cap and validation.

## Important boundaries

- Website draft checkpoints and rollback history are editing/version-control features, not a commercial product catalogue. They must not be treated as subscription plans or as purchased software versions.
- Commercial software versions are defined separately in `docs/commerce-model-one-time-purchases.md`: customers purchase a specific product/version once and retain its documented usage rights; a later version is a separate purchase unless explicitly bundled.
- Phase 13 may preserve a site's draft/history independently of any paid software entitlement. Access to paid capabilities is checked separately by the server and must never be inferred from a website checkpoint.
- The workspace and history are held in React memory for the current browser session. Refreshing the page clears them.
- This is not durable database versioning, tenant-specific storage, audit logging, or cross-device restore.
- Preview is a private illustrative view, not a deployed public website or a fully rendered page from the template engine.
- Restore changes only the current in-memory draft. It does not publish, touch a live domain, or change production SEO.
- The schema/helper is groundwork for later tenant-scoped persistence and publication integration. No Core endpoints were invented.
- No production deployment, database migration, billing change, or School OS change was made.

## Acceptance still outstanding
Production-grade completion requires durable tenant-isolated storage, permission checks on every read/write/restore, concurrency handling, audit events, retained version policy, server-rendered preview and integration/E2E tests. These are not claimed as complete by this prototype.
