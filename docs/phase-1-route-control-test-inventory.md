# Phase 1 — Route, Control, and Test Inventory

**Baseline ref:** `main` at product-vision commit `2e93bb0be1aa4b49c71b6dfcba72293ab3c934d3`  
**Status:** Source inventory recorded; dynamic/browser behavior and CI baseline still require execution.  
**Scope:** Read-only inspection. No application code or customer data changed.

## 1. Current customer-facing route inventory

| Route | Current role on main | Workspace disposition |
| --- | --- | --- |
| `/` | Public welcome/marketing page | Keep signed-out. It is not the signed-in workspace home. |
| `/workspace` | Authenticated organisation dashboard with live counts and organisation cards | Replace as the primary signed-in workspace experience; preserve its server-side membership-scoped data and truthful empty state. |
| `/workspace/websites` | Tenant-scoped website list and create entry | Keep as Website Engine project/library destination; share workspace shell. |
| `/create` | Website setup wizard; optional AI proposal is not required by the product contract | Keep standard create flow free; label Website Engine, not AI Studio as the primary entry. |
| `/templates` | Existing `TemplateGallery` with metadata claiming 36 design concepts | Internal route may remain during compatibility work; customer-facing label becomes **Layouts**. Catalogue count does not prove 36 unique, high-quality designs. |
| `/editor` | Website editing route | Keep contextual to selected website; do not launch without a valid website context. |
| `/pages`, `/content`, `/forms`, `/seo`, `/versions` | Website editing/supporting tools | Contextual tools under Website Engine; route guards and selected website context must be preserved. |
| `/publish`, `/analytics` | Publishing and analytics | Website Engine supporting destinations; publishing must retain server validation and last-known-good site on failure. |
| `/workspace/domains` | Domain management with `websiteId` search parameter | Keep connected to the selected website and existing domain authorization. Paid custom-domain purchase is future Store integration; do not invent availability. |
| `/workspace/team` | Organisation membership/people view | Supporting workspace/settings destination; keep membership permissions server-enforced. |
| `/billing` | Billing page | Do not let subscription UI imply that the standard Website Engine requires payment. |
| `/support`, `/support/[caseId]` | Support case list/detail | Supporting destination; retain tenant isolation. |
| `/staff` | Staff workspace | Separate privileged area; must not appear as an ordinary consumer app icon. |
| `/site/[slug]/[[...path]]`, `/tenant-site-internal/[...path]` | Public/host-based website rendering | Preserve routing and existing published customer sites. Do not refactor as part of shell-only work. |

### API routes that are critical dependencies

- **LUCIA ID:** `/api/auth/login`, `/api/auth/callback`, `/api/auth/lucia/callback`, `/api/auth/logout`, `/api/auth/me`.
- **Local organisation/onboarding:** `/api/organizations/[organizationId]/members/[membershipId]`, `/api/onboarding/website`.
- **Website content:** `/api/websites/[websiteId]/content-library`, `draft`, `seo`, `structure`, `versions`, and `domains`.
- **Publishing:** `/api/publishing/websites`, `/api/publishing/publish`.
- **Domains:** `/api/domains`, `/api/domains/[domainId]`, `/api/domains/verify`.
- **Optional AI:** `/api/loomifi-ai/propose` — must stay optional; never a dependency for basic creation/edit/publish.
- **Support:** `/api/support/cases`, `/api/support/cases/[caseId]`, `/api/support/cases/[caseId]/messages`.

The workspace shell must link to existing authorized routes; it must not bypass route-level checks, use client-selected organisation IDs as authority, or make protected APIs accessible just because an icon is visible.

## 2. Existing navigation/control findings

### Incorrect or misleading labels

- `/templates` is linked as **Loom** from `/workspace`, even though its page is the website design catalogue. This conflicts with the canonical product boundary: **Layouts** are website designs; **Loom** is a separate professional network.
- `/create` is labelled **AI Studio** in the workspace even though the setup wizard is the standard website creation route. The basic flow must not be represented as AI-only or made dependent on AI.
- Existing pages repeat topbar and sidebar markup; active states, navigation items and labels already vary between Overview, Websites, Domains and Team pages.
- The Overview empty state links to `/create` as “Start website setup”; this is a real link, but it does not yet establish the new app-launch workspace model.
- Store, Portals and Business Admin are shown as disabled text in some pages, not actionable links. Keep them visibly unavailable until implemented; do not turn these into dead buttons.
- Settings is not established as a dedicated first-class route in the inspected workspace routes. Define it as a real route only when its supported controls are implemented.
- Loom has no `src/app/loom/page.tsx` route on current `main`. The catalogue at `/templates` must not be used as a stand-in for Loom.

### Control-level acceptance rules

