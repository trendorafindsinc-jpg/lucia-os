# Phase 8 — Guided website setup and AI creation

## Existing guided setup implementation

- A mobile-friendly three-step setup flow at `/create`: organisation details, website goal/design/address suggestion, and review.
- Selection from the Phase 7 template catalogue, including template deep links.
- Zod validation for required fields, template IDs, names and site-slug syntax.
- Suggested address is labelled as a suggestion; the UI does not claim availability or publish the website.
- Unfinished form data is persisted in browser local storage and restored on return. This is convenience state, not authoritative workspace data.
- `POST /api/onboarding/website` requires the local session created after successful LUCIA ID authentication, validates the payload server-side, and transactionally creates/reuses local workspace membership and creates a website plus template-derived draft pages.
- Successful creation routes the user to the saved website list. The website remains a draft and is not published.

## Architecture boundary

LUCIA Core is authentication only. LUCIA OS owns local organisations, memberships, roles, permissions and website records. Never call undocumented Core tenant APIs or treat a browser-supplied organisation ID as proof of access.

The Phase 2 branch adds transaction-local user context before user-scoped membership lookup and tenant context before tenant data access. This remains gated by Phase 2's complete RLS, rollback and cross-tenant read/write acceptance tests. Phase 8 must not be marked accepted until the onboarding transaction is verified under the restricted application database role.

## AI creation status

AI is optional and must not block manual/template setup. The AI proposal/create action must trigger a real server request, validate the proposed Website Blueprint, persist a real editable draft through the same data path as manual creation, and hand off to Layer Studio. No fake progress or success state is permitted. AI output must not execute arbitrary code or bypass schema validation, tenant scope, or save/publish safeguards.

Do not mark AI creation complete solely because an API key or provider environment variable exists. Verify the actual click handler, request/response contract, provider error paths, persistence, editor handoff and tests. If AI is unavailable, manual/template creation must continue to work.

## Acceptance evidence still required

1. Verify setup form validation and browser-draft restoration without treating local storage as trusted.
2. Test unauthenticated setup (401) and confirm no records are created.
3. Under the restricted application role, verify atomic organisation + owner membership + website + page creation and rollback on injected failure.
4. Verify an existing active membership can be reused only for the correct user; prove cross-tenant data remains inaccessible.
5. Verify duplicate submissions are idempotent/recoverable and unique conflicts leave no partial records.
6. Verify the saved website appears in the workspace list and opens in Layer Studio with the selected template and persisted draft pages.
7. Verify AI button click, request, validation, durable save and editor handoff, including provider timeout/error and malformed output. AI failure must preserve manual setup.
8. Run lint, typecheck, database consistency, unit/integration tests and production build on the final phase head.
9. No production migration, deployment or merge is implied by this specification.
