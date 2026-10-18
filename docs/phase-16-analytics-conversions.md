# Phase 16 — Analytics and conversion tracking

## Included
- `/analytics` workspace with explicit empty state and opt-in demo events; it does not fabricate traffic or claim live tracking.
- Strict event schema scoped to tenant and website identifiers, with a narrow event allowlist and path-only page identifiers.
- Query strings, arbitrary URLs, and personally identifying event payload fields are not accepted by the event contract.
- Deterministic aggregation for page views, distinct visitor sessions, form conversions, conversion rate, and most-viewed paths.
- Unit tests for event validation, privacy boundaries, aggregation, and empty-state behavior.
- Homepage navigation link and responsive dashboard UI.

## Prototype boundary
Demo events live only in client component state and reset on refresh. No tracking script, cookies, external analytics SDK, live event endpoint, database writes, or real visitor metrics are enabled. Tenant and website IDs in the demo are fixtures, not authenticated claims.

## Required before production
- Resolve tenant and website identity from a verified LUCIA Core session; never trust client-supplied tenant IDs as authorization.
- Persist events in tenant-isolated storage with access policies, retention/deletion controls, rate limits, deduplication, and auditability.
- Add a consent/privacy policy decision appropriate to each deployment and jurisdiction.
- Implement server-side ingestion, reporting windows/time zones, bot filtering, abuse protection, and end-to-end tenant isolation tests.
- Define conversion events from actual configured goals rather than assuming every form submission is a business conversion.

## Safety
No production deployment, database migrations, provider credentials, invented Core endpoints, or School OS changes.
