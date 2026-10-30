# Phase 9 — Workspace continuity

## Baseline and audit

Started from main `372bec6`, which includes the Phase 7 registry, merged Phase 8 PR #125, and staff/customer separation. Read AGENTS, product vision, roadmap, architecture, engineering/security baselines, workspace contract and Phases 5–8. The existing tab shell used global session keys `lucia.workspace.tabs.v1` and `lucia.workspace.snapshots.v1`; it already had dirty markers, native close confirmation, clean-tab eviction and beforeunload. Layout Studio, Layouts and Lattice had snapshots. Lattice already rendered native React adapters, not frames; its pane provider cancelled stale component callbacks. Settings already used account-owned PostgreSQL preferences, optimistic revision checks, validated organization choices and device-local wallpaper.

Gaps: unowned global recovery could cross accounts; raw snapshots lacked comprehensive bounds; app navigation had no shared destructive-transition decision; active and inactive close needed independent protection; a late editor save could update a different context; saved-resource recovery could display private cached content before authorization; Settings lost unsaved controls on unmount. Existing server resource membership checks, publishing, preference CAS and identity delegation are retained.

## Contract and navigation

`continuity.ts` defines versioned recovery, validated canonical routes, logical application/resource identities, real active/inactive/recoverable states, adapter save/discard/suspend actions and transition status. It consumes the Phase 7 registry and existing tab identity helpers. Recovery availability is distinct from server-confirmed persistence and access remains unverified until the existing authorized route/API runs.

The shared tab shell coordinates customer workspace anchors, tabs, mobile switcher, Home, App Library, Settings, Orb links and Lattice full-screen fallback. Next App Router remains the router. A validated snapshot permits ordinary app switching without prompting. Destructive close/replacement offers Cancel/Discard and Save and Continue only when a mounted adapter supplies a real save. Save failure keeps the dialog and work available. Inactive close removes only that logical resource's snapshots. Twelve tabs is the preferred limit: evict the first clean tab deterministically; never evict a dirty tab; stop opening new contexts when all 24 bounded recovery slots are dirty.

History entries retain Next state plus a continuity index. Destructive known-history movement rolls back before asking, then replays only after an accepted decision. Recoverable Back/Forward needs no prompt. Entries predating the coordinator cannot be reliably reversed; native unload protection remains a fallback for document departures. Unrelated external links are not globally intercepted.

## State adapters and isolation

- Layout Studio recovers bounded editable data, including temporarily empty required text. Actual API saves still require the strict draft schema. It waits for authorized website GET before applying a private recovered draft. Draft and snapshot keys derive from validated website/template contexts. Context leases and submitted-draft comparison prevent late save completion clearing newer edits or another context. Save buttons stay disabled during loading/denial.
- Layouts retains existing category/search browsing state. Selection does not publish or acquire anything.
- Lattice preserves active pane, native app route, pane ordering/open state, Focus/Split, ratio and independently scoped snapshots/dirty markers. Only registry-verified Layout Studio and Layouts adapters can split. Pane mutations checkpoint immediately; stale unmounted pane callbacks remain ignored. Unsupported apps use their normal server-checked full-screen destination. Existing tablet breakpoints and scrollports remain.
- Settings retains Phase 8 server preference CAS, failure/retry and device scopes. Unsaved controls recover only against the matching server revision. Older recovery is retained for explicit restore/discard, never automatically written over newer server preferences. Organization selection remains a server-validated preference; it does not rebind existing websites or grant tenant access.

## Recovery format and migration

Storage is `lucia.workspace.recovery.v2:<server-session-account-id>`. The existing authenticated `/api/auth/me` endpoint supplies identity; a local user ID cannot select an account. Customer platform hostnames and supported customer routes gate initialization; public website/staff pages do not initialize customer recovery. Session changes hide restored content and securely reload. Save requests also include a session-account consistency header; the server compares it with the real session before continuing normal membership checks.

Version 2 validates owner, revision, timestamp (12-hour lifetime), routes, native adapters and each supported snapshot. Bounds: 24 tabs, 1.5 MB envelope, 256 KB per snapshot, finite JSON only, depth/node/string/array limits and forbidden prototype keys. Unknown fields/adapters are ignored. IDs and labels are reconstructed, not trusted. No credential, grant, licence or entitlement is restored. Deleted/revoked resources fail existing server authorization and cached drafts stay hidden. Recovery is local to this browser session, not a database save or cross-device synchronization.

Compatible legacy Lattice data may migrate only when its existing owner marker matches the authenticated session. Standalone unowned legacy drafts cannot safely be attributed and are not imported. Legacy keys remain untouched; a successfully written v2 envelope takes precedence and prevents repeated import. Corrupt/expired v2 data is left untouched, with an honest memory-only warning. Disabled storage cannot crash the workspace. Session storage isolates browser tabs; revision comparison prevents an observed newer envelope from being overwritten. It is not a distributed locking system.

Loomify editor handoff also uses an account-scoped v2 key, short expiry and bounded validated proposal data. Unowned v1 handoffs are not read. No private draft is uploaded to LUCIA Core.

## Security and deployment

Identity remains LUCIA Core's responsibility; local session and organization/resource authorization remain server authoritative. The account consistency header is an additional race guard, not an identity claim or permission. Staff destinations are excluded from customer recovery. Customer-host middleware behavior is retained; the shared platform-host predicate is used for UI initialization as well as existing middleware checks. No production credentials, environment, DNS, payments, Core implementation or live customer website is changed.

