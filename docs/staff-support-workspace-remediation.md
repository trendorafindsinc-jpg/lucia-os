# Staff and customer workspace remediation

Status: implemented; authenticated browser/database acceptance remains open.
Baseline: main `48319d4` (Phase 7, PR #123). This is a focused workspace/support correction, not a declaration that the next roadmap phase is complete.

## Confirmed source defects

- Staff overview and support queue linked to `/support/[caseId]`, rendering customer navigation and registering a customer app tab.
- Shared support APIs implicitly selected privileges. GET preferred tenant membership while POST preferred staff grants. A dual-role person could see customer messages but send a staff reply from the same customer screen.
- Opening requests collected a subject but no opening message; customers had to discover and open the separate conversation.
- Organisation case-list requests could finish out of order and replace the newly selected organisation's queue with stale results.
- Internal notes incorrectly changed case state to waiting on customer.
- Staff case status/assignment APIs existed without usable conversation controls; assignee lookup used an unscoped database handle and ignored grant expiry.
- The staff home rejected security-reviewer grants because it required a support permission.

## Implemented contract

| Area | Route / behaviour |
| --- | --- |
| Customer support | `/support`, `/support/[caseId]`; active organisation permissions only |
| Staff support | `/staff/support`, `/staff/support/[caseId]`; explicit staff grants only |
| Customer APIs | `/api/support/cases/...`; no staff fallback, customer-visible messages only |
| Staff APIs | `/api/staff/support/cases/...`; no tenant fallback; separate read/reply/resolve/assign permissions |
| Queue | Subject search, status and priority filters applied before latest-100 limit; clear/reset and truthful counts |
| Conversations | Customer replies, explicitly labelled internal notes, refresh/error states; privileged resolve/reopen controls |
| Ownership | Atomic assign-to-self only for unassigned or already-self-assigned cases; conflicting ownership returns 409 |
| Opening request | Details saved with case and audit in one transaction; direct saved-conversation link |
| Organisation directory | `/staff/organisations`; `tenants.read`; latest 100 matching names/status/creation dates; read-only |
| Audit review | `/staff/audit`; `audit.read` or existing operator grant-management permission; latest 100 matching events, no message bodies/private metadata |
| Navigation | Shared staff navigation; no customer launcher, Orb or customer tabs on staff pages |

An identity may legitimately have both customer and staff access. Shared LUCIA ID sign-in remains intact. The chosen route determines the operation context, and every API independently verifies permissions. Client props and cached tab state grant no authority. No impersonation, tenant suspension, new authentication system, schema migration or production write was introduced.

The old customer case PATCH endpoint is intentionally removed. Case management uses the staff endpoint. Internal notes preserve the waiting status. Assignees require an active unexpired reply-capable staff grant checked inside staff database scope. Navigation destinations independently deny insufficient permissions.

## Verification evidence

- `npm run lint`: passed, with 9 pre-existing warnings outside this change.
- `npm run typecheck`: passed.
- `npm test -- --reporter=dot`: 52 files / 362 tests passed on the final local implementation.
- `npm run db:check`: passed; no migration changes.
- `npm run build`: passed on the final local implementation, including routing middleware manifest checks.
- `npm run test:routing:http`: passed, including compiled-server host routing, anonymous customer/staff API denial, staff page access gates and absence of customer tab/launcher markup.
- New regressions cover dual-role customer author attribution, absence of privilege fallback in both directions, internal-note state, closed-case refusal, mutation permission denial, anonymous access, read-only staff-page denial, opening-message transaction wiring, and refusal to restore staff routes as customer tabs.

## Evidence limitations and release checks

Vercel project `lucia-os` was queried. A one-day query was rejected because the Hobby plan does not retain that window. A subsequent 30-minute production query returned no records. These results do **not** confirm a historical logged incident; the overlap is established by source routing/handler evidence.

The connected Chrome browser could list the existing staff support tab, but two attempts to inspect it failed with a focus-emulation timeout. No authenticated browser acceptance, live customer/staff message exchange, screenshot/layout acceptance or live RLS execution is claimed. No production data was changed for testing.

Before production acceptance, exercise separate customer, support-agent, support-lead, operator, security-reviewer and dual-role identities: open request with details; reply in both contexts; ensure internal notes never appear to customers; deny cross-organisation customer access; resolve/reopen; concurrent self-claim conflict; revoked/expired grants; responsive navigation and failed-load recovery. The queue/directory/audit are deliberately bounded latest views, not complete-report exports. Concurrent reply-versus-close transaction behaviour still needs database acceptance.

No merge or production deployment is authorised by this document. The next safe action is review the PR, complete authenticated acceptance, then obtain explicit merge approval.
