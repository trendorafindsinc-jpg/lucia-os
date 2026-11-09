# Phase 5 — Roles, permissions, and audit

## Authority boundary (canonical)

LUCIA Core authenticates the person only. LUCIA OS owns organisation membership, roles, permissions, product entitlements, billing and the product audit trail. Do not call undocumented Core tenant/authorization/entitlement APIs or treat a successful LUCIA ID sign-in as blanket access.

LUCIA OS must enforce permissions server-side for every protected operation. UI visibility is convenience, never an authorization boundary. Organisation membership, role, action permission and paid entitlement are distinct checks.

## Existing foundation

- `src/lib/access/policy.ts` and its tests provide local permission-policy foundations.
- Server-side route guards and local membership data exist in the application.
- Phase 2 adds database RLS and transaction-local user/organisation context, but it remains unaccepted until all isolation and rollback gates pass.
- The presence of helpers or local rows alone does not prove every route is guarded or every role transition is safe.

## Permission model

Use stable, namespaced permission keys consistently across server routes and UI. Current candidate keys include:

- `website.view`
- `website.edit`
- `website.publish`
- `website.domains.manage`
- `website.forms.read`
- `website.members.manage`
- `workspace.members.manage`
- `workspace.settings.manage`

Treat these as application policy keys that must be reviewed against actual route actions, not a claim that every key is already wired. Deny by default for unknown permissions, missing membership, inactive members, malformed context, and database/policy errors.

## Required role rules

- A user's role must be checked against the active membership in the selected organisation; never accept a role from a request body or browser state.
- Organisation-level roles cannot grant platform-staff access.
- Membership removal, role changes, ownership transfer and invitations must have explicit server routes, actor permission checks, conflict handling and audit records before being presented as functional controls.
- A user's access change must take effect on the next protected request; do not rely on stale client state.
- Resource ownership must be verified independently of broad role checks.

## Audit contract

LUCIA OS owns the product audit trail. Sensitive actions should record actor, organisation, action, target, outcome, timestamp and a correlation/request ID. Audit writes must be durable and failure handling must be explicit; never claim an audit event was written if persistence failed. Avoid recording passwords, session tokens, OAuth codes, payment secrets or unnecessary personal data.

## Acceptance evidence still required

1. Build a route/action permission matrix and verify each protected API uses the correct guard.
2. Test allowed and denied access for owner/admin/member/viewer (only roles actually supported by the product).
3. Test inactive/revoked membership, unknown permission, malformed organisation context and database outage; all deny safely.
4. Verify cross-tenant reads/writes are denied under a non-owner, non-`BYPASSRLS` role.
5. Verify member/role changes are authorized, take effect immediately, and create durable audit events.
6. Prove organisation roles cannot access platform-staff routes.
7. Verify audit correlation IDs and safe logging without secrets.
8. Keep Phase 5 open until tests and route coverage are evidenced; no production migration, deployment or merge is implied.

## Dependency

Phase 5 depends on Phase 2's database isolation and Phase 4's verified workspace context. It does not depend on Core tenant/permission endpoints because LUCIA Core's approved boundary is authentication only.
