# Phase 4 — Organisation and workspace management

## Core authority boundary

LUCIA Core owns tenant records, memberships, roles, permissions, product records, entitlements, and audit. LUCIA OS must not create local organization or membership rows and then treat them as authoritative. Phase 2's local organization tables are not proof of membership and must not be used to grant access.

## Implemented in this phase

- A server-only consumer adapter for the documented Core Consumer Contract v1 endpoints:
  - `GET /api/v1/consumer/tenants/:tenantId/context`
  - `POST /api/v1/consumer/authorization/check`
  - `POST /api/v1/consumer/entitlements/check`
- Validates tenant IDs, permission keys, and product keys before making requests.
- Sends the Core assertion server-to-server only, disables caching and redirects, and fails closed on non-success responses.
- A shared server-side helper for resolving the local product session.

## Contract gap before a usable workspace picker

The current contract exposes tenant context for a known tenant ID, but it does not document a consumer endpoint to list a user's tenants or create a tenant. It also issues Core assertions that expire after five minutes and documents no consumer refresh endpoint. Therefore a persistent workspace picker and tenant creation cannot safely be completed in LUCIA OS alone without inventing endpoints or copying Core authority.

Before finishing the customer-facing workspace UI, Core needs a documented and tested tenant-discovery/onboarding contract and a secure strategy for renewing/reacquiring short-lived assertions. Any create/invite/role-change workflow must call Core's authoritative operation.

## Security requirements

- A tenant ID, selected workspace, hostname, query parameter, or local DB row never proves membership.
- Every protected operation must call Core authorization for the required permission and check entitlement when relevant.
- Any unavailable or ambiguous Core result denies the protected operation.
- No local fallback role or entitlement grants access.
- Never store Core assertions in plaintext at rest or expose them to browser JavaScript.

## Not completed

No customer-facing workspace selector, tenant creation, invitations, member management, role customization, ownership transfer, or Core tenant-discovery endpoint is included. No database has been provisioned or migrated, and no production secrets have been configured. These are blocked on the Core contract gap above and require an end-to-end test after Core supports the flow.
