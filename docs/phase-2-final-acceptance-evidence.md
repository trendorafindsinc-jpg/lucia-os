# Phase 2 — Final acceptance evidence (2026-10-28)

**Repository:** `trendorafindsinc-jpg/lucia-os`  
**Baseline:** `main` at `9c5d0bbbea12437c932baecda27e9ee8e3894796`  
**Disposition:** **OPEN — acceptance gates remain. Do not start Phase 3.**

This record distinguishes directly observed results from source review and checks that remain unproven. No production database rows were changed during the checks below.

## Evidence observed

### Production deployment and staff authorization

- GitHub combined status for baseline `9c5d0bbbea12437c932baecda27e9ee8e3894796` reports Vercel success: [deployment](https://vercel.com/trendoraplc-5738/lucia-os/Hvbg8avZoeECFmisUWeb4e5E7GJ6).
- The final acceptance candidate commit `24fde54541612babb26a6e1b77baab9413f1b159` passed GitHub Actions Quality checks run `40695212475` (run 634): lint, TypeScript, Drizzle migration consistency, **38 test files / 274 tests**, and production build all passed.
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
- Added `src/app/api/onboarding/website/route.test.ts` on this evidence branch. It covers unauthenticated, malformed JSON and invalid-input rejection before DB access; injected owner-membership and website failures; transaction callback non-commit on errors; successful organization/owner/website/page creation in one transaction; repeated setup reuse without duplicate writes; and safe handling of DB initialization failure. These are route-level mocked-transaction tests, not a substitute for a live PostgreSQL transaction test.
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
| Protected-route negative cases across all tenant workflows | PARTIAL | Existing helper/AI/staff tests plus database read/insert probes; no complete route-by-route matrix yet |
| Migration rollback/recovery | PARTIAL | Prior preflight/failure checks recorded; full migration rollback/recovery has not been evidenced in this final pass |
| Workspace navigation, tabs and stale-state authorization | PARTIAL — launcher tests added | SSR tests assert registered available destinations, workspace tool links and disabled unavailable app tiles; preview confirms signed-out route. Live signed-in route-by-route authorization/browser verification remains open. **Product decision mismatch found:** user specified Loom belongs in v1, but the current registry renders Loom as unavailable and has no Loom route. This needs resolution before workspace acceptance can be signed off. |
| Responsive desktop/tablet/mobile, keyboard/touch accessibility, reduced motion | PARTIAL — source reviewed | Responsive CSS breakpoints, focus-visible styles and reduced-motion overrides exist; real-browser viewport/keyboard/touch/accessibility testing remains unproven |

## Decision

**Phase 2 is not declared complete by this evidence record.** The cross-tenant read and INSERT-denial results are useful security evidence, but organization/owner rollback, full protected-route checks, migration recovery, and workspace browser/device acceptance still lack reproducible evidence. Marking the phase complete now would overstate what was tested.

Next acceptance work is limited to Phase 2: run the new route and launcher tests in fresh CI; add any needed fixes; finish the protected-route matrix and real-browser/device checks; verify onboarding retry/idempotency against a real disposable PostgreSQL transaction; then update this matrix with actual outputs. Phase 3 remains blocked until those gates are passed and recorded.
