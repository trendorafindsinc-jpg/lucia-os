# Phase 01 — Repository and Product Audit

**Audit date:** 2026-10-25  
**Repository:** `trendorafindsinc-jpg/lucia-os`  
**Audited ref:** `main` at `95c667d06896f1882478fd56819c4e7651289908`  
**Phase status:** `IN PROGRESS` — source-level evidence recorded; runtime, database-backed, and live-site checks remain.  
**Scope:** Audit only. No application code, production data, migrations, DNS, secrets, or deployment settings were changed.

## Executive result

The repository has meaningful foundations: LUCIA ID OAuth callback/session code, organisation membership and permission checks, tenant-scoped website records, validated website drafts/Blueprints, version snapshots, publication snapshots, domain ownership verification, billing ledger primitives, and 27 test files.

That is not equivalent to production readiness. The highest-priority gaps are:
1. LoomifiAI produces a validated proposal but does not persist it or create a durable task; the user must manually apply and save it.
2. Custom-domain registration and verification do not reach an implemented activation state, and two domain API paths expose different contracts.
3. The repository contains two middleware entrypoints with competing hostname rewrite strategies; the deployed routing behavior must be verified and consolidated.
4. Database row-level security is not uniform across all tenant-related tables, despite the security baseline requiring RLS as defence in depth.
5. Critical end-to-end journeys—Core sign-in, database-backed tenant isolation, domain activation, publish-to-live rendering, and the two known-good customer sites—have not been demonstrated by the evidence available in this source audit.
6. The approved v1 navigation includes Loom, but there is no dedicated Loom community route or implementation in the current source tree. The current workspace navigation also does not match the approved v1 navigation contract.

These are source-level findings, not claims that production is currently down. Runtime checks are listed separately below.

## Evidence inspected

- Repository instructions: `AGENTS.md`
- Product/architecture: `README.md`, `docs/unified-platform-blueprint.md`, `docs/implementation-roadmap-30-phases.md`, `docs/website-engine-blueprint.md`, `docs/architecture.md`, `docs/core-auth-only-boundary.md`
- Standards/security: `docs/engineering-standards.md`, `docs/security-baseline.md`, `docs/environment-setup.md`, `.env.example`
- Schema/migrations: `src/lib/db/schema.ts`, `drizzle/0000_tenant_foundation.sql` through `drizzle/0007_website_versions.sql`
- Authentication/access: `src/app/api/auth/login/route.ts`, `src/app/api/auth/callback/route.ts`, `src/app/api/auth/lucia/callback/route.ts`, `src/lib/auth/session.ts`, `src/lib/auth/oauth.ts`, `src/lib/access/policy.ts`, `src/lib/access/guards.ts`, `src/lib/tenancy/tenant-context.ts`
- Website creation/editing/AI: `src/app/api/onboarding/website/route.ts`, `src/app/api/websites/[websiteId]/draft/route.ts`, `src/app/api/loomifi-ai/propose/route.ts`, its route test, and `src/components/editor/visual-site-editor.tsx`
- Publishing/domains: `src/app/api/publishing/publish/route.ts`, `src/lib/domains/public-site.tsx`, `src/app/tenant-site-internal/`, `src/app/site/[slug]/[[...path]]/page.tsx`, domain API routes, `middleware.ts`, and `src/middleware.ts`
- CI/test inventory: `.github/workflows/quality.yml`, `package.json`, repository tree and available GitHub Actions run summaries.

The source tree contains **27 `.test.ts` files**. The quality workflow runs install, lint, TypeScript, Vitest and production build on pull requests and manual dispatch. It does not declare a push trigger, so a successful PR run is not proof of a fresh post-merge run against the current `main` head.

## Gap and risk register

### P1 — AI proposal is not a saved-draft workflow

**Evidence**
- `src/app/api/loomifi-ai/propose/route.ts` validates the user session, input, local membership, `website.edit` permission, and website ownership.
- The success response explicitly returns `persisted: false` and `published: false`; the route calls the provider and returns a Blueprint but does not persist a draft or durable task.
- `src/components/editor/visual-site-editor.tsx` stores the proposal in component state. `applyAIProposalToEditor()` maps selected fields into the local editor state and tells the user to choose Save draft.
- The route test asserts that the proposal is returned without persistence.

**Impact:** The Create proposal action can generate a proposal, but generation, validation, durable save, and handoff are separate/incomplete. A refresh before manual save loses the proposal. This does not meet Phase 08's durable task → validated output → saved editable draft → editor handoff acceptance contract.

**Acceptance evidence still needed:** provider failure/timeout tests; durable task state and retry behavior; server-side Blueprint validation; persistence under the authorized organisation; reopen-after-refresh test; direct editor handoff; verify existing live content remains unchanged.

### P1 — Custom-domain activation is incomplete and domain APIs disagree

