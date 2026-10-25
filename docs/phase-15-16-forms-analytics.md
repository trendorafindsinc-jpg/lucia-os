# Phases 15–16 — forms and analytics foundations

## Phase 15: form settings and submissions

- `website_forms` stores one tenant-owned contact form definition and notification preferences per website.
- `website_form_submissions` is tenant-scoped, retains records for a default 90-day window, and stores no raw client IP or user-agent.
- Form settings and submission status updates require an active local LUCIA OS membership and website read/edit permissions checked in the transaction.
- Invalid stored settings and malformed submissions are not silently repaired.
- The admin workspace can persist form settings and load/mark existing submissions. Demo form submissions remain browser-session-only.
- Public form submission intake and email delivery are deliberately not enabled yet. They require verified public host-to-tenant resolution, a database-backed rate limit, spam protections, and retention/deletion handling before accepting unauthenticated visitor data.

## Phase 16: privacy-minimised analytics

- `website_analytics_events` stores only tenant/website, event name, a SHA-256 session identifier, a path without query strings, an optional conversion key, and timestamps.
- No names, emails, raw IPs, user-agent strings, or query-string values are stored.
- The analytics dashboard can read validated events for an authorized website. Demo event buttons remain session-only and are disabled for a selected saved website.
- Public event collection is not enabled yet. Before it can be enabled, the public host-to-tenant resolver, consent policy, rate limiting, event retention, and cross-tenant isolation must be verified.

## Verification still required

- Exact-head quality CI and browser acceptance.
- Migration `0012_forms_analytics.sql` on a disposable Neon branch; verify rollback and RLS with a non-owner `LOGIN NOBYPASSRLS` role.
- Cross-tenant read/write denial, inactive membership, invalid form payloads, submission status permissions, 90-day retention cleanup, and analytics path/session-hash validation.
- No public visitor intake, email delivery, cookies, external analytics SDK, production migration, or production data change is enabled by this phase.
