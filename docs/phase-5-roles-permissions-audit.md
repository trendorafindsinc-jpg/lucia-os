# Phase 5 — Roles, permissions, and audit boundaries

## Implemented foundation

- Server-only access-control helpers delegate authorization and product entitlement decisions to LUCIA Core.
- A protected operation must call `requireCorePermission(assertion, tenantId, permission)` before changing tenant data.
- Premium capability routes must also call `requireCoreEntitlement(assertion, tenantId, productKey)` where relevant.
- Both helpers require explicit, correctly shaped positive decisions. Denials, malformed payloads, and transport errors never grant access.
- The tenant ID is a locator only. Local `organizations` and `organization_memberships` rows are not authorization evidence.

## Permission naming

Use stable namespaced permission keys, for example:

- `website.view`
- `website.edit`
- `website.publish`
- `website.domains.manage`
- `website.forms.read`
- `website.members.manage`

These are consumer-side examples, not a declaration that the current Core instance has registered them. Core must define and assign the actual permission catalogue.

## Role and assignment rules

Core is authoritative for role definitions, membership, role assignment, and effective permissions. LUCIA OS must not implement local role grants, infer an Owner role from a local row, or allow organization-level roles to grant platform-staff capabilities. Role creation, invitation, member removal, ownership transfer, and staff access must use documented Core write operations when available.

## Audit boundary

Core owns the authoritative audit trail. Sensitive actions should record actor, tenant, action, target, result, timestamp, and a correlation/request ID through Core's documented audit operation. The current Consumer Contract material available to this application documents context, authorization-check, and entitlement-check reads only; it does not document audit-write or role/membership mutation endpoints. This phase therefore does not invent those endpoints or claim audit writes are live. Add the workflows once Core publishes the exact contract.

## Follow-up after v0.1

- Confirm the actual Core authorization/entitlement response schema and permission catalogue in an integration test.
- Add a documented assertion renewal/reacquisition strategy.
- Integrate Core role/membership write operations and audit writes once the server contract exists.
- Add tenant-isolation, revoked-membership, role-change, and audit-delivery integration/E2E tests.
- Do not run production migrations or configure production secrets as part of this phase.
