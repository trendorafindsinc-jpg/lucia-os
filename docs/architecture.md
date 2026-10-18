# LUCIA OS Architecture

## Mandatory Core boundary

LUCIA Core is strictly global authentication only: LUCIA ID sign-up, sign-in, identity verification, and authentication. It must not own LUCIA OS tenants, memberships, roles, permissions, subscriptions, billing, or entitlements. LUCIA OS must not call Core tenant, permission, authorization, or entitlement endpoints.

## Product ownership

LUCIA OS owns its organisations, membership, roles, permissions, tenant data, websites, content, publishing, billing, subscriptions, invoices, payment records, and product entitlement decisions. LUCIA Core only authenticates the identity. A valid LUCIA ID does not automatically grant access to a LUCIA OS tenant or capability.

## Tenant isolation

For every protected operation, LUCIA OS must independently verify local membership and permissions on the server, scope all reads and writes to the authorized organisation, and use database row-level security as defence in depth. Tenant IDs, hostnames, and client-selected organisation values are locators only, never proof of access.

## Payments

LUCIA OS owns its plans, trials, subscription state, invoices, discounts, and entitlements. Payment status must come from server-side provider verification and authenticated webhooks, with idempotency and reconciliation. Trial duration and pricing must be explicit LUCIA OS decisions, not copied from another LUCIA product.

## Technical baseline

Next.js App Router and TypeScript; PostgreSQL on Neon with Drizzle migrations; provider-neutral object storage; separate preview and production configuration; secrets never committed to source control. Use versioned migrations, maintain rollback plans, and verify authentication contracts against the live Core API before claiming end-to-end integration.