**Evidence**
- `src/app/api/domains/route.ts` supports custom hostname registration and creates a pending record with a hashed DNS token.
- `src/app/api/domains/verify/route.ts` checks the TXT proof and transitions a domain to `verified`, returning `activationRequired: true`.
- `src/app/api/domains/[domainId]/route.ts` only makes an already-`active` domain primary or deletes a custom domain; it does not activate a `verified` domain.
- The parallel `src/app/api/websites/[websiteId]/domains/route.ts` explicitly returns 503 for custom-domain claims until entitlement verification is connected.
- `src/app/api/publishing/publish/route.ts` reports custom-domain activation as pending and says payment/DNS/TLS activation is not connected.
- `src/lib/domains/public-site.tsx` serves a custom hostname only when its domain record is `active` and its website is published.

**Impact:** The inspected code does not provide a complete verified → entitled/activated → TLS-ready → live custom-domain journey. The two domain APIs also have conflicting custom-domain behavior, which can make workspace actions inconsistent.

**Acceptance evidence still needed:** choose one canonical API contract; verify authorization/entitlement before activation; test unique-domain conflicts, DNS mismatch, retries, removal and re-registration; demonstrate activation and TLS status; render the correct site from the verified hostname. Do not change DNS or production domains during this audit.

### P1 — Competing middleware entrypoints make hostname routing ambiguous

**Evidence**
- Root `middleware.ts` bypasses tenant rewriting for platform hosts and rewrites other hostnames to `/tenant-site-internal`.
- `src/middleware.ts` contains a separate `LUCIA_SITE_DOMAIN` subdomain resolver and rewrites customer subdomains to `/site/[slug]`.
- Both files exist alongside `src/app`; they implement different routing strategies. The root middleware also classifies every `*.vercel.app` hostname as a platform host.

**Impact:** The source contains two different hostname-routing paths. Source inspection alone does not establish which middleware Next.js deploys or whether production custom-domain and wildcard-subdomain traffic reaches the intended renderer. Treat this as a routing risk requiring explicit verification, not as proof of a current production outage.

**Acceptance evidence still needed:** inspect the build output/runtime middleware selection; define one canonical host resolver; test platform host, valid LUCIA subdomain, active custom domain, pending/unclaimed hostname, malformed Host header, and private API/auth paths. Preserve the known-good live sites while testing.

### P1 — Database RLS coverage is incomplete across tenant-related tables

**Evidence**
- RLS policies are present in migrations for websites/pages, billing ledger records, support cases/messages, website domains and website versions.
- Read-only catalog inspection on the existing isolated Neon branch `lucia-os-phase1-migration-check` (branch created 2026-10-18; database `lucia_os`) confirmed RLS is enabled on `websites`, `website_pages`, `website_domains`, `support_cases`, `support_messages`, `billing_invoices`, `billing_payment_attempts`, and `billing_webhook_events` in that snapshot.
- The same branch snapshot reported RLS disabled and zero policies for `organizations`, `organization_memberships`, `app_users`, `app_sessions`, `platform_audit_events`, and `platform_staff_grants`.
- That branch is an older snapshot and its catalog contained 14 public tables; it did not contain `website_versions`. It is not evidence of the exact current production schema. The finding must be rechecked against a fresh, explicitly non-production branch before any migration is proposed.
- The only listed Postgres role on that branch was `lucia_os_owner`; no separate non-owner application role was listed. Non-owner RLS enforcement therefore remains unverified.
- Application code often applies explicit membership checks and organisation filters, which remain necessary; they do not replace the defence-in-depth policy required by `docs/architecture.md` and `docs/security-baseline.md`.

**Impact:** A missed or incorrectly scoped query on uncovered records has less database-level containment. Platform-wide records need deliberately designed access rules rather than indiscriminately applying a tenant policy.

**Acceptance evidence still needed:** table-by-table data classification and RLS policy design; non-owner application-role tests; transaction-local tenant context tests with pooled connections; cross-tenant read/write denial tests; staff-only access behavior. Do not apply a production migration during Phase 01.

### P1 — Loom is approved for v1 but has no dedicated community implementation in the audited tree

**Evidence**
- The merged roadmap/blueprint says Loom is a first-class v1 destination.
- The audited tree contains website Blueprint/renderer modules under `src/lib/loom` and `src/components/loom`, but no `src/app/loom` route or dedicated community domain modules for discussions, groups, directory, connections/messaging, collaboration spaces, and trust/safety.
- `src/app/workspace/page.tsx` currently exposes Overview, Websites, Domains, Team & access, Billing, Help & support, Publishing and Analytics; it does not expose the approved v1 navigation of Overview, Websites, AI Studio, Loom, and Plan & Billing.
- Store, Portals and Business Admin must remain clearly unavailable in v1 if shown; do not expose incomplete workflows.

