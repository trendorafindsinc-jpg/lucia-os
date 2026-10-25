# Phase 2 — Database and multi-tenant foundation

## Implemented baseline

- Drizzle ORM schema and PostgreSQL migrations for application-side Core subject references, organisations, memberships, websites, website pages, domains and tenant billing/support records.
- Immutable UUID organisation identifiers and database uniqueness constraints.
- Tenant-aware indexes and composite uniqueness for organisation-scoped website slugs and page paths.
- PostgreSQL row-level security (RLS) on selected tenant-owned records.
- Strict UUID validation for tenant context values.

## Phase 2 work in progress

- Enforce a composite foreign key from website pages `(organization_id, website_id)` to the matching website `(organization_id, id)`. This prevents a page from naming a website in another organisation even when both UUIDs exist.
- Add a transaction-scoped tenant context helper that uses parameterized `set_config('app.current_organization_id', $1, true)`; the scope is cleared automatically at transaction end.
- The migration checks for existing mismatched page/website ownership before changing constraints. It must fail safely and report the integrity problem rather than silently reassign or delete data.
- CI runs `npm run db:check` to catch Drizzle migration journal/schema inconsistency.

## Security contract

1. LUCIA Core remains the authentication authority. `app_users.core_subject_id` is only a local reference to a verified Core subject; it is not a local login credential.
2. Every protected request must validate the Core session and confirm an active organisation membership and required permission before accessing tenant data.
3. Use the tenant context helper only after authorization, inside the same transaction as tenant queries. It sets `app.current_organization_id` using a parameterized, transaction-local setting.
4. Never accept organisation scope from a hostname, query parameter, form body or client-side state as authorization. A requested organisation ID is only a selector until membership and permission checks succeed.
5. Use a non-owner database role for application queries. Table owners and roles with `BYPASSRLS` can bypass RLS; production role setup is a deployment gate.
6. Public published-site reads are intentionally separate from private tenant access. The composite foreign key protects the relationship between a page and its owning website.
7. Do not run migrations against production as part of this phase. Migration behavior and RLS must be verified on a dedicated non-production Neon branch first.

## Verification recorded (2026-10-25)

- GitHub Actions Quality checks run `40189055910` completed successfully: lint, typecheck, Drizzle migration consistency, unit tests and production build.
- On disposable Neon branch `phase-2-tenant-integrity-test`, the clean migration preflight passed and the composite ownership foreign key was added. A cross-organisation page/website insert was rejected by the composite FK.
- On separate disposable branch `phase-2-preflight-failure-test`, a deliberately mismatched page row caused the migration preflight to fail with the expected ownership-integrity exception; the invalid row was not silently rewritten or deleted.
- A least-privilege test role with `NOBYPASSRLS` was created only on the disposable test branch. With organisation A set as the transaction context, it could not read or update organisation B's draft website.
- **Blocking gap confirmed:** `organizations` and `organization_memberships` have RLS disabled and no policies on the test snapshot. The test role could read both organisations and both membership rows. This must be resolved before Phase 2 can be accepted.
- The initial Neon-created test role had `BYPASSRLS`; it was not used as proof of isolation. A separate `NOBYPASSRLS` role was used for the passing website isolation assertion.
- No production migration, production data change, merge, or deployment occurred.

## Acceptance evidence still required

- Resolve the RLS gap for `organizations` and `organization_memberships` without breaking the pre-authorization membership lookup flow or creating recursive policies.
- Wire transaction-scoped tenant/user context into the protected request paths; the helper existing alone does not mean app-wide enforcement is complete.
- Prove cross-tenant read/write denial across relevant tenant-owned tables with a non-owner, non-`BYPASSRLS` role, including missing/invalid context and mismatched page-to-website ownership.
- Verify rollback/recovery behavior on a disposable branch and review the full resulting diff.
- No production migration or merge until the security and acceptance gates pass.
