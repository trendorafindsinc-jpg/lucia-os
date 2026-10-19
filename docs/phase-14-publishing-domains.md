# Phase 14 — Publishing and custom domains

## Implemented in this phase

- A durable publishing workspace that loads websites from the signed-in user's active organisation memberships.
- Draft saving to tenant-scoped PostgreSQL storage without replacing an existing live snapshot.
- Server-side publishing that checks the LUCIA ID-backed product session, organisation membership, and the website.publish permission.
- A separate published homepage snapshot, switched atomically with website status and publication timestamp.
- A public renderer that reads only published snapshots and relies on PostgreSQL row-level security for public published reads.
- Wildcard subdomain routing on the existing verified Vercel project domain, *.lucia.name.ng, using one shared deployment.
- Reserved slug protection and a database uniqueness constraint preventing two published websites from claiming the same subdomain.
- Unit tests for wildcard host resolution, reserved labels, and custom-domain input validation.

## Customer subdomains

The Vercel project already has *.lucia.name.ng attached and verified. The app routes customer-slug.lucia.name.ng to the matching published website record. Customer subdomains are application-level slug routing; no per-customer Vercel project or domain registration is created. os.lucia.name.ng and other platform-owned labels are reserved.

## Commercial rules

- LUCIA subdomain publishing does not require custom-domain activation.
- Website subscription plans remain recurring weekly/monthly/annual with the agreed 7-day free trial and prices managed through LUCIA Core.
- Custom-domain activation is a separate one-time payment. The shared payment workflow is not integrated yet, so this PR does not take payment or claim that a custom domain is active.
- Custom domains still require trusted payment confirmation, DNS ownership verification, and provider-confirmed TLS before they can be served.

## Before production use

Apply migration 0004_website_publishing.sql to the correct Neon database before testing the publishing endpoints. Then verify LUCIA ID sign-in, organisation access, saving a draft, publishing a unique slug, public access through a real wildcard hostname, and tenant isolation. A successful preview build alone is not evidence that the production database migration has been applied.

No payment, custom-domain activation, or DNS changes are performed by this phase.
