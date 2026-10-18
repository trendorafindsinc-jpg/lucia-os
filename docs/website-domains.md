# Website hostnames and domain entitlements

## Hostname ownership

- Every LUCIA subdomain and every customer custom domain is registered in `website_domains`.
- Hostnames are normalized on the server. The database's global unique constraint is the final duplicate-claim guard, including concurrent requests.
- The authenticated API is `GET/POST /api/websites/:websiteId/domains`. It requires an active organisation membership with `website.read` or `website.edit`; browser-supplied roles are ignored.
- Domain-table reads and writes set `app.current_organization_id` inside the same database transaction so the tenant RLS policy applies.
- Requests are served only when the exact normalized hostname has a matching `active` domain record and the website is `published`. Wildcard DNS is transport, not authorization.
- Unknown, pending, removed, suspended, or unpublished hostnames return 404; they never fall through to another website.
- Reserve platform/system names in the centralized subdomain-claim policy (including `www`, `os`, `admin`, `api`, `auth`, `core`, `mail`, `support`, `status`, and `app`).
- Domains under `lucia.name.ng` must use the LUCIA-subdomain flow, not the custom-domain flow.

## Current implementation boundary

- LUCIA subdomain claims are authenticated, normalized and protected by global uniqueness.
- Middleware rewrites non-platform hostnames to a server-rendered public-site route. That route performs an exact database lookup and renders only published pages belonging to the matched website and organisation.
- Custom-domain claims currently fail closed with HTTP 503. The current OS organisation schema does not yet provide a verified Core tenant mapping and the production consumer entitlement-check contract has not been validated. Do not remove this guard or trust a client plan label.
- The custom-domain flow still needs Core tenant mapping/provisioning, a server-authenticated entitlement check, DNS TXT ownership verification, deployment-target verification, HTTPS readiness, activation/suspension/removal APIs, and audit events before Premium custom domains can be enabled.

## Premium custom domains

- Free entitlement: a LUCIA-managed subdomain (for example, `myschool.lucia.name.ng`).
- Premium entitlement: a customer-owned domain (for example, `www.myschool.com`) only after current server-side entitlement verification.
- A custom domain must remain non-routable until a high-entropy ownership challenge is verified, DNS points to the expected deployment, HTTPS is ready, and Premium entitlement is still active.
- Never activate a domain solely because a CNAME resolves to this deployment.

## Release gate

This is not production-ready until the domain migration is applied through the approved migration process and tests cover concurrent duplicate claims, reserved names, tenant isolation, invalid DNS proofs, expired Premium entitlement, unknown-host rejection, and published-page tenant isolation. Do not apply the migration to production or promote production as part of this change.
