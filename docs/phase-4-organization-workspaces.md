# Phase 4 — Organisation and workspace management

## Authority boundary (canonical)

LUCIA Core is global authentication only. It authenticates the person; it does not own LUCIA OS organisations, memberships, roles, permissions, billing, entitlements, or audit records. After LUCIA ID authentication, LUCIA OS uses its own database and server-side policy to decide which workspaces the person can access.

A local organisation or membership row is authoritative only when created and read through LUCIA OS's validated server-side flows and protected by the database constraints, RLS, and permission checks. Client-supplied tenant IDs, hostnames, local storage, and browser state are selectors—not authorization proof.

## Existing implementation found

- `/api/onboarding/website` requires a valid local session and validates the setup payload.
- It creates an organisation and initial owner membership inside one database transaction when no matching active membership exists.
- It sets transaction-local organisation context before website/page reads and writes.
- It creates the website and its template-derived draft pages in the same transaction.
- Repeated setup can reuse an existing website matching the selected workspace and slug rather than duplicating it.
- The customer setup wizard persists unfinished form input in browser local storage and calls the server route when the user selects Create workspace.
- The Phase 2 branch adds transaction-local user/org scope helpers and hardens RLS. These protections are not yet accepted; do not treat them as production-proven until the Phase 2 acceptance gates pass.

## Required workspace behaviour

- Derive the current user only from the verified server session.
- Resolve active membership on the server before accessing a selected organisation's private records.
- Treat workspace selection as a requested target; verify membership and permissions before switching context.
- Scope all tenant queries and writes inside the same transaction where practical. Fail closed on missing, malformed, revoked, or ambiguous membership.
- Keep organisation creation, initial-owner membership and dependent website/page creation atomic. Any failure must roll back the entire operation.
- Prevent duplicate domains and website slugs using database constraints and tenant-scoped checks, not client-only validation.
- Keep workspace list, website list, editor, domain registration, save, preview and publish status coherent. A saved draft is not a published website.
- Show useful loading, empty, retry and permission-denied states; preserve form input after recoverable failures without treating local storage as authoritative data.

## Acceptance evidence still required

1. Fresh-user flow: create organisation + owner membership + website + draft pages; verify one transaction and rollback on injected failure.
2. Existing-user flow: reuse only a workspace the user actively belongs to; prove a similarly named workspace owned by another user is not reused.
3. Multi-workspace flow: switch between two memberships and prove website/page/domain reads and writes remain in the selected tenant.
4. Revoked/inactive membership and missing session fail closed.
5. Cross-tenant read/write tests pass using a non-owner, non-`BYPASSRLS` database role.
6. Duplicate slug/domain races resolve through database constraints with a recoverable error and no partial records.
7. End-to-end tests cover setup → saved website list → editor → save/preview → domain/publish status.
8. No production migration, deployment or merge until required tests pass and the user explicitly authorises the merge.

## Known dependency

Phase 4 depends on Phase 2 database integrity and tenant-isolation gates. It does **not** depend on LUCIA Core tenant-discovery, role, permission, entitlement, or audit endpoints; those are outside Core's approved authentication-only boundary.
