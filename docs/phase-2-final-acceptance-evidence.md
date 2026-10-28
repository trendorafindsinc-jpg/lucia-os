# Phase 2 — Final acceptance evidence (2026-10-28)

**Repository:** `trendorafindsinc-jpg/lucia-os`  
**Baseline:** `main` at `9c5d0bbbea12437c932baecda27e9ee8e3894796`  
**Disposition:** **OPEN — acceptance gates remain. Do not start Phase 3.**

This record distinguishes directly observed results from source review and checks that remain unproven. No production database rows were changed during the checks below.

## Evidence observed

### Production deployment and staff authorization

- GitHub combined status for baseline `9c5d0bbbea12437c932baecda27e9ee8e3894796` reports Vercel success: [deployment](https://vercel.com/trendoraplc-5738/lucia-os/Hvbg8avZoeECFmisUWeb4e5E7GJ6).
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
- The route has no dedicated route-level test file on `main`; schema validation tests alone do not prove transaction rollback, retry idempotency or the complete live onboarding flow.
- `src/lib/db/tenant-scope.test.ts` tests UUID validation and transaction-local context setup with mocked database transactions. Those unit tests are not database-level isolation proof.
- `docs/phase-1-route-control-test-inventory.md` records that the repository has no browser/E2E suite and no dedicated responsive viewport, keyboard, touch or reduced-motion tests. These checks have not been newly demonstrated here.

## Acceptance matrix

| Gate | Result | Evidence / remaining work |
| --- | --- | --- |
| Production deployment status | PASS | Vercel status on baseline SHA |
| Founder staff access / ordinary verified-user denial | USER-CONFIRMED | Reported live browser test; not independently reproduced here |
| Non-bypass role and cross-tenant reads | PASS | Disposable branch, `phase2_rls_probe`, seven relation checks returned zero foreign rows |
| Cross-tenant INSERT denial | PASS | Disposable branch, five RLS-denied insert probes; no rows committed |
| Composite page/website ownership integrity | PASS (prior evidence) | Existing disposable-branch migration/FK checks |
| Organization + initial-owner membership atomic rollback | **NOT PROVEN** | The attempted failure-injection probe was itself rejected by the organization INSERT policy before reaching the intended invalid-membership failure. This is an inconclusive fixture/setup result, not a passing rollback test. Re-run with a correctly scoped disposable-branch fixture and assert no organization or membership remains after injected failure. |
| Retry/idempotency and full onboarding HTTP route | **NOT PROVEN** | Add/execute route-level failure-injection tests and exercise real transaction behavior |
| Protected-route negative cases across all tenant workflows | PARTIAL | Existing helper/AI/staff tests plus database read/insert probes; no complete route-by-route matrix yet |
| Migration rollback/recovery | PARTIAL | Prior preflight/failure checks recorded; full migration rollback/recovery has not been evidenced in this final pass |
| Workspace navigation, tabs and stale-state authorization | USER-REPORTED / PARTIAL | User previously reported tabs working; no current automated route/browser trace |
| Responsive desktop/tablet/mobile, keyboard/touch accessibility, reduced motion | **NOT PROVEN** | No browser/E2E test harness or recorded device results |

## Decision

**Phase 2 is not declared complete by this evidence record.** The cross-tenant read and INSERT-denial results are useful security evidence, but organization/owner rollback, full protected-route checks, migration recovery, and workspace browser/device acceptance still lack reproducible evidence. Marking the phase complete now would overstate what was tested.

Next acceptance work is limited to Phase 2: correct and rerun the organization/owner rollback probe; add route-level failure/retry coverage; perform protected-route and browser/device checks; run fresh CI on the exact final candidate; then update this matrix with actual outputs. Phase 3 remains blocked until those gates are passed and recorded.
