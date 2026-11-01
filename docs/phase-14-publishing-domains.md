# Phase 14 — Publishing and custom domains

## Scope and implementation reported by the current codebase

- Durable publishing workspace for websites in the signed-in user's active organisation memberships.
- Draft saving to tenant-scoped PostgreSQL storage without replacing the existing live snapshot.
- Server-side publish checks for the LUCIA ID-backed product session, active organisation membership, and `website.publish` permission.
- A separate published snapshot switched atomically with website status and publication timestamp.
- A public renderer intended to read published snapshots only.
- Wildcard customer subdomain routing under `*.lucia.name.ng` on the shared Vercel deployment, with reserved slug protection and unique published-subdomain ownership.
- Unit coverage for host resolution, reserved labels, and custom-domain input validation.

These bullets describe repository implementation, not proof of production readiness. Database RLS, exact production migration state, real-domain rendering, and cross-tenant denial require separate evidence.

## Domain and ownership rules

- A free LUCIA subdomain is part of the free baseline and does not require custom-domain activation.
- A custom-domain *capability* may be a one-time LUCIA software purchase, granting durable entitlement to the purchased capability under its licence. It does not include third-party registrar fees, domain renewals, paid email, or other external recurring costs.
- Buying the capability does not itself register a domain, prove DNS ownership, issue TLS, or publish a site on that domain.
- Custom domains require explicit domain ownership/DNS verification, provider-confirmed TLS readiness, website publish permission, and successful live-render verification before being marked active.
- Do not describe custom-domain activation as a recurring LUCIA subscription. Do not charge, activate an entitlement, or claim a domain is live based on a browser redirect.

## Required before acceptance

1. Verify save/publish authorization inside the transaction and preserve the last-known-good live snapshot on any failure.
2. Test public reads using a deliberately scoped public published-site policy; verify drafts, unpublished sites, and cross-tenant private content are inaccessible.
3. Prove tenant isolation using a real application login role with `NOBYPASSRLS`, not an owner or role with RLS bypass.
4. Verify hostname normalization, reserved names, duplicate claims, domain ownership challenge, DNS propagation/failure, TLS pending/failure, and domain detachment/revocation.
5. Run browser E2E: edit, save, preview, publish, refresh, then load the exact public hostname; verify the new live site and preservation of the old live snapshot after injected failure.
6. Confirm migration state on a non-production staging database before any production rollout.

## Safety boundary

No production migration, database mutation, DNS change, payment, entitlement activation, or public feature launch is authorised by this phase document. Phase 14 remains unaccepted until the evidence above is recorded.
