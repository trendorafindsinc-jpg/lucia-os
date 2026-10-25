# LUCIA OS — One-time purchase and version ownership model

**Status:** Product decision recorded in [Issue #77](https://github.com/trendorafindsinc-jpg/lucia-os/issues/77). Implementation and payment activation remain gated by the roadmap's security and acceptance requirements.

## Commercial promise

LUCIA sells technology by one-time purchase, not by requiring customers to rent continued access through a recurring subscription. The core website engine remains free within its documented baseline. Optional software, modules, premium capabilities, and major product versions are paid items.

A purchase applies to the exact product and version shown at checkout. After successful server-verified payment, the customer receives a durable entitlement to use that version under the displayed licence terms. A later version is a new purchase unless the listing explicitly includes an upgrade. A newer release alone must not revoke rights to a previously purchased version.

## Store and workspace experience

- Storefront name: **LUCIA Store**.
- Owned-products area: **My Purchases**.
- Each listing must show product key, version, price/currency, included capabilities, compatibility, licence terms, support/security-update policy, and upgrade path.
- Discount codes must be validated server-side, with clear eligibility, expiry, limits, and final price before payment.
- After verified payment, the product appears in My Purchases with entitlement state and steps to activate it in the customer's workspace.
- Failed, duplicated, unverified, or mismatched payments must not grant an entitlement. Settlement and entitlement creation must be idempotent and auditable.
- No public store, checkout, discount redemption, or paid activation is enabled until the required tenant-isolation and payment-verification gates pass.

## Product versions vs website versions

Website drafts, published snapshots, preview, and rollback are website-content history. Purchased software versions are commercial catalogue entries with their own product keys, versions, prices, licence terms, and entitlements. These concepts must remain separate in UI, database relationships, authorization, and retention policy.

## Third-party and service costs

A one-time LUCIA capability purchase does not imply that LUCIA has paid every external provider forever. Domain registration and renewal, paid email, third-party APIs, payment-provider fees, and other external costs must be disclosed separately and either paid directly by the customer or billed under a clearly stated separate arrangement.

Do not advertise lifetime hosting, unlimited usage, indefinite support, or perpetual security updates unless LUCIA can reliably fund and contractually provide those commitments. Specify the support and security-update policy for every product/version. Preserve purchased-version rights even when new versions are released, subject to the licence terms and any clearly stated safety/legal limits.

## Implementation sequence

1. Keep the current website engine baseline free as specified.
2. Define a versioned product catalogue and durable purchase entitlements.
3. Build My Purchases and activation status before making checkout public.
4. Add discounts only with server-side validation and auditable rules.
5. Integrate payment providers with trusted server-side verification, signed webhook validation, idempotency, replay protection, and reconciliation.
6. Test every entitlement path with a non-owner LOGIN NOBYPASSRLS role and cross-tenant denial before activation.
7. Treat custom-domain capability as a LUCIA product entitlement, separate from registrar registration/renewal and DNS/TLS verification.

## Explicit non-goals for the initial website-engine release

Store, Portals, and Business Admin remain unavailable future-version products in v1, as already specified in the 30-phase roadmap. This decision defines their eventual commercial model; it does not authorize shipping them in v1. Loom remains in v1 scope.
