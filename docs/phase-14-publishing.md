# Phase 14 — publishing and domain authorization

## Implemented in this track

- The publish/save endpoint rechecks the current user's active organisation membership and action-specific `website.edit` / `website.publish` permission inside the same database transaction that reads or mutates website data.
- The publishing website selector rechecks active membership and publish permission inside each tenant transaction before returning website data.
- Custom-domain registration rechecks active membership and publish permission inside the same transaction as website ownership and hostname uniqueness checks.
- Public subdomain activation and published snapshot changes are part of the publishing transaction. A thrown validation, ownership or uniqueness error rolls back that transaction; the API reports that the previous live version remains preserved.
- Custom-domain registration is separate from publishing. No payment is taken, and a registered custom domain remains pending until its independent activation, DNS and TLS verification flow is implemented.

## Scope boundaries

- The public renderer still consumes the existing validated visual draft snapshot; page structure, content-library records, and SEO settings are not yet composed into a multi-page public snapshot.
- This phase does not change production DNS, custom-domain activation, or database data.
- LUCIA Core remains global authentication only; local OS membership and permissions remain authoritative.

## Verification still required

- Exact-head quality CI and browser tests.
- Test permission revocation between initial request and transaction, cross-tenant website/domain attempts, duplicate hostnames, and failed publication rollback on a disposable branch.
- Confirm previous published snapshots and active domains remain unchanged after an injected publication failure.
- Run migration and RLS checks with a non-owner `LOGIN NOBYPASSRLS` role before release.
