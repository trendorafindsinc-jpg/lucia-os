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

Publishing remains blocked until the platform has durable tenant-scoped website/page/content storage, Core-backed server-side publish authorization and entitlement checks, a public renderer with tenant isolation, domain ownership verification, TLS provisioning, and audit/recovery tests. Database migration and production environment setup require separate review and explicit approval.

## Safety and regression scope

- No database schema or migration changes.
- No production deployment or environment-secret changes.
- No LUCIA Core endpoints are invented.
- The legacy School OS is not modified.
- This UI uses example settings in browser memory only; refresh resets them.