**Impact:** The approved v1 product contract is not yet represented in the current workspace navigation or community implementation.

**Acceptance evidence still needed:** implement Loom in its own phase-scoped work after this audit; prove working routes and permission-aware actions, responsive behavior, empty/loading/error states, privacy and trust/safety. Do not mistake the legacy website renderer's use of “Loom” for the community product.

### P2 — Critical journey tests are mostly unit-level, not end-to-end

**Evidence**
- The repository contains 27 `.test.ts` files covering policy, OAuth helpers, Blueprint validation, AI provider behavior, domains/host helpers, publishing rules, versions, billing and other domain logic.
- The AI proposal route has a route-level test for authentication, cross-origin rejection, viewer denial, wrong-organisation website denial and provider response.
- The inspected tree contains no browser/E2E test suite and no route-level tests for the Core callback, publishing route, domain registration/verification/activation, onboarding persistence, draft save, or version endpoints.
- CI's quality workflow is configured for pull requests and manual dispatch, not pushes.

**Impact:** Unit coverage is useful but cannot prove actual browser controls, deployed middleware selection, database RLS, real Core token exchange, real Neon transaction behavior, DNS/TLS, or published customer-site rendering.

**Acceptance evidence still needed:** add critical route integration tests and browser journeys; run against an isolated non-production database; run a deliberate verification against current `main`; retain named fixtures for the two known-good published customer sites.

### P2 — Production/runtime evidence is not part of this source audit

No production database was queried or changed. Two existing, isolated Neon QA branches were inspected using read-only PostgreSQL catalog queries; no data rows were queried and no database was changed. No migration was run. Vercel control-plane inspection confirms the current production deployment is `READY` on `main` commit `95c667d06896f1882478fd56819c4e7651289908`, with `os.lucia.name.ng` and `*.lucia.name.ng` aliases attached and marked verified. This proves deployment/domain attachment status only; it does not prove HTTP page rendering, correct tenant routing, TLS from every client, or end-to-end publish behavior. No Vercel configuration, secrets, deployment, DNS, or customer content was changed. An external browser fetch of the live URLs was unavailable through the current inspection tool, so a live-site browser smoke test and real LUCIA Core OAuth round trip remain unexecuted. The two known-good published customer sites are not identified as test fixtures in the audited repository.

The audit PR's GitHub Actions `verify` job completed successfully on commit `04ffedd96359057d7c2753e47dfce127b8b1fdd3`: dependency installation, lint, type check, unit tests, and production build all passed. A separate external check named `Workers Builds: lucia-os` reported failure on the same commit; its build log has not yet been inspected, so it remains an unresolved check and is not assumed to be harmless. The successful repository quality job is useful CI evidence, but it does not substitute for live integration checks or a fresh quality run against the current `main` head.

## Existing work that must not be duplicated blindly

- PRs #48–#51 are merged and include prior template/version groundwork and the LoomifiAI provider/button work; inspect their resulting code before proposing further fixes.
- PR #47, **“Phase 4/5: Loom Library compositions and durable version API,”** remains an open draft. It is not part of `main`; review its scope before touching overlapping implementation.
- The most recent `main` commit audited here is documentation-only PR #54's merge commit `95c667d06896f1882478fd56819c4e7651289908`.

## Phase 01 acceptance checklist

- [x] Read governing product, architecture, roadmap, engineering and security documents.
- [x] Inventory source routes, domain modules, schema/migrations, tests and CI configuration.
- [x] Record source-supported gaps and risks with file-level evidence.
- [x] Run lint, typecheck, Vitest and production build on the Phase 01 audit PR commit (all passed).
- [ ] Run lint, typecheck, Vitest and production build against the exact current `main` commit.
- [ ] Verify Core OAuth against a provisioned test client and isolated non-production database.
- [x] Inspect RLS catalog state read-only on the existing isolated Neon QA branch; uncovered tables and missing non-owner role recorded.
- [ ] Verify cross-tenant read/write denial against a fresh, current non-production PostgreSQL branch, including RLS and non-owner role behavior.
- [x] Inspect Vercel production deployment and domain attachment status read-only; production deployment is READY and platform/wildcard aliases are marked verified.
- [ ] Verify wildcard subdomain, custom domain, publish and live rendering end to end.
- [ ] Identify and run regression checks for both known-good published customer sites.
- [ ] Review the findings and remaining checks with the user before Phase 01 is marked VERIFIED/ACCEPTED.

## Recommended next action

Finish the remaining Phase 01 verification in a safe, isolated environment: run the repository quality commands against the audited commit, then test the critical auth → organisation → draft → publish → hostname-rendering journey without mutating production. Resolve the middleware/domain contract ambiguity before claiming domain delivery is verified. Do not start Phase 02 implementation until this audit is accepted.
