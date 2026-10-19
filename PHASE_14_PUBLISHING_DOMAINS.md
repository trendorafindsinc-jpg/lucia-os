# Phase 14 — Publishing & Domains

**Promise:** Your website, when it is ready.

This phase makes publishing a real, tenant-safe workflow. This specification is not evidence that production publishing or domains are already configured.

## Customer journey
1. Enter website name, headline, short description, and optional hostname.
2. Preview without publishing.
3. Save a durable draft and restore it after reload.
4. Review server-derived readiness checks.
5. Publish only when required checks pass; preserve the draft and last good publication on failure.
6. See accurate publication, domain-verification, and TLS status.

## Mandatory safeguards
- Persist website data in the existing PostgreSQL/Drizzle layer with organisation-scoped access on every read and write.
- Verify LUCIA ID/Core session, organisation membership, role, publish permission, and product entitlement server-side. Fail closed if authorization cannot be verified.
- Normalize and reserve LUCIA subdomain slugs transactionally with database uniqueness and reserved-name checks.
- Keep drafts separate from immutable published snapshots; atomically switch the published version only after validation.
- Public host routing resolves only verified host records and published snapshots; never expose drafts or data from another tenant.
- Custom domains accept hostnames only. Require a server-verified DNS ownership challenge; report TLS ready only when the provider confirms an active certificate.
- LUCIA subdomain publishing must not require a custom domain. Custom domains remain optional but cannot be marked live until DNS and TLS are verified.
- Audit publish/domain actions, validate inputs, rate-limit sensitive endpoints, and return actionable errors without leaking secrets.

## Seven readiness checks
1. Content valid and saved.
2. LUCIA address reserved uniquely (a preview is not a reservation).
3. Custom domain optional; if supplied, it must be verified before serving.
4. Durable tenant-isolated storage is connected and the draft is saved.
5. LUCIA Core authorization and entitlement checks pass.
6. Public renderer and tenant/host routing are operational.
7. Domain ownership and TLS are confirmed for custom domains; this is not a blocker for LUCIA-subdomain-only publishing.

Readiness is computed on the server and rechecked at publish time; never trust a browser checklist or fixed progress count.

## Acceptance tests
- Draft survives reload and is isolated across tenants.
- Preview never changes the live version.
- Publish fails closed on authorization, entitlement, storage, or renderer failure.
- Concurrent slug claims cannot both succeed.
- Failed publish preserves the previous live version.
- Public requests serve only the correct tenant's published snapshot.
- Unverified domains and domains without active TLS are never shown as live.
- Lint, typecheck, tests, and production build pass before merge.

Use the existing architecture and provider adapters: no duplicate identity system, second database, or per-customer Vercel deployments. Actual DNS, hosting, and certificate state must come from provider verification, not UI assumptions.