# Website hostnames and domain entitlements

## Hostname ownership

- Every LUCIA subdomain and every customer custom domain is registered in `website_domains`.
- Hostnames are stored lowercase and normalized server-side before lookup. The database's global unique constraint is the final duplicate-claim guard.
- A request is served only when the exact normalized hostname has a matching `active` domain record and its website is published. Wildcard DNS is transport, not authorization.
- Unknown, pending, removed, suspended, or unverified hostnames must not fall through to a default tenant or website.
- Reserve platform/system names in the subdomain-claim service (including `www`, `os`, `admin`, `api`, `auth`, `core`, `mail`, `support`, `status`, and `app`). Keep the reserved list centralized and test it.
- Do not permit customer domains under `lucia.name.ng` to be registered as custom domains; those are platform subdomains and must use the subdomain-claim flow.

## Premium custom domains

- Free entitlement: a LUCIA-managed subdomain (for example, `myschool.lucia.name.ng`).
- Premium entitlement: a customer-owned domain (for example, `www.myschool.com`) after server-side Core/OS subscription entitlement checks.
- Never trust a client-supplied plan label. Check the current server-side entitlement on both domain creation and activation; deny custom-domain operations if the entitlement is absent, expired, suspended, or unknown.
- Custom domains remain pending until DNS ownership is proven using a high-entropy verification token. Never activate a domain solely because a CNAME resolves to this deployment.
- Activate only after ownership verification, the hostname points to the expected deployment, and HTTPS is provisioned/ready. Re-check DNS and entitlement before activation.
- Log domain claims, verification, activation, suspension, and removal in the audit trail.

## Release gate

The migration is a schema foundation only; it does not implement the claim API, Core entitlement lookup, DNS verification, TLS status checks, or hostname routing. Do not promote this to production until those paths exist and tests cover duplicate claims (including concurrent claims), reserved names, tenant isolation, invalid DNS proofs, expired Premium entitlement, and unknown-host rejection.
