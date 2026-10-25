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

## Security contract

1. LUCIA Core remains the authentication authority. `app_users.core_subject_id` is only a local reference to a verified Core subject; it is not a local login credential.
2. Every protected request must validate the Core session and confirm an active organisation membership and required permission before accessing tenant data.
3. Use the tenant context helper only after authorization, inside the same transaction as tenant queries. It sets `app.current_organization_id` using a parameterized, transaction-local setting.
4. Never accept organisation scope from a hostname, query parameter, form body or client-side state as authorization. A requested organisation ID is only a selector until membership and permission checks succeed.
5. Use a non-owner database role for application queries. Table owners and roles with `BYPASSRLS` can bypass RLS; production role setup is a deployment gate.
6. Public published-site reads are intentionally separate from private tenant access. The composite foreign key protects the relationship between a page and its owning website.
7. Do not run migrations against production as part of this phase. Migration behavior and RLS must be verified on a dedicated non-production Neon branch first.

## Acceptance evidence still required

- Run lint, TypeScript, unit tests, migration consistency checks and production build against this phase branch.
- Apply migration on a disposable non-production PostgreSQL/Neon branch and verify rollback/recovery behavior.
- Prove cross-tenant read/write denial using a valid non-owner application role, including missing/invalid tenant context and mismatched page-to-website ownership.
- Verify existing tenant website/page records pass the migration preflight.
- Review the resulting diff and checks before merging. No production database has been provisioned or migrated by this phase.
