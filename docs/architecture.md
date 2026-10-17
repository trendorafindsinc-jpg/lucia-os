# LUCIA OS Architecture

## Product boundary

LUCIA OS is a shared, multi-tenant application. A single deployment serves many organisations and websites. v0.1 delivers the Universal Website Engine. School, Clinic, Store, Business, and future specialist portals are separate modules with explicit entitlements; they are not all automatically included in one plan.

## System shape

- **Web application:** Next.js App Router and TypeScript; server-side operations are the default for privileged actions.
- **Domain modules:** identity integration, organisations, access control, website editor, pages/navigation, templates, content/blog, media, publishing/domains, forms, analytics, subscriptions/billing, portal registry, platform operations.
- **Data:** PostgreSQL on Neon; Drizzle migrations and typed schema. Tenant-owned records carry immutable organisation IDs. Cross-tenant access is denied by default.
- **Files:** S3-compatible object storage behind a provider-neutral storage adapter. Database records store metadata and tenant ownership; private objects are not exposed through predictable public paths.
- **External providers:** explicit adapters for LUCIA Secure/Core, payments, email, analytics integrations, and background jobs.
- **Hosting:** Vercel deployment with separate development/preview and production configuration.

## Module ownership

| Module | Owns |
|---|---|
| Identity adapter | LUCIA ID code exchange, session identity mapping, sign-out integration |
| Organisations | Organisation lifecycle, memberships, invitations, workspace switching |
| Authorization | Permission definitions, role assignments, server-side authorization decisions |
| Website | Website records, pages, navigation, design configuration, publishing state |
| Templates | Reviewed/versioned templates and compatible content mappings |
| Content | Blog posts, categories, authorship and publication metadata |
| Media | Upload policy, metadata, alt text and object-storage references |
| Domains | LUCIA subdomains, custom-domain verification and publishing status |
| Forms | Form definitions, submissions, spam controls and notifications |
| Analytics | Privacy settings, events, conversion tracking and reporting |
| Billing | LUCIA OS plans, trials, subscriptions, invoices, discounts and entitlements |
| Portal registry | Portal metadata, navigation registration, required permissions and entitlement gates |
| Platform control | Explicit staff grants, operational workflows and audited support access |

Modules may share infrastructure, but must not reach into another module's private tables or bypass its domain/service boundary without an explicit reviewed contract.

## Tenant isolation

1. Resolve the authenticated LUCIA ID from a verified server-side session.
2. Resolve organisation membership and permissions on the server for every protected operation.
3. Scope database reads and writes by the immutable organisation ID.
4. Apply PostgreSQL Row-Level Security (RLS) as defence in depth after connection/session design is reviewed and tested.
5. Test cross-tenant reads, updates, deletes, exports, media access, form submissions, and background jobs.
6. Treat hostnames, URL parameters, hidden form fields, and client-selected organisation IDs as untrusted routing/input only.

A tenant ID must never be accepted as proof of membership. Background jobs must carry an explicit tenant scope and use the same authorization/data-access conventions.

## Identity boundary

LUCIA Secure/Core is the global identity authority. LUCIA OS must use a documented, registered authorization-code exchange and validate issuer, audience, state/nonce where applicable, expiry, and exact registered callback URLs. Create Secure, HttpOnly, appropriately SameSite cookies. Do not place access tokens or JWTs in URLs. Do not implement a second password store in LUCIA OS.

LUCIA OS owns its organisation membership, product roles, content and billing domain records. The precise Core contract must be verified against the live Core API before authentication implementation; do not guess endpoints or claim integration before end-to-end verification.

## Billing and entitlements

LUCIA OS owns product plans, trial eligibility, subscription state, invoices/receipts, and entitlement decisions. A payment provider processes payments; a browser redirect is not proof of payment. Use provider adapters, verified server-side payment checks, authenticated webhooks, idempotency, reconciliation, and explicit failure states. Keep LUCIA subscription ledger separate from tenant-owned transactions such as school fees or store orders.

A 7-day trial per eligible premium portal is the current product decision. Do not automatically charge at trial expiry unless the customer explicitly consented to a recurring subscription. Failed recurring renewals receive a 3-day grace period; failed payments never grant paid status. Expiry suspends eligible premium capability but preserves customer data.

## Deployment and evolution

- One shared application and shared database/schema; no per-customer deployments.
- Database changes use versioned Drizzle migrations; never edit production schema manually as the normal workflow.
- Keep secrets out of source control and browser bundles.
- Separate production from preview/development databases, credentials, storage buckets, and provider modes.
- Use feature flags or disabled-by-default configuration for unfinished external integrations.
- Make backup/restore and migration rollback plans before production data is introduced.
- Future portal modules must declare their data ownership, permission set, entitlement gate, navigation, and lifecycle.
