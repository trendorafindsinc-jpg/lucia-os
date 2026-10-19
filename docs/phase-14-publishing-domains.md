# Phase 14 — Publishing and custom domains

## Included in this phase

- A `/publish` workspace for site name, headline, description, candidate LUCIA slug, and optional custom hostname.
- Strict custom-domain hostname validation. Input is normalized to lowercase and a trailing dot is removed; schemes, paths, ports, IP literals and reserved test suffixes are rejected.
- A go-live checklist that distinguishes locally valid content/slug/domain syntax from production infrastructure readiness.
- Private illustrative preview and a generic explanation of the DNS setup that will be required once the platform has real domain targets.
- Explicitly disabled publishing control until the server-side publishing contract exists.
- Unit tests for hostname validation and the fail-closed readiness gate.

## Not claimed / blockers

This phase does **not** publish a live site, reserve a slug, verify DNS ownership, provision TLS, set up a Vercel domain, or create a public tenant renderer. A syntactically valid hostname is not proof of ownership. No made-up DNS records or target hostnames are displayed.

LUCIA-subdomain publishing uses durable tenant-scoped PostgreSQL storage, server-side LUCIA ID session and organisation-role checks, a published-snapshot renderer, and the existing wildcard Vercel domain. Custom domains remain unavailable until their separate one-time payment and verified DNS/TLS flow is implemented. Database migration and production environment setup require separate review and explicit approval.

## Safety and regression scope

- No database schema or migration changes.
- No production deployment or environment-secret changes.
- No LUCIA Core endpoints are invented.
- The legacy School OS is not modified.
- Website drafts are saved to PostgreSQL, and publishing copies the validated draft into a separate live snapshot. The customer wildcard domain is `*.lucia.name.ng`; no per-customer Vercel project or domain registration is created.
