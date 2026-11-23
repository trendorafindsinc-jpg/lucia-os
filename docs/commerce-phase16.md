# Lucia OS Commerce (Phase 16)

## Runtime configuration

Configure these values in the deployment environment (server-side only):

- `PAYSTACK_SECRET_KEY`: Paystack test key for preview/staging; live key only after acceptance.
- `DATABASE_URL_RUNTIME`: the dedicated production database role with `NOBYPASSRLS`.
- `LUCIA_SITE_DOMAIN`: public LUCIA subdomain root (defaults to `lucia.name.ng`).

Never expose the Paystack secret through a `NEXT_PUBLIC_*` variable. The checkout and webhook routes use the secret only on the server.

## Paystack setup

Set the Paystack webhook URL to:

`https://<platform-host>/api/commerce/paystack/webhook`

Subscribe to charge success and charge failure events. The handler validates the `x-paystack-signature` against the exact raw request body and independently fetches the transaction from Paystack before settling an order.

Checkout callbacks use the verified storefront hostname:

`https://<storefront-host>/api/commerce/checkout/return`

A callback is not proof of payment. It only triggers a server-to-server transaction verification.

## Entitlement provisioning

Each website needs one active `commerce_entitlements` row before the storefront or management APIs become available. The trusted subscription/billing entitlement workflow must provision or revoke this row after validating the subscription in the server-side billing ledger.

Do not let the browser or the tenant product-management UI create or activate entitlement rows. Example staging-only provisioning, after independently confirming the entitlement:

```sql
INSERT INTO commerce_entitlements (organization_id, website_id, status, source)
VALUES ('<organization-uuid>', '<website-uuid>', 'active', 'verified_subscription')
ON CONFLICT (organization_id, website_id)
DO UPDATE SET status = 'active', source = EXCLUDED.source, updated_at = now();
```

## Storefront and management

- Public storefront: `/shop` on an active, verified hostname for a published website.
- Store APIs: `/api/commerce/store`, `/api/commerce/cart`, and `/api/commerce/checkout`.
- Management UI: `/commerce`.
- Management APIs require an active organisation membership with the relevant website permission and an active Commerce entitlement.

The storefront uses an opaque HttpOnly cart cookie. Only its SHA-256 hash is stored. Cart prices and totals are always read and calculated on the server in integer minor currency units.

## Payment and stock lifecycle

- Order rows and line-item snapshots are created transactionally.
- The item snapshot trigger rejects updates and deletes.
- Finite inventory is reserved in the order transaction.
- A verified failed-charge webhook releases the reservation once.
- An ambiguous checkout initialization timeout keeps the reservation and payment attempt pending, because Paystack may already have created a live checkout session. Reconcile the reference before releasing that stock.
- A late success after an already verified cancellation remains cancelled and is flagged for manual payment/refund review; it is never sent to fulfilment automatically.

## Migration and acceptance

Apply migration `0031_commerce_core.sql` through the normal migration pipeline. Verify it from an empty PostgreSQL 16 database as well as a representative staging database. Run:

```bash
npm run db:check
npm run typecheck
npm test
npm run lint
npm run build
npm run test:routing:http
```

Do not switch to live Paystack credentials until migration verification, the full test suite, the live staging checkout, webhook replay tests, and tenant-isolation checks have passed.
