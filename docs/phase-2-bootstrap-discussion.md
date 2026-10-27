# Phase 2 — Bootstrap discussion and workspace initialization contract

**Repository:** `trendorafindsinc-jpg/lucia-os`  
**Roadmap phase:** Phase 2 — Workspace architecture and navigation foundation  
**Status:** Design record; not evidence that every sequence below is implemented or accepted.

## Purpose

Capture the bootstrap decisions that Phase 2 must preserve while defining the signed-in LUCIA OS workspace. “Bootstrap” here means initializing the OS workspace after authentication and resolving its local workspace context. It does **not** authorize changes to LUCIA Core's founder/operator bootstrap ceremony.

## Agreed system boundaries

- **LUCIA Core authenticates identity only.** It answers who signed in and supplies a verified identity subject.
- **LUCIA OS bootstraps its own application context.** It maps the verified subject to a local user, loads the user's locally authorized organisation/workspace memberships, and applies LUCIA OS permissions before exposing protected data or actions.
- **The browser is not an authority.** A hostname, query parameter, form value, cached tab, app icon, or client-side organisation selection is only a request/context hint. The server must verify membership and permissions before granting access.
- **The app registry describes capabilities, not grants.** An app's registry entry can say whether it exists, is available, supports split view, and has a launch destination. It cannot replace server-side authorization or entitlements.
- **Workspace initialization must fail closed.** If the Core session, local-user mapping, membership lookup, or required permissions cannot be verified, do not silently create an authenticated workspace or show tenant data. Render an honest loading, no-access, setup-required, or recoverable error state.
- **Do not duplicate authentication.** LUCIA OS may maintain its own secure local session and tenant authorization records, but must not create a parallel password/login system or use Core as the owner of OS organisations, roles, billing, or entitlements.

## Proposed bootstrap sequence

1. **Resolve authentication:** require a valid LUCIA Core-authenticated session and verify its subject on the server.
2. **Resolve local identity:** find the LUCIA OS local user mapped to that verified subject. Any first-time local-profile provisioning must be explicit, idempotent, and safe to retry; it must not grant organisation access by itself.
3. **Resolve workspace access:** fetch the user's active local memberships and relevant organisation state through tenant-aware server services.
4. **Select context safely:** choose a requested or last-used organisation only if the user has an active membership and required permissions. If no valid organisation is available, show a clear empty/setup state rather than inventing membership.
5. **Build the workspace shell:** load the typed app registry, user preferences, and eligible workspace destinations. Availability labels are truthful; unavailable apps do not launch.
6. **Open the initial destination:** use a valid return destination only after same-origin/allowlist validation and authorization. Otherwise land on the signed-in workspace launcher.
7. **Restore workspace state conservatively:** restore tabs, active app, or pane layout only when the saved state is valid for the current user and current permissions. Re-check access on every protected route and action; stale restored state must not bypass authorization.
8. **Handle failure without data loss:** preserve app drafts where safe, provide a recoverable error, and never report success before the underlying operation succeeds.

This sequence is the design contract for implementation and tests; it is not a claim that all eight steps currently pass end-to-end.

## First-run and retry rules

- Provisioning the local user and creating an organisation/initial-owner membership are separate concerns. If organisation creation is part of a first-run flow, the organisation and initial membership must be created atomically or rolled back together.
- Retries must not create duplicate local users, organisations, memberships, tabs, or other bootstrap records. Use stable identity mapping, database constraints, and idempotent server-side operations.
- Do not infer ownership from “first user”, email address alone, a URL, or a client-submitted role.
- An organisation setup flow must explain what is missing and provide a real next action. It must not strand a user on an endless spinner or claim that setup completed when persistence failed.
- A switch of organisation must re-authorize the new context and refresh tenant-scoped data; it must not carry permissions from the previous organisation.
- Signing out or losing the Core session must clear protected client state and prevent restored tabs from rendering private data.

## Relationship to the separate LUCIA Core operator bootstrap

The previously discussed Core first-operator bootstrap is a **separate Core-owned security operation**. It is not performed by LUCIA OS workspace startup and is not part of this Phase 2 implementation.

- Keep the Core bootstrap ceremony, operator key custody, bootstrap token, and operator activation logic in the `trendorafindsinc-jpg/lucia-core` repository and its own reviewed procedure.
- LUCIA OS must not create a Core operator, alter Core bootstrap state, modify Core schemas/secrets, or attempt to bypass Core authentication.
- This document records the boundary only. It does not report that Core bootstrap has been completed or verified.

## Phase 2 acceptance tests to add or confirm

- Unauthenticated, expired-session, and invalid-subject requests cannot load protected workspace data.
- A verified Core subject with no local mapping gets a safe setup/error path; it receives no organisation access by default.
- A mapped local user with no memberships sees a real empty/setup state and cannot access arbitrary organisation IDs.
- A user can select only an organisation for which local membership and permissions are valid.
- Forged organisation IDs, hostnames, return destinations, app IDs, and restored tab state cannot grant access.
- Local-user provisioning and organisation/initial-owner creation are idempotent; partial failure leaves no orphaned half-created ownership state.
- Organisation switching re-checks permissions and does not leak cached data across tenants.
- Core-session expiry/sign-out blocks protected routes and clears sensitive client state.
- Workspace tabs and split-view restoration preserve work where supported without bypassing per-app authorization.
- Loading, unavailable, empty, setup-required, denied, and recoverable-error states are distinct and actionable.

## Safety and release gates

- This is documentation only; it does not authorize application code changes, Core changes, production database changes, migrations, DNS/secrets changes, merges to `main`, or deployment.
- Verify the contract against the current source and tests before marking any criterion complete.
- Keep Phase 2 open until the architecture contract and required tests are reviewed and explicitly accepted. Do not start Phase 3 merely because this document exists.
