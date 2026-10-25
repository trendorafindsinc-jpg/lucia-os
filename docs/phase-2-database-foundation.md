# Phase 2 — Database and multi-tenant foundation

## Implemented baseline

- Drizzle ORM schema and PostgreSQL migrations for local user references, organisations, memberships, websites, website pages, domains and tenant billing/support records.
- Immutable UUID organisation identifiers and database uniqueness constraints.
- Tenant-aware indexes and composite uniqueness for organisation-scoped website slugs and page paths.
- PostgreSQL row-level security (RLS) on tenant-owned records, including organisation/membership visibility, domains, versions, billing, support, staff-grant self-read and audit-event visibility.
- Strict UUID validation for tenant context values.
- Composite foreign key from website pages `(organization_id, website_id)` to the matching website `(organization_id, id)`.

## Phase 2 work in progress

- Transaction-scoped helpers set `app.current_organization_id` and `app.current_user_id` with parameterized `set_config(..., true)`; context is cleared at transaction end.
- The page/website ownership migration checks existing data before changing constraints and fails safely instead of silently reassigning or deleting mismatched rows.
- CI runs `npm run db:check` to catch Drizzle migration journal/schema inconsistency.
- `getCurrentOrganizationAccess` resolves membership inside a transaction with verified local-user context.
- User-scoped membership lookup has been wired into protected workspace, onboarding, domain, AI proposal, publishing, website draft/version, member management, support and billing paths; each call site still needs explicit context/negative-case verification.

## Security contract

1. LUCIA Core is global authentication only. `app_users.core_subject_id` is a local reference to a verified Core subject, not a local login credential.
2. Every protected request validates the local session derived from Core authentication and checks local organisation membership and permissions before accessing tenant data.
3. User context must come from the verified server session. Organisation context is set only after local authorization, inside the same transaction as tenant queries.
4. Never accept organisation scope from a hostname, query parameter, form body or client-side state as authorization. A requested organisation ID is only a selector until membership and permission checks succeed.
5. Use a non-owner database role without `BYPASSRLS` for application queries. Table owners and roles with `BYPASSRLS` can bypass RLS; production role setup is a release gate.
6. Public published-site reads are separate from private tenant access. The composite foreign key protects the relationship between a page and its owning website.
7. Do not run migrations against production as part of this phase. Migration behavior and RLS must be verified on a dedicated non-production Neon branch first.

## Verification recorded (2026-10-25)

- Quality workflow #211 passed lint, TypeScript, Drizzle migration consistency, unit tests and production build on the original Phase 2 implementation head `68e137fd7e353a1eafb0173cfb28b0926bf810f5`.
- On disposable Neon branch `phase-2-tenant-integrity-test`, the clean migration preflight passed and the composite ownership foreign key was added. A cross-organisation page/website insert was rejected by the composite foreign key.
- On separate disposable branch `phase-2-preflight-failure-test`, a deliberately mismatched page row caused the migration preflight to fail with the expected ownership-integrity exception; the invalid row was not silently rewritten or deleted.
- The RLS hardening migration applied on the disposable branch, and PostgreSQL reports RLS enabled for organisations, memberships, websites, pages, domains, billing, support, staff grants and audit events.
- Restricted role `phase2_rls_probe` was verified as `NOBYPASSRLS` with SELECT/INSERT/UPDATE/DELETE table privileges.
- **Corrected user-scope test:** the first probe used a mistyped user UUID, so its zero-row result was a test-fixture error, not evidence of a broken policy. With the exact user ID from the stored active membership, user-only context exposed one membership and one organisation.
- **Missing-context test:** empty user context exposed zero memberships and zero organisations.
- **Invalid-context test:** a malformed UUID caused PostgreSQL to reject the query; application context validation must continue to reject malformed UUIDs before querying.
- **Cross-tenant read test:** with organisation A as the transaction context, a query for organisation B's membership rows returned zero rows.
- **Cross-organisation page/website write test:** a mismatched relationship was rejected by the composite foreign key on the disposable branch.
- A separate cross-tenant membership INSERT attempt was not completed; the tool blocked that write attempt. Do not count cross-tenant write denial as verified from that attempt.
- No production migration, production data change, merge or deployment occurred.

## Acceptance evidence still required

- Prove cross-tenant write denial for tenant-owned tables using a controlled integration test on the disposable branch, including membership, website, domain, billing and support records where applicable.
- Verify the organisation creation plus initial-owner membership transaction, including rollback if either write fails.
- Verify missing, valid and invalid context in reproducible automated tests, and audit every protected route's context and fail-closed behavior.
- Verify migration rollback/recovery on a disposable branch and review the complete resulting diff.
- Run fresh CI after any code or test changes made to this branch.
- Keep Phase 2 open and unmerged until all acceptance gates pass. No production migration or merge is authorized by this phase.
