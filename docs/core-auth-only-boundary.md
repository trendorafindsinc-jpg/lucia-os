# LUCIA Core boundary — mandatory

LUCIA Core is strictly global authentication only: LUCIA ID sign-up, sign-in, identity verification, and authentication.

LUCIA Core must not own or decide LUCIA OS:
- organisations, tenants, or membership
- product roles, permissions, or authorization
- subscriptions, invoices, payments, or billing
- plans, trials, or product entitlements
- product administration or business workflows

LUCIA OS must use Core only to authenticate the user's identity and then create a local session. LUCIA OS owns its own tenant data, membership, roles, permissions, billing, and entitlement decisions in its own database and server-side services.

Authentication means “who is this user?” It does not mean “which organisation can they access?” or “what can they do?” Every protected operation must enforce LUCIA OS's own membership, permission, and tenant-isolation rules. Never use a tenant ID or hostname as proof of membership.

No Core tenant, permission, authorization, or entitlement endpoints may be called by LUCIA OS. No production migration or deployment is implied by this document.
