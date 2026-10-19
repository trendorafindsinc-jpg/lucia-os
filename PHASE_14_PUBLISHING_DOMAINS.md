# Phase 14 — Publishing & Domains

**Promise:** Your website, when it is ready.

This specification defines the target behavior; it does not claim production publishing, payments, DNS, or TLS are already operational.

## Customer journey
1. Enter website name, headline, short description, and optional custom hostname.
2. Preview without publishing.
3. Save a durable draft and restore it after reload.
4. Review server-derived readiness checks.
5. Publish only when required checks pass; preserve the draft and last good publication on failure.
6. View accurate publication, domain-verification, payment, and TLS status.

## Commercial model: separate website subscription from custom-domain activation

- **Website subscription:** recurring weekly/monthly/annual plans follow the previously agreed LUCIA OS subscription model, including the planned 14-day trial and Core-managed entitlement/billing flow. Do not replace this with a one-time website subscription.
- **Custom-domain activation:** a separate **one-time payment** for activating a custom hostname on a website. It is not a recurring subscription and must not be bundled into or silently renew with the website subscription.
- A customer may publish on their available LUCIA subdomain without buying custom-domain activation.
- The customer may enter and validate a custom hostname before payment, but it must be labelled pending activation and must not be represented as connected/live.
- Payment processing is intentionally deferred to the upcoming shared payment workflow (“other stuffs”). For now, define the commercial entitlement and payment interface only; do not invent a price, create a fake checkout, collect payment details, or mark activation as paid.
- Model the activation as a distinct order/payment and entitlement state, e.g. `not_required`, `payment_pending`, `paid_pending_verification`, `verification_pending`, `active`, `payment_failed`, `refunded`, or `revoked`. Only a verified payment result from the future trusted payment service can transition to paid; browser redirects or client-supplied status are not proof.
- Do not configure DNS or claim activation before payment is confirmed. After payment, still require DNS ownership verification and provider-confirmed TLS before serving the custom domain. Payment buys activation eligibility, not domain registration, ownership, or guaranteed availability.
- Keep the domain activation charge separate from third-party domain registrar renewal/registration costs, if those are offered later. Do not imply LUCIA owns or renews a domain the customer has registered elsewhere.
- Make refunds, charge disputes, and manual revocation able to disable the custom-domain entitlement without deleting the customer's website or LUCIA subdomain.

## Mandatory safeguards

- Persist website data in the existing PostgreSQL/Drizzle layer with organisation-scoped access on every read and write.
- Verify LUCIA ID/Core session, organisation membership, role, publish permission, and product entitlement server-side. Fail closed if authorization cannot be verified.
- Normalize and reserve LUCIA subdomain slugs transactionally with database uniqueness and reserved-name checks.
- Keep drafts separate from immutable published snapshots; atomically switch the published version only after validation.
- Public host routing resolves only verified host records and published snapshots; never expose drafts or data from another tenant.
- Custom domains accept hostnames only. Require a server-verified DNS ownership challenge; report TLS ready only when the hosting provider confirms an active certificate.
- LUCIA subdomain publishing does not require custom-domain activation. Custom domains require both the one-time activation entitlement and successful DNS/TLS verification before they are marked live.
- Audit publish, payment-state, and domain actions; validate inputs, rate-limit sensitive endpoints, and return actionable errors without leaking secrets.

## Seven readiness checks

1. Content valid and saved.
2. LUCIA address reserved uniquely (a preview is not a reservation).
3. Custom domain optional; if supplied, its one-time activation payment must be confirmed before activation proceeds.
4. Durable tenant-isolated storage is connected and the draft is saved.
5. LUCIA Core authorization and entitlement checks pass.
6. Public renderer and tenant/host routing are operational.
7. Domain ownership and TLS are confirmed before a custom hostname is served. This check is not a blocker for LUCIA-subdomain-only publishing.

Readiness is computed on the server and rechecked at publish time; never trust a browser checklist or fixed progress count.

## Acceptance tests

- Draft survives reload and is isolated across tenants.
- Preview never changes the live version.
- Publish fails closed on authorization, entitlement, storage, or renderer failure.
- Concurrent slug claims cannot both succeed.
- Failed publish preserves the previous live version.
- A LUCIA subdomain can be used without custom-domain payment.
- Custom-domain activation is a one-time purchase, separate from recurring website plans.
- Client-side claims and payment redirects cannot grant a paid activation entitlement.
- Payment failure/refund/revocation never deletes the site or LUCIA subdomain.
- A paid domain is still not marked live until DNS ownership and TLS are confirmed.
- Public requests serve only the correct tenant's published snapshot.
- Lint, typecheck, tests, and production build pass before merge.

Use existing architecture and provider adapters: no duplicate identity system, second database, or per-customer Vercel deployments. Payment is to be connected later through the shared payment workflow; do not fake a completed transaction.