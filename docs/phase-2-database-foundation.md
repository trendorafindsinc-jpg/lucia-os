# Phase 2 — Database and multi-tenant foundation

## Implemented baseline

- Drizzle ORM schema and PostgreSQL migrations for application-side Core subject references, organisations, memberships, websites, website pages, domains and tenant billing/support records.
- Immutable UUID organisation identifiers and database uniqueness constraints.
- Tenant-aware indexes and composite uniqueness for organisation-scoped website slugs and page paths.
- PostgreSQL row-level security (RLS) on selected tenant-owned records.
- Strict UUID validation for tenant context values.

## Phase 2 work in progress

- Enforce a composite foreign key from website pages `(organization_id, website_id)` to the matching website `(organization_id, id)`. This prevents a page from naming a website in another organisation even when both UUIDs exist.
- Add transaction-scoped helpers for parameterized `set_config('app.current_organization_id', $1, true)` and `set_config('app.current_user_id', $1, true)`; both contexts are cleared automatically at transaction end.
- The migration checks for existing mismatched page/website ownership before changing constraints. It must fail safely and report the integrity problem rather than silently reassign or delete data.
- CI runs `npm run db:check` to catch Drizzle migration journal/schema inconsistency.
- `getCurrentOrganizationAccess` now resolves a membership inside a transaction with verified local-user context, preparing for non-recursive membership RLS.

## Security contract

1. LUCIA Core remains the authentication authority. `app_users.core_subject_id` is only a local reference to a verified Core subject; it is not a local login credential.
2. Every protected request must validate the Core session and confirm an active organisation membership and required permission before accessing tenant data.
3. Use user context only with a local user ID derived from the verified server session. Use tenant context only after authorization, inside the same transaction as tenant queries.
4. Never accept organisation scope from a hostname, query parameter, form body or client-side state as authorization. A requested organisation ID is only a selector until membership and permission checks succeed.
5. Use a non-owner database role for application queries. Table owners and roles with `BYPASSRLS` can bypass RLS; production role setup is a deployment gate.
6. Public published-site reads are intentionally separate from private tenant access. The composite foreign key protects the relationship between a page and its owning website.
7. Do not run migrations against production as part of this phase. Migration behavior and RLS must be verified on a dedicated non-production Neon branch first.

## Verification recorded (2026-10-25)

- GitHub Actions Quality checks run `40189055910` passed lint, typecheck, Drizzle migration consistency, unit tests and production build for the earlier Phase 2 revision. The current user-context helper and guard changes still require fresh CI verification.
- On disposable Neon branch `phase-2-tenant-integrity-test`, the clean migration preflight passed and the composite ownership foreign key was added. A cross-organisation page/website insert was rejected by the composite FK.
- On separate disposable branch `phase-2-preflight-failure-test`, a deliberately mismatched page row caused the migration preflight to fail with the expected ownership-integrity exception; the invalid row was not silently rewritten or deleted.
- A least-privilege `NOBYPASSRLS` role could not read or update organisation B's draft website when organisation A was the transaction context.
- **Policy design test (disposable Neon branch only):** enabling candidate RLS policies on `organizations` and `organization_memberships` hid all rows without user context and exposed only the single organisation/membership associated with a test user when `app.current_user_id` was set. The test user could not read another organisation's records. These candidate policies are not yet committed as a migration because every route that queries memberships/organisations must first establish the correct user context and creation/update paths must be covered.
- The initial Neon-created test role had `BYPASSRLS`; it was not used as proof of isolation. A separate `NOBYPASSRLS` role was used for the passing isolation assertions.
- No production migration, production data change, merge, or deployment occurred.

## Acceptance evidence still required

- Wire transaction-scoped user context into every protected route that performs membership/organisation lookups, including onboarding, domains, AI proposal, publishing, member management, website draft/version and support flows.
- Add the tested RLS policies as a migration only after route coverage is complete; include safe creation of an organisation and its initial owner membership.
- Prove cross-tenant read/write denial across relevant tenant-owned tables with a non-owner, non-`BYPASSRLS` role, including missing/invalid context and mismatched page-to-website ownership.
- Run fresh CI on the current head, verify rollback/recovery on a disposable branch, and review the full resulting diff.
- No production migration or merge until the security and acceptance gates pass.
