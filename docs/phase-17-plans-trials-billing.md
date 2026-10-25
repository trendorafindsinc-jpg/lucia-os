# Phase 17 — Commercial rules and purchase policy

## Approved commercial model

LUCIA sells technology, not mandatory recurring software subscriptions. The website engine is free within the documented baseline. Optional capabilities, modules, tools, and separately released major software versions may be sold as one-time purchases. A successful purchase grants durable entitlement to the exact product/version and licence disclosed at checkout; a subscription is not required merely to retain that purchased-version entitlement. Later major versions are separate purchases unless explicitly bundled.

LUCIA's product owner controls catalogue prices and may authorise discount codes. No price, discount, bundle, grace rule, or entitlement matrix is approved merely because it exists in a schema or UI. Public Store, checkout, discount redemption, and entitlement activation remain disabled until their security and payment gates pass.

Third-party domain registration/renewals, paid email, payment-provider charges, and other external services may recur independently of the LUCIA software purchase. A purchased custom-domain capability does not prepay a registrar or guarantee a particular domain.

## Existing implementation that remains useful

- Strict validation schemas for configured price records, discount codes and payment records.
- Date-window, percentage, currency, and redemption-cap validation helpers.
- Responsive billing workspace and tests for validation logic.

## Conflicts and limitations to correct

- Legacy weekly/monthly/annual software subscription and 14-day trial previews do not represent the approved LUCIA software commercial model. They must not be presented as live or authoritative pricing.
- The existing trial helper may remain for a future explicitly approved third-party service or a separately approved service offering, but it must not gate the free website engine or revoke access to a version already purchased.
- No real catalogue prices or discount codes are configured. Client-only previews do not create durable entitlements.
- The current invoice/payment schema is a storage contract; it does not establish that a payment occurred or that a product was purchased.

## Required before acceptance

1. Represent products and immutable releases with stable product key, version, licence, compatibility, release notes, price, and explicit upgrade path.
2. Record one-time orders and itemised purchase snapshots, including currency/minor-unit amount and discount attribution at purchase time.
3. Make entitlements server-authoritative, durable, idempotent, and scoped to the buyer/organisation; distinguish ownership of an exact version from current catalogue price or latest release.
4. Apply authorised price/discount editing and audit trails. Validate promotion windows, currency, redemption caps, concurrency, and abuse limits server-side.
5. Keep third-party recurring fees distinct from one-time LUCIA software purchases.
6. Run purchase, duplicate/replayed event, failed-payment, refund/reversal-policy, permission, and cross-tenant tests before any customer charge or entitlement activation.
7. Do not implement subscription cancellation, grace periods, or downgrade rules for software ownership without a separately approved product decision.

## Safety

No production checkout, provider credentials, production migration, or entitlement activation is authorised by this phase document. Phase 17 is a rules/specification phase, not a claim that commercial billing is live.