No schema or migration is added. Phase 8's existing preference migration remains a separate controlled release prerequisite where not already applied; Phase 9 does not execute it in production. Rollback is code rollback: v2 session recovery is separate from legacy data and database content. Downgrading cannot import v2 into an older shell.

## Implementation areas

New continuity/JSON/history contracts and tests; shared tab shell and confirmation styles; editor draft recovery schema, editor and draft API tests; Lattice adapter coordination; Settings and preference account guards; Loomify handoff isolation; platform-host helper/root shell gating. Registry capability metadata is updated only for implemented Settings recovery. No competing app registry, router or database service.

## Verification record

Executed locally on 2026-10-30:

| Check | Actual result |
| --- | --- |
| `npm run lint` | Zero errors; three pre-existing warnings (billing unused import, SEO image, AI provider test unused import) |
| `npm run typecheck` | Passed |
| `npm test` | 58 files, 444 tests passed |
| `npm run db:check` | Passed; no new migration |
| `npm run build` | Production build and compiled middleware presence passed |
| `node scripts/check-settings-http.mjs` | Real sessions, defaults/save, cross-account/tenant denial, concurrent conflict, payload validation/CSRF, revocation, forced owner RLS and rollback passed |
| `node scripts/check-routing-http.mjs` | Compiled platform/tenant/custom-domain routes, private paths, staff/customer gates, spoofing and static assets passed |

HTTP and browser tests used a pre-existing isolated `*_acceptance` Neon database, synthetic accounts/resources and a non-superuser NOBYPASSRLS runtime role. The temporary local transport carried PostgreSQL through an encrypted Neon WebSocket; application queries still used the normal Postgres/Drizzle stack. No production data or migration was involved.

The final combined browser run passed **22 checks**; the independent security/recovery run passed **7 checks**, with no unhandled application errors.

`check-continuity-browser.mjs` covers editor app switching (including temporarily invalid text), distinct website drafts, inactive close cancellation/discard, real Save and Continue, failed-save retry, Back/Forward, preview close without fake Save, Settings recovery/save, Layouts/App Library, Lattice pane state/modes/order/ratio/refresh, seven viewports, keyboard pane scrolling with reduced motion, mobile switcher/Orb, foreign-tenant denial, revocation and account recovery isolation.

`check-continuity-security-browser.mjs` additionally exercises delayed-save/newer-edit isolation, organization switching without resource reassignment, revoked organization removal, actual deleted-resource denial, corrupt storage preservation and disabled-storage memory recovery. Both runners require explicit isolated database URLs, seed synthetic fixtures, reject superuser/bypass-RLS runtime connections, and clean up their fixtures. They never use the normal application DB variables for setup.

To reproduce, install Playwright in the test environment (or provide its module path through `CONTINUITY_PLAYWRIGHT_MODULE`) and a compatible Chromium (`CONTINUITY_CHROMIUM_EXECUTABLE` if external). Supply `CONTINUITY_TEST_ADMIN_URL` and `CONTINUITY_TEST_RUNTIME_URL` for the same migrated database whose name ends `_acceptance`, build the application, then run each browser script. Do not commit those values or browser authentication state. Optional `CONTINUITY_TEST_PORT` selects the local server port.

Browser evidence: [combined acceptance](evidence/phase9/browser-acceptance.json), [recovery/security acceptance](evidence/phase9/security-browser-acceptance.json), and screenshots at [phone](evidence/phase9/lattice-390x844.jpg), [768 portrait](evidence/phase9/lattice-768x1024.jpg), [820 portrait](evidence/phase9/lattice-820x1180.jpg), [1024 landscape](evidence/phase9/lattice-1024x768.jpg), [large tablet](evidence/phase9/lattice-1180x820.jpg), [desktop](evidence/phase9/lattice-1280x800.jpg), [large desktop](evidence/phase9/lattice-1440x900.jpg). These are authenticated interactions against the real compiled application, not anonymous screenshots. Browser emulation is not physical touch acceptance.

The first pushed implementation commit `acd78f1` passed GitHub Quality checks [run 41050939551](https://github.com/trendorafindsinc-jpg/lucia-os/actions/runs/41050939551); Vercel deployment `dpl_72UwrnPZEzWLK8LAEHybzx8f4oBG` was Ready for that exact commit. Initial generic protected fetch failed; a short-lived deployment-specific share link enabled authenticated preview API checks for session, preferences, owned website, foreign website denial and staff denial. Temporary links are revoked after verification. Final commit CI/preview results are recorded in [PR #128](https://github.com/trendorafindsinc-jpg/lucia-os/pull/128) and the delivery report; a Ready build alone is not browser acceptance.

Remaining acceptance boundaries: physical tablet/touch testing and a full authenticated preview UI matrix remain Phase 10 gates. Local authenticated browser evidence and preview API checks are reported separately. Recovery cannot guarantee survival if the operating system kills a tab before JavaScript checkpoints or browser storage is disabled. History entries that predate coordination rely on browser unload protection. Standalone unowned legacy drafts cannot be securely attributed and are deliberately not imported.

## Phase 10 handoff

Run comprehensive authenticated workspace acceptance on physical phone/tablet hardware, assistive technology, protected preview/production release configuration and extended network/lifecycle interruptions. Recheck all current permission and publishing gates. Local recovery cannot replace a successful server save, browser storage may be unavailable, and platform browser unload behavior is not guaranteed on mobile.
