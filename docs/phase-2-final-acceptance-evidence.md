# Phase 2 — Final acceptance evidence (2026-10-28)

**Repository:** `trendorafindsinc-jpg/lucia-os`  
**Baseline:** `main` at `9c5d0bbbea12437c932baecda27e9ee8e3894796`  
**Disposition:** **OPEN — acceptance gates remain. Do not start Phase 3.**

This record distinguishes directly observed results from source review and checks that remain unproven. No production database rows were changed during the checks below.

## Evidence observed

### Production deployment and staff authorization

- GitHub combined status for baseline `9c5d0bbbea12437c932baecda27e9ee8e3894796` reports Vercel success: [deployment](https://vercel.com/trendoraplc-5738/lucia-os/Hvbg8avZoeECFmisUWeb4e5E7GJ6).
- The final acceptance candidate commit `4baeb357df7e2f18669a27016c6dc9b3762290b5` passed GitHub Actions Quality checks run `40697365887` (run 642): lint, TypeScript, Drizzle migration consistency, **40 test files / 285 tests**, and production build all passed.
- Vercel preview for the candidate's application-code commit `c4da569c780db0bb7e553235292eba7a29cd9480` reached READY. Live preview fetches of `/workspace`, `/workspace/websites`, `/workspace/domains`, `/workspace/team`, and `/loomify-ai` returned signed-out server-rendered views with LUCIA ID sign-in links and no tenant data. `/templates` rendered the Layouts page. `/loom` returned HTTP 404, confirming the current Loom registry/route mismatch. These are HTTP/server-render checks, not signed-in browser/device sessions.
- Founder staff-section access and denial for a newly verified ordinary account were reported by the user from live-browser tests. These are user-confirmed results, not independently reproduced by this record.
- Source review confirms `/staff/team` requires `staff.grants.manage`; the staff-grant API checks the same permission independently and returns 403 when the guard does not return an authorized staff user. Unit tests cover unauthorised listing/mutation, malformed JSON, unsupported roles and missing audit reason.

### Disposable Neon branch: `phase-2-tenant-integrity-test`

Branch ID: `br-jolly-paper-ba034v2i`; database: `lucia_os`. Checks were read-only or ran in a transaction with temporary probe records/results.

- The database role `phase2_rls_probe` was switched to inside the transaction and reported `rolbypassrls = false`.
- With organization A as transaction-local scope, queries attempting to read organization B returned **zero visible rows** for organizations, memberships, websites, website pages, website domains, billing invoices and support cases.
- Controlled cross-tenant INSERT probes were attempted under the non-bypass role. PostgreSQL RLS rejected inserts into all five tested tables: `organization_memberships`, `websites`, `website_domains`, `billing_invoices` and `support_cases`. The probe used a nested exception subtransaction so attempted rows were rolled back even if a policy allowed an insert. No probe rows were committed.
- The migration preflight and composite page/website ownership-FK checks previously recorded in `docs/phase-2-database-foundation.md` remain valid as historical disposable-branch evidence; they do not replace the checks below.

## Source review

- `src/app/api/onboarding/website/route.ts` places the user advisory lock, organization creation, initial owner membership, website and initial pages inside one `db.transaction` callback. A thrown database error is caught outside that callback and the route returns a generic failure response, consistent with transaction rollback semantics.
- Added `src/app/api/onboarding/website/route.test.ts`, `src/app/api/domains/route.test.ts`, and `src/app/api/support/cases/route.test.ts` on this evidence branch. These cover onboarding transaction failures/retries, cross-origin and unauthenticated domain writes, permission-denied and website-not-owned domain registration, plus unauthenticated and unauthorized support-case listing/creation. It covers unauthenticated, malformed JSON and invalid-input rejection before DB access; injected owner-membership and website failures; transaction callback non-commit on errors; successful organization/owner/website/page creation in one transaction; repeated setup reuse without duplicate writes; and safe handling of DB initialization failure. These are route-level mocked-transaction tests, not a substitute for a live PostgreSQL transaction test.
- Added `src/app/workspace/workspace-launcher.test.tsx` on this evidence branch. Server-render tests cover the workspace summary, labelled sections, available app destinations, real workspace tool links, and the non-clickable unavailable-app treatment.
- Source review and the new CSS contract test for `src/app/workspace/workspace-launcher.module.css` confirm explicit desktop, tablet and mobile grid breakpoints, visible focus outlines, and reduced-motion overrides. These are CSS/source checks; no real browser viewport, keyboard, touch, screen-reader or reduced-motion session has been captured.
- `src/lib/db/tenant-scope.test.ts` tests UUID validation and transaction-local context setup with mocked database transactions. Those unit tests are not database-level isolation proof.

## Acceptance matrix

| Gate | Result | Evidence / remaining work |
| --- | --- | --- |
| Production deployment status | PASS | Vercel status on baseline SHA |
| Candidate CI | PASS | Run 634 on `24fde545`: lint, typecheck, Drizzle check, 38/38 test files (274/274 tests), production build |
| Signed-out protected routes | PASS (server fetch) | Workspace, websites, domains, team and loomifyAI returned signed-out views with LUCIA ID links and no tenant data; Layouts page rendered |
| Loom v1 entry | **BLOCKER** | Product decision says Loom belongs in v1, but app registry marks it unavailable and preview `/loom` returns 404; needs an actual supported Loom route before launcher acceptance |
| Founder staff access / ordinary verified-user denial | USER-CONFIRMED | Reported live browser test; not independently reproduced here |
| Non-bypass role and cross-tenant reads | PASS | Disposable branch, `phase2_rls_probe`, seven relation checks returned zero foreign rows |
| Cross-tenant INSERT denial | PASS | Disposable branch, five RLS-denied insert probes; no rows committed |
| Composite page/website ownership integrity | PASS (prior evidence) | Existing disposable-branch migration/FK checks |
| Organization + initial-owner membership atomic rollback | PASS (database transaction semantics) / PARTIAL (runtime role) | On the disposable Neon branch, an organization INSERT followed by an intentional invalid owner-membership FK failed as expected; the enclosing PL/pgSQL exception subtransaction rolled back both, and follow-up counts showed zero orphan organizations/memberships. This ran under the database tool's owner context because the non-bypass probe role's organization INSERT was itself rejected by RLS; therefore it proves rollback semantics but does not independently prove this route's runtime role can complete the entire onboarding sequence. |
| Retry/idempotency and full onboarding HTTP route | PARTIAL — tests added | New route tests inject owner-membership and website-write failures and assert the transaction callback does not commit; success path asserts organization, owner membership, website and pages are attempted in one transaction; repeated setup reuses an existing owned website without additional writes. The transaction is mocked; live HTTP + PostgreSQL retry/idempotency remains to be exercised. |
| Protected-route negative cases across all tenant workflows | PARTIAL — expanded route tests | AI proposal, staff grants, onboarding, domain registration and support-case routes now have negative-case tests; other website/domain/publishing/support detail routes still need a complete route-by-route matrix |
| Migration rollback/recovery | PARTIAL | Prior preflight/failure checks recorded; full migration rollback/recovery has not been evidenced in this final pass |
| Workspace navigation, tabs and stale-state authorization | PARTIAL — launcher tests added | SSR tests assert registered available destinations, workspace tool links and disabled unavailable app tiles; preview confirms signed-out route. Live signed-in route-by-route authorization/browser verification remains open. **Product decision mismatch found:** user specified Loom belongs in v1, but the current registry renders Loom as unavailable and has no Loom route. This needs resolution before workspace acceptance can be signed off. |
| Responsive desktop/tablet/mobile, keyboard/touch accessibility, reduced motion | PARTIAL — source reviewed | Responsive CSS breakpoints, focus-visible styles and reduced-motion overrides exist; real-browser viewport/keyboard/touch/accessibility testing remains unproven |

## Decision

**Phase 2 is not declared complete by this evidence record.** The cross-tenant read and INSERT-denial results are useful security evidence, but organization/owner rollback, full protected-route checks, migration recovery, and workspace browser/device acceptance still lack reproducible evidence. Marking the phase complete now would overstate what was tested.

Next acceptance work is limited to Phase 2: run the new route and launcher tests in fresh CI; add any needed fixes; finish the protected-route matrix and real-browser/device checks; verify onboarding retry/idempotency against a real disposable PostgreSQL transaction; then update this matrix with actual outputs. Phase 3 remains blocked until those gates are passed and recorded.


## 2026-10-29 follow-up — Loom route and runtime migration evidence

**Candidate:** [PR #107](https://github.com/trendorafindsinc-jpg/lucia-os/pull/107), head `8929a1ec94a327ce11ad1dd82c1a5082010095a5`. This candidate selectively ports the existing Loom community implementation; it does not merge the old combined workspace redesign. The PR remains a draft and has not been merged or promoted to production.

### Verified on this candidate

- GitHub Actions Quality run **646** passed on the exact head: lint, TypeScript, Drizzle migration consistency, **46 test files / 312 tests**, and production build.
- Vercel preview for the exact head reached **READY**: [preview deployment](https://vercel.com/trendoraplc-5738/lucia-os/H5gp7WVCroXCCrny3atrrGBvsNbR). The deployment has not been promoted to production.
- The Loom entry now has a real `/loom` destination and the route/component/API files are included in the candidate. This fixes the source-level route/registry mismatch; a live browser session against the preview has not yet been independently captured.
- The nine Loom migration SQL files were applied in sequence to disposable Neon branch `loom-phase2-migration-acceptance` (`br-winter-dust-ba24kliv`). The database exposed all **15 Loom base tables**. Under `lucia_os_runtime`, the role has SELECT and INSERT privileges on all 15 tables, with `rolbypassrls=false` and `rolsuper=false`.
- Rollback/recovery was exercised on disposable branch `phase-2-preflight-failure-test` (`br-delicate-lab-bap4r47w`): all 50 migration statements were attempted in one transaction followed by a deliberate missing-relation failure; the transaction failed and a follow-up query found **zero Loom tables**, proving the DDL rolled back. The nine migrations were then applied successfully in sequence and the branch exposed all **15 Loom base tables**. No production data or production schema was changed.

### Still open — do not declare Phase 2 complete

- **Live route/browser acceptance:** the preview deployment is READY, but this environment could not fetch the Vercel preview through its browser-fetch path, and no signed-in browser/device session was captured. Desktop/tablet/mobile viewport, keyboard/touch, reduced-motion, feed loading/error, and authenticated user journeys therefore remain unverified in a real browser.
- **Full runtime authorization matrix:** current-head unit tests pass, including the existing post, connection, block, private-message, and staff-report tests, but there is not yet an end-to-end HTTP test against the actual application process and disposable Neon branch. Add/finish negative-case coverage for the remaining profile, verification, reports, saved-content, notifications, groups, replies, and staff-verification routes.
- **Private-data boundary:** Loom community tables intentionally currently rely on server-side route predicates for private messages, notifications, saved content, blocks, and staff-only data; the migration/runtime-role probe confirms table grants and that the runtime role is not superuser/BYPASSRLS, but it does not itself prove these application predicates against a live HTTP request. Treat this as a route-level acceptance gate, not as a passed database RLS gate.
- **Production schema rollout:** no production migration has been run. The code is not ready for promotion until the product owner approves a production migration window and the candidate's live acceptance gates pass.

**Disposition:** Loom's missing route is repaired in the PR candidate and migration rollback/recovery evidence is now available on disposable branches. Phase 2 remains **OPEN** because live browser acceptance and the complete runtime authorization matrix are not yet proven. Phase 3 remains blocked.


## 2026-10-29 — browser acceptance and expanded route authorization matrix

### Browser run (real Chromium against the Vercel preview)

- Target deployment: `https://lucia-b6eo0d9y9-trendoraplc-5738.vercel.app` (preview only; not production).
- Browser: Playwright + Chromium headless, real network requests, reduced-motion preference enabled.
- Result: **29/29 structural/navigation/anonymous-guard checks passed**, followed by an explicit API health smoke that exposed **two blocking 503 responses**. Therefore the browser gate is not accepted as functionally green.
- Evidence: desktop/tablet/mobile screenshots and the machine-readable Playwright report were captured in the temporary browser sandbox. The binary screenshots were not committed to the repository; the 29-check summary and results below are the retained evidence.
- Covered: `/loom` page and its feed/navigation landmarks; `/loom/discover`, `/loom/discussions`, `/loom/groups`, `/loom/connections`, `/loom/messages`, `/loom/notifications`, `/loom/saved`, `/loom/blocks`, `/loom/profile`, and `/loom/staff` page routes returned HTTP 200; tablet (768px) and mobile (390px) had no horizontal overflow; keyboard focus and reduced-motion preference were observed; anonymous private reads and write actions were denied with 401/403. However, direct API smoke on the latest READY preview returned **503** from `GET /api/loom/posts` and `GET /api/loom/groups` (storage unavailable / groups temporarily unavailable), while private API reads correctly returned 401. This indicates the preview deployment's configured database does not have the Loom schema; the preview was not migrated because its database target is not confirmed disposable.
- Scope limit: this is genuine browser/device-emulation evidence for the **signed-out** path and route shell only. It is not a signed-in session test, does not prove private-data isolation across two authenticated users, and the two DB-backed API 503s prevent acceptance of feed/groups runtime.

### Route-level authorization matrix

- Added/expanded `src/app/api/loom/authorization-matrix.test.ts` to cover anonymous member discovery, private profile/notifications/saved/messages/verification reads, verification submission, profile editing, reports, saved-content mutations, notification updates, group creation/join/leave/posts, connection request/decision, block/unblock, reactions, replies, and staff verification decisions. The matrix asserts denied requests do not reach the database mock. Existing dedicated tests continue to cover post publishing, private-message connection requirements, block validation, staff report moderation, and cross-origin writes.
- GitHub Actions Quality run **653** passed on code head `da42cc206bedb2ed9207fba157294e71d6f6d1ad`: lint, TypeScript, Drizzle consistency, **47 test files / 318 tests**, and production build. The latest head differs only by acceptance documentation.

### Disposable database / live-process limitation

- Disposable Neon migration, rollback and least-privilege role evidence remains as recorded above.
- The local application source was cloned and built successfully in an isolated sandbox. Starting that process with the disposable Neon runtime connection was blocked by the execution environment's secret-handling boundary, so an actual HTTP request through a local Next.js process connected to that disposable database has **not** been proven in this run. The Vercel preview's database-backed API 503s were observed but not “fixed” by migrating an unconfirmed database target. I did not alter Vercel environment variables or attempt any production writes.
- Required remaining evidence: real HTTP process against the disposable branch using the non-bypass runtime role, plus authenticated two-user private-message/notification isolation and verified/unverified/staff negative cases. Do not mark Phase 2 complete until these are tested.

**Disposition remains Phase 2 OPEN; Phase 3 BLOCKED.**

### Isolated preview wiring (after the API smoke)

- Added a Vercel **Preview-only, branch-scoped** `DATABASE_URL_RUNTIME` environment variable for `phase-2-loom-route-and-runtime-acceptance`, pointing to disposable Neon branch `br-winter-dust-ba24kliv` using the non-bypass `lucia_os_runtime` role. Production and Development targets were not changed.
- This environment change does not alter an already-running deployment. A fresh branch deployment is required before repeating the live API smoke. The next acceptance step is to verify the new deployment reports healthy `/api/loom/posts` and `/api/loom/groups` reads, then run signed-in fixture isolation checks only on this disposable branch.


## 2026-10-29 follow-up — disposable-database HTTP and fresh browser acceptance

### Real app process against disposable Neon

- A fresh local Next.js development server was started in the isolated Vercel sandbox with `DATABASE_URL_RUNTIME` set only for that process to disposable Neon branch `br-winter-dust-ba24kliv`, database `lucia_os`, role `lucia_os_runtime`.
- Before HTTP testing, a direct role probe confirmed `current_user=lucia_os_runtime`, `rolbypassrls=false`, `rolsuper=false`, and 15 Loom tables.
- Real HTTP requests through that running Next.js process returned `200` for `GET /api/loom/posts` and `GET /api/loom/groups`; each returned a valid empty collection. This confirms the app can connect to and query the disposable branch with the non-bypass runtime role.
- The same process returned `401` for unauthenticated `/api/loom/profile`, `/api/loom/messages`, `/api/loom/notifications`, `/api/loom/saved`, `/api/loom/staff/verification`, `/api/loom/staff/reports`, and `/api/loom/members`. Invalid reaction, group, and reply identifiers returned `400`. No HTTP writes were sent and no database rows were changed by this smoke run.
- Separately, a branch-scoped Preview-only `DATABASE_URL_RUNTIME` was configured for `phase-2-loom-route-and-runtime-acceptance` to the same disposable Neon branch; production and development environment targets were not changed. A fresh preview deployment picked up this setting. The preview's database-backed posts/groups GETs now return `200`, with empty collections.

### Genuine browser acceptance against the wired preview

- Target: `https://lucia-mtrv14c8u-trendoraplc-5738.vercel.app` (protected Vercel Preview; not production).
- Playwright + headless Chromium completed **29/29 checks** at `2026-10-29T10:48:19Z`; no failed assertions or uncaught page errors were recorded.
- Checks covered the Loom feed landmark/title and navigation, the real route destinations (`/loom/discover`, `/loom/discussions`, `/loom/groups`, `/loom/connections`, `/loom/messages`, `/loom/notifications`, `/loom/saved`, `/loom/blocks`, `/loom/profile`, `/loom/staff`), desktop layout, tablet width 768px, mobile width 390px with no horizontal overflow, keyboard focus visibility, reduced-motion preference, and anonymous private-read/write denials.
- Screenshots captured: `loom-disposable-desktop.png`, `loom-disposable-tablet.png`, `loom-disposable-mobile.png` in the temporary browser sandbox. They are retained in that sandbox snapshot, not committed as repository binaries. The report is `acceptance-disposable-report.json` in the same sandbox.
- Browser coverage is signed-out. The expected unauthenticated API 401 responses appear in browser console as rejected fetches; no uncaught JavaScript page errors were observed.

### Authorization matrix and current disposition

- Expanded the route-level matrix with explicit unverified-member denials for group creation, profile editing and reactions, plus non-staff denial for business-verification review. The matrix also covers anonymous denials, cross-origin write rejection, malformed identifiers and the requirement that denied requests do not reach database access. Existing dedicated tests cover post publishing, private-message connection requirements, blocks and staff report moderation.
- GitHub Actions Quality run **656** passed on head `1149ba4ef5a6ed6e977372d93da1cf5cc3162820`: lint, TypeScript, Drizzle consistency, **47 test files / 320 tests**, production build.
- **Still open:** signed-in end-to-end browser sessions for unverified, verified and staff identities; two-user private-message/notification isolation through HTTP; and actual mutation/transaction behavior for those roles against disposable data. These are not proven by anonymous smoke tests or mocked route tests. No production schema migration or production data writes were performed.
- **Disposition:** the database connection, anonymous HTTP gate, browser structural gate and source-level authorization matrix are now evidenced. Phase 2 remains **OPEN** until the authenticated multi-user privacy/role matrix is exercised end-to-end. Phase 3 remains blocked.


## 2026-10-29 follow-up — authenticated HTTP and browser matrix passed on disposable preview

### Fixes made from real runtime findings

- Added migration `0024_loom_public_authors.sql` and Drizzle declaration for a narrow view exposing only `id`, `display_name`, and `active`. Loom read routes that need another member's display label now join this view instead of querying `app_users` directly, whose RLS policy intentionally limits direct row reads to the current session. This restores public feed/profile and other-member labels without exposing Core subject IDs or contact fields.
- Fixed rate-limit SQL timestamp parameters by passing ISO strings into raw SQL fragments; Drizzle's raw SQL interpolation had been binding `Date` objects in a way postgres-js could not handle. The post-write endpoint now correctly returns the intended authorization response for unverified users and permits verified users to publish. Temporary preview-only diagnostic logging was removed after the fix.
- Applied migration 0024 only to disposable Neon branch `br-winter-dust-ba24kliv`; no production schema or data was changed.

### Real HTTP requests through the Vercel Preview app, using disposable Neon

- Target deployment: `https://lucia-doputzqv0-trendoraplc-5738.vercel.app`, built from code head `5062325b9f52cd56d8df013c560f93687e93cfda` (the subsequent commit only removes temporary preview logging).
- **18/18 authenticated HTTP acceptance checks passed** against the branch-scoped Preview-only `DATABASE_URL_RUNTIME` using `lucia_os_runtime`:
  - Public `GET /api/loom/posts` returned 200 and included the fixture posts plus their display names; `GET /api/loom/groups` returned 200.
  - Anonymous private messages returned 401.
  - User A could read only the A–B conversation; the B–C fixture message did not leak, and A could not open a conversation with unconnected C (403).
  - User A saw only A's notification; user B saw only B's notification.
  - Verified A returned verified status; unverified C returned pending status.
  - Verified public member profile and connection list resolved names through the safe view.
  - Unverified C's profile edit and post publish were denied with 403; verified A's post publish returned 201.
  - Non-staff A could not read the staff verification queue (403); cross-origin report submission was rejected (403).
- Database assertions after the HTTP run confirmed: one verified-user test post was created; no unverified-user post was created; marking A's notifications read changed A's fixture only and left B's notification unread. These fixture rows and mutations exist only on the disposable branch.

### Signed-in browser acceptance

- A second real Playwright/Chromium run on the same Preview passed **7/7 signed-in UI checks**: verified A sees the public feed fixture and author name; desktop and mobile feed have no horizontal overflow; B sees B's notification and not A's; unverified C's profile page renders; and ordinary member A sees no private fixture data on the staff route. The first attempt used too-short waits and failed two content assertions; rerunning with hydration waits made all seven pass. No production environment or data was touched.
- The earlier 29/29 structural/navigation/anonymous checks remain valid for the same Loom UI shell. The current signed-in run is the stronger follow-up for identity-specific rendering.

### Current disposition

- Source-level route authorization matrix: CI passed on code head `5062325b9f52cd56d8df013c560f93687e93cfda`, **47 test files / 320 tests**, including lint, TypeScript, Drizzle consistency and production build. A final logging-only cleanup commit is pending its own deployment/checks.
- Disposable DB migration/rollback/recovery: passed.
- Real HTTP against disposable DB: passed for the tested anonymous, verified, unverified and non-staff cases above.
- Signed-in browser acceptance: passed for the seven journeys above.
- Still required before Phase 2 closure: wait for the logging-only cleanup commit's CI and Preview deployment; then repeat a brief post-cleanup API smoke. Full staff-positive/authorized-moderation mutation coverage and the complete route-by-route mutation matrix still need explicit proof. Keep PR draft and Phase 3 blocked until those last checks are complete.
