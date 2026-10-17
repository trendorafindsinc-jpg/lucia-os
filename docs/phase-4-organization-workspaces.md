# Phase 4 — Organisation and workspace management

This phase introduces authenticated organisation discovery and creation for a signed-in LUCIA ID user.

## Included

- Server-side lookup of the product session; the browser cannot choose its user ID.
- List only active organisation memberships belonging to the authenticated user.
- Create an organisation and its initial active Owner membership atomically.
- Validate and normalize organisation names; generate non-sensitive URL slugs with random suffixes.
- Reject cross-origin create requests when an Origin header is present.
- No organisation identifiers are treated as proof of membership.

## Security contract

Every future operation accepting an organisation ID must query active membership for the current authenticated user and then enforce the required role/permission. A selected workspace, hostname, query parameter, or client-side state is not authorization. RLS context must be set transaction-locally after authorization when querying tenant-owned data.

## Not included yet

Invitation and member-management flows, role customization, ownership transfer, Core-side membership sync, workspace UI, production database migration, and end-to-end verification. These must be implemented and validated before calling the workspace feature production-ready.
