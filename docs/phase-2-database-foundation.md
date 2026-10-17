# Phase 2 — Database and multi-tenant foundation

## Implemented baseline

- Drizzle ORM schema and PostgreSQL migration for application-side Core subject references, organisations, memberships, websites and website pages.
- Immutable UUID organisation identifiers and database uniqueness constraints.
- Tenant-aware indexes and composite uniqueness for organisation-scoped website slugs and page paths.
- PostgreSQL row-level security (RLS) on tenant-owned websites and pages.
- Strict UUID validation for tenant context values.

## Security contract

1. LUCIA Secure/Core remains the authentication authority. `app_users.core_subject_id` is only a local reference to a verified Core subject; it is not a local login credential.
2. Every protected request must validate the Core session and confirm an active organisation membership before accessing tenant data.
3. The application must set `app.current_organization_id` using parameterized `set_config('app.current_organization_id', $1, true)` inside the same transaction as tenant queries. Transaction-local scope prevents leaking tenant context across pooled connections.
4. Never accept organisation scope from a hostname, query parameter, form body or client-side state as authorization. A requested organisation ID is only a selector until membership and permission checks succeed.
5. Use a non-owner database role for application queries. Table owners and roles with `BYPASSRLS` can bypass RLS; production role setup is a deployment gate.
6. Do not run this migration against production until a dedicated non-production Neon branch is identified, backed up, and migration behavior is reviewed.

## Scope not yet claimed

- No database has been provisioned or migrated by this phase.
- Core auth exchange, membership authorization middleware, roles/permissions, production Neon credentials and integration tests against a real PostgreSQL instance are future work.
- Migration is an initial baseline; no destructive table drops or production data resets are included.
