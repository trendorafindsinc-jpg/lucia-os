# Phase 16 — Manual IDrive Live Acceptance

Run only on `phase-16-premium-personalization-studio`. Production stays disabled and PR #138 stays draft.

## Exact one-time setup

GitHub repository → Settings → Secrets and variables → Actions → New repository secret:

- `PHASE16_IDRIVE_ACCESS_KEY_ID`: IDrive e2 access key with read/write/delete object permissions **only** on `lucia-os-customer-media-2026`; no bucket deletion.
- `PHASE16_IDRIVE_SECRET_ACCESS_KEY`: its matching secret access key.

Configure values directly in GitHub. Never paste them into chat, issues, logs, build scripts, source code or artifacts. Vercel S3 variables are intentionally not read by GitHub Actions.

Then: Actions → **Phase 16 LIVE IDrive storage acceptance (manual only)** → **Run workflow** → choose `phase-16-premium-personalization-studio`. The workflow has no push or PR trigger; run once only.

## Isolation and evidence

A fresh GitHub-hosted PostgreSQL service named `lucia_phase16_acceptance` is migrated from the existing Drizzle history. NOBYPASSRLS runtime role and the existing `createContinuityFixtures` helper establish two synthetic authenticated accounts and distinct websites. Synthetic hashed sessions are **not** live LUCIA Core OAuth. Tests call compiled Next.js HTTP endpoints, not provider mocks. IDrive operations use the existing server-side signed adapter, and an independently signed HEAD checks object size/type. Objects use the application's normal `os/{org}/{website}/{id}.webp` keys, with unique generated test-only UUIDs and no unrelated bucket.

Safe machine-readable evidence is uploaded as a 7-day Actions artifact, including test names, outcomes, sizes and cleanup status without secrets, signed URLs or actual customer content.

The workflow intentionally FAILS CLOSED while either of these is unverified:

1. The current v2 website version API does not expose historical v2 composition snapshots for real persisted rollback. Re-publishing the original uploaded image after a replacement is tested, but this is **not** represented as full historical revision recovery.
2. No founder-approved disposable canary bucket was specified. A key scoped to the OS bucket cannot be independently proven to deny another bucket without an authorized canary; administrative verification is required. Never probe unrelated product buckets.

Cleanup works only with this run's synthetic site/IDs. It removes all draft and published test references in disposable PostgreSQL, advances the **synthetic test records only** beyond the 30-day grace period, calls the real authenticated deletion endpoint, checks the object is 404 in IDrive, and drops only disposed synthetic records. Failed or ambiguous deletion is marked incomplete; uncertain objects are retained and reported rather than removed blindly.

**IMPORTANT:** A workflow execution can establish live upload/publication security; it must not print `PHASE 16 LIVE STORAGE — VERIFIED` while the two outstanding gates remain. Do not merge PR #138 or change production media flags based solely on this suite.