For every item in the future workspace:
1. **Launchable app:** a link/button with a real route and server authorization; selected website/app context is preserved when needed.
2. **Unavailable app:** non-interactive status treatment, accessible explanation and no fake click/progress.
3. **Settings/action:** each control maps to a defined persisted operation or is clearly read-only; success only after server confirmation.
4. **User/avatar menu:** real profile/security/sign-out destinations; do not infer permissions from display data.
5. **Workspace icon rearrangement:** if movable icons are offered, keyboard/touch/drag alternatives and persistence rules must be specified; do not ship cosmetic drag behavior that resets without warning.
6. **Responsive navigation:** all destinations remain reachable at mobile, tablet and desktop sizes without hover-only interactions.
7. **Tenant switching:** only memberships returned by the server are selectable; every subsequent read/write revalidates access server-side.

## 3. Test inventory found on main

Vitest is configured for `src/**/*.test.ts` and `src/**/*.test.tsx` in a Node environment. The repository contains these 31 discovered test files:

### Directly relevant to workspace foundation
- `src/lib/access/policy.test.ts` — tenant and staff permissions.
- `src/lib/db/tenant-scope.test.ts` — organisation/user/staff transaction scope.
- `src/lib/tenancy/tenant-context.test.ts` — tenant context.
- `src/lib/auth/oauth.test.ts` — OAuth state/return-to handling.
- `src/lib/platform.test.ts` — platform behavior.
- `src/lib/onboarding/website-setup.test.ts`, `initial-website-draft.test.ts` — setup/draft baseline.
- `src/lib/templates/catalogue.test.ts`, `navigation.test.ts` — catalogue and navigation.
- `src/app/api/loomifi-ai/propose/route.test.ts` — route-level auth, origin, ownership and provider failure tests.

### Related Website Engine regression suites
- `src/lib/editor/site-draft.test.ts`
- `src/lib/loom/blueprint.test.ts`
- `src/lib/site-structure/loom-adapter.test.ts`, `structure.test.ts`
- `src/lib/versions/version-history.test.ts`
- `src/lib/publishing/host.test.ts`, `publishing.test.ts`
- `src/lib/domains/hostname.test.ts`
- `src/lib/content/content-library.test.ts`
- `src/lib/forms/forms.test.ts`
- `src/lib/seo/seo-settings.test.ts`

### Other existing suites (not substitutes for workspace UI tests)
- `src/lib/analytics/analytics.test.ts`
- `src/lib/billing/billing.test.ts`, `paystack.test.ts`, `providers.test.ts`, `record-verified-paystack-settlement.test.ts`, `verify-paystack-server.test.ts`, `verify-transaction.test.ts`
- `src/lib/loomifi-ai/gateway.test.ts`, `provider.test.ts`
- `src/lib/support/validation.test.ts`

### Missing evidence for the workspace redesign
- No workspace page/component test was found in the repository tree.
- No browser/E2E suite or Playwright config was found in the repository tree.
- No dedicated responsive viewport, keyboard-navigation, touch/drag, reduced-motion, or icon-launch integration tests were found.
- No direct route test was found for the current workspace page, website list, domain page, or team page.
- The existing AI proposal route test is not evidence that the whole workspace flow works.
- No test or screenshot evidence currently establishes 36 meaningfully distinct Layouts.
- The repository quality workflow `.github/workflows/quality.yml` runs Node 22, `npm install`, `npm run lint`, `npm run typecheck`, `npm run db:check`, `npm test`, and `npm run build`. This inventory did not execute those commands; current main baseline results remain **unknown**.

## 4. Required Phase 1 test plan before implementation acceptance

1. Capture baseline results on the exact main SHA: lint, TypeScript, migration consistency, all unit tests, production build.
2. Add component/route tests for authenticated and signed-out workspace states, zero memberships, one membership, multiple memberships, inactive membership, and query failure.
3. Test every enabled icon/link target and active navigation state; assert Store, Portals and Business Admin remain unavailable and no Loom link points to Layouts.
4. Test permission-denied and cross-tenant cases for app entry and tenant switching; UI visibility must not replace server checks.
5. Add browser coverage for mobile, tablet and desktop viewports; touch and keyboard navigation; focus visibility; reduced motion; and no horizontal overflow.
6. Confirm website create/edit/preview/publish remains free and works when AI/provider settings are absent.
7. Regression-test the existing published websites and verify failed saves/publishes preserve the last known-good live version.
8. Only update phase status after actual command output and browser/tenant-isolation evidence are recorded.

## 5. Phase 1 status

- [x] Enumerated current app routes and critical API dependencies from the repository tree.
- [x] Inspected the workspace page, website list, domain page, team page, catalogue route and creation route.
- [x] Enumerated existing Vitest files and quality workflow.
- [x] Identified misleading labels, missing workspace-specific UI tests and absent E2E evidence.
- [ ] Execute the main quality baseline.
- [ ] Complete browser/device behavior baseline and live-site regression checks.

**Status remains IN PROGRESS.** This is a source inventory, not proof that runtime behavior or all controls have been verified.
