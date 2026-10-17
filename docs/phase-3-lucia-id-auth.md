# Phase 3 — LUCIA ID authentication

## Verified integration contract

This implementation follows LUCIA Core's private `docs/consumer-contract.md` v1. It uses the documented endpoints only:

- `GET /api/v1/consumer/oauth/authorize`
- `POST /api/v1/consumer/oauth/token`
- `GET /api/v1/consumer/identity`

The Core client must be provisioned out of band with the exact callback URL and product audience. This repo must not invent or store client credentials in source control.

## Flow

1. The product creates 256-bit random state and places it in an HttpOnly, SameSite=Lax, short-lived callback-path cookie.
2. Core handles the user's login and returns an authorization code to the exact registered callback.
3. The callback constant-time compares state, then exchanges the one-time code server-to-server using HTTP Basic client authentication.
4. The product validates the resulting Bearer assertion by calling Core's documented identity endpoint and checks the returned subject matches the token exchange result.
5. Only then does it map the Core subject to a local user and create a random opaque product session. Only the SHA-256 hash of the session token is stored in PostgreSQL.
6. Product session cookies are HttpOnly, SameSite=Lax, host-only, Secure on HTTPS, and expire after 30 days. Logout deletes the server-side session and clears the cookie.

## Required environment

Set `LUCIA_CORE_ISSUER` to the approved Core origin, `LUCIA_CORE_CLIENT_ID`, `LUCIA_CORE_CLIENT_SECRET`, `LUCIA_CORE_AUDIENCE`, `LUCIA_CORE_REDIRECT_URI`, and `DATABASE_URL` in each environment's secret manager. Values must be separate for development/preview/production as applicable. Do not use browser JavaScript to call consumer token endpoints.

## Security boundaries and remaining work

- No Core password, session cookie, database, or table is copied into LUCIA OS.
- State is browser-bound and callback URL/audience are bound by Core's registered client configuration.
- Authorization codes and Core assertions are never returned to browser application code or stored in local sessions.
- Local sessions establish product sign-in only. Organisation membership, roles, permissions and entitlements must still be checked server-side with Core in later phases before protected tenant operations.
- This phase does not implement session management UI, MFA, email verification, password reset, or automated session revocation when a Core account is disabled. Those remain explicit follow-up requirements.
- The app is not production-ready until a real client is provisioned, migration is applied to a reviewed non-production database, and end-to-end flow is tested.
