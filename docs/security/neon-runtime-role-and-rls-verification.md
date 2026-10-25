# Neon runtime-role and RLS verification runbook

Status: operational instructions only. This file does not mean RLS has been verified or that the production database role has been changed.

## Why Neon role creation method matters

Neon documents that roles created through the Console, CLI, or API are granted membership in `neon_superuser`; that membership can provide `BYPASSRLS`. Roles created with SQL are not automatically granted `neon_superuser` and must receive explicit privileges. For an RLS test or application runtime, do not use the project owner or a Console/API-created role unless its effective privileges have been independently checked.

References:
- https://neon.com/docs/manage/roles
- https://neon.com/docs/manage/database-access
- https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- https://www.postgresql.org/docs/current/role-attributes.html

## Required role separation

Use separate identities for:
- **Migration/administration:** controlled operator credential that can run schema migrations.
- **Application runtime:** SQL-created role, not table owner, with `LOGIN`, `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, `NOREPLICATION`, and `NOBYPASSRLS`; explicit object grants only.
- **RLS verification:** a disposable-branch role without `BYPASSRLS`, tested against cross-tenant read and write attempts.

Never put the migration/owner connection string into the application runtime environment.

## Create a runtime role (run manually in the Neon SQL Editor or another authenticated SQL client)

Run only on the intended branch and database. Replace the role name if needed. Set the password via a secure secret-generation and entry process; do not commit it or paste it into chat/logs.

```sql
CREATE ROLE lucia_os_runtime
  LOGIN
  PASSWORD '<replace-with-a-strong-secret-out-of-band>'
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOREPLICATION
  NOBYPASSRLS;

GRANT CONNECT ON DATABASE lucia_os TO lucia_os_runtime;
GRANT USAGE ON SCHEMA public TO lucia_os_runtime;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA public TO lucia_os_runtime;

GRANT USAGE, SELECT, UPDATE
  ON ALL SEQUENCES IN SCHEMA public TO lucia_os_runtime;
```

The commands above grant privileges on existing objects; they do not grant schema ownership or DDL permissions. For future objects, configure default privileges for the role that creates those objects. Run this separately as the migration/object-owner role, replacing `lucia_os_owner` only if the actual migration owner differs:

```sql
ALTER DEFAULT PRIVILEGES FOR ROLE lucia_os_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO lucia_os_runtime;

ALTER DEFAULT PRIVILEGES FOR ROLE lucia_os_owner IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO lucia_os_runtime;
```

If production uses a different database name, schema, or migration owner, adjust those identifiers after inspecting the actual environment. Do not run the example unchanged against production without that review. Avoid granting `TRUNCATE`, `REFERENCES`, `TRIGGER`, schema `CREATE`, role membership, or `neon_superuser` to the runtime role.

## Verify role attributes before any rollout

Run these queries in the same branch/database where the role was created:

```sql
SELECT rolname, rolsuper, rolcreatedb, rolcreaterole, rolreplication,
       rolbypassrls, rolcanlogin
FROM pg_roles
WHERE rolname IN ('lucia_os_runtime', current_user);

SELECT member.rolname AS member_role, parent.rolname AS granted_role
FROM pg_auth_members AS m
JOIN pg_roles AS member ON member.oid = m.member
JOIN pg_roles AS parent ON parent.oid = m.roleid
WHERE member.rolname = 'lucia_os_runtime';
```

Expected for `lucia_os_runtime`: `rolsuper=false`, `rolcreatedb=false`, `rolcreaterole=false`, `rolreplication=false`, `rolbypassrls=false`, `rolcanlogin=true`, and no membership in `neon_superuser` or another broad-privilege role. A table owner can bypass RLS unless `FORCE ROW LEVEL SECURITY` applies, so the runtime role must not own tenant tables. Inspect grants as well as policies.

## Safe environment rollout

1. Create and test the role on a disposable Neon branch first.
2. Obtain a branch/database/role-specific connection string from the appropriate trusted workflow; keep its secret out of GitHub, logs, and chat.
3. Configure Preview/test to use the disposable branch and runtime role. Keep Production pointed at its current value until the replacement has passed verification and an explicit rollout decision.
4. Configure Production only through the secret manager after the same role attributes, grants, migrations, and app flows are accepted. Keep migration credentials separate.
5. Confirm Vercel environment targets separately; do not reuse a single owner credential for both Preview and Production.

## Acceptance checklist (still pending)

- [ ] Runtime role effective attributes and memberships are inspected on the intended branch.
- [ ] Grants cover only required runtime operations; role is not a table owner and does not bypass RLS.
- [ ] Missing, valid, malformed, and cross-tenant context tests cover organizations, memberships, websites/pages, domains, billing, support, and versions.
- [ ] Cross-tenant reads return no rows and cross-tenant writes fail under the runtime role.
- [ ] Organization creation and initial owner membership / website / page creation roll back atomically on injected failure.
- [ ] Migration and recovery are exercised on a disposable branch.
- [ ] Preview and Production environment values are reviewed independently without exposing secrets.

Until these checks pass, Phase 2 RLS verification remains **pending**. A successful lint/typecheck/build or a query executed as the Neon owner is not proof of tenant isolation.
