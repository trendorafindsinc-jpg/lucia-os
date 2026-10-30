# Phase 8 — LUCIA Control Center and workspace context

Status: implementation and automated local verification in progress. Not merged. Production migration has **not** been applied.

## Initial audit and reused foundations

Base `main`: `db9a73f1ca1a8551a2a5870f35750e18f6813fc3`, including Phase 7 PR #123 and staff/customer isolation PR #124. Read AGENTS.md, canonical product vision, 30-phase roadmap, architecture/security/engineering standards, workspace contract and Phase 3–7 specifications. Active historical PRs were inspected; none was incorporated.

The existing registry already owns app identity, SVG icons, availability, permissions and native adapter declarations. Settings previously launched a mobile-only local panel. `lucia-os:appearance:<userId>` held `{wallpaper,custom,showHomeApps}`; there was no account preference table. The desktop and tablet Lattice share two explicitly allowed native panes, bounded scrollports, session snapshots and dirty-close handling. Those foundations are preserved. There are no verified installed commercial apps on this baseline; Store and Loom remain unavailable.

## Architecture and UI

`/workspace/settings` is an authenticated, shared Control Center. The Phase 7 Settings registry entry now launches this route on phones, tablets and desktops. Home keeps Overview and Settings pinned. Optional Home entries use canonical registry IDs and account ordering. The mobile App Library, More navigation, shared Orb and new full-size `/workspace/apps` library all reach the same Settings application. Browser links and `?category=` deep links remain functional. Native Lattice adapters are unchanged; Settings opens full screen rather than being embedded without an adapter.

Six categories: appearance/display; Home/apps; LUCIA ID/account; organizations; accessibility/region; software/websites. Desktop has a category sidebar, tablet a compact sidebar and phone a scrollable category strip with full-screen content. Blue Glass surfaces, SVG icons, labelled inputs, pressed/current states, live save/error messages, keyboard move controls and visible focus remain native CSS/React; no runtime animation or UI dependency was added.

Themes: light/dark/system. Existing Aurora, Ocean, Midnight and Sunset preset gradients are preserved. Custom images require JPG/PNG/WebP MIME, matching signature, nonempty size under 900 KB, successful image decoding, dimensions at most 8192 per side and at most 24 megapixels. SVG, arbitrary URLs, CSS, HTML and scripts cannot enter the preference payload. A preview, device-only upload and default restore are functional.

Home/apps supports explicit visibility, eligible selection, ordered Move Up/Down, density and default arrangement. Hidden apps remain in App Library. Newly registered apps are not automatically pinned; unavailable apps cannot be added. No acquisitions or installations are fabricated.

Accessibility defaults respect system motion/transparency. Users may reduce effects, choose larger text and icon density. Regional preferences affect the workspace clock and Control Center preview: system/DMY/MDY/ISO date format, system/12/24-hour clock and valid IANA time zones. English is the only language shown. These shell preferences do not rewrite dates or design in customer websites or embedded website previews.

## Scope and persistence contract

| Scope | Storage | Behavior |
| --- | --- | --- |
| Personal account | PostgreSQL `workspace_preferences` | Version 1 theme, preset wallpaper, Home visibility/order, icon density, effects, readability, date/time/time zone |
| Device/account | Account-keyed browser storage | Custom image cache and one-time legacy migration markers; never uploaded |
| Organization context | Account preferred organization ID | Revalidated active membership and active organization on every save; active membership list drives displayed context |

Precedence: verified account preference → explicitly supported device custom image override → operating-system setting → LUCIA default. Only preset identifiers synchronize across devices. Changing a preset clears the device image override; Cancel applies to unsaved account choices, not immediately applied device uploads.

Authenticated GET/PUT `/api/workspace/preferences` returns `{preferences,revision}`. Input is a bounded 8 KiB streamed JSON body and typed Zod schema. Unknown fields are stripped; invalid known values and unknown/duplicate/ineligible Home app IDs are rejected. No credentials or permissions are stored. The schema version is independent of the monotonically increasing revision.

Revision 0 means no saved row. Insert uses conflict-do-nothing; updates match both the verified owner and expected revision and atomically increment it. Conflicts return 409 and require Reload saved settings. There is no silent stale overwrite. Saves are serialized in the client; a failed request leaves applied choices in memory with an error and retry. Save confirmation follows the real successful response. An unavailable database/missing migration yields an honest load failure, with saving disabled. Existing server data is never overwritten by stale browser imports.

Legacy import understands only valid preset and boolean Home visibility, runs only for server revision 0, and marks completion after successful migration (or a valid no-op). Corrupt/unavailable browser storage is handled. Original keys remain intact. Private legacy images migrate to an account-keyed local cache with a separate completion marker, preventing default restore from resurrecting an old image. No unscoped cross-account cache is introduced.

## Organization and identity boundaries

The server membership list supplies organization names/roles. Zero memberships stays a personal workspace with a real website-setup entry; one or multiple memberships work through the same selector. Saving a new preferred context checks the authenticated user's active OS membership and organization status. Revoked selections fall back to an accessible organization for presentation and show a warning in Settings. Selection is a UI preference, never a permission or resource reassignment. Existing website/app records and other open app contexts retain their own organization. The switch prompt reminds users to save work; it does not discard or change another app's drafts.

Organization management links to the existing permission-checked Team & Access route. Phase 8 changes no organization configuration or roles, so there is no new sensitive organization mutation needing an audit record. Existing role-change audit behavior remains intact.

LUCIA Core remains unchanged and owns identity. Settings displays only the session's verified display name and authenticated state; it does not invent email, verification status or credentials. The inspected Core route tree has a staff/developer gateway and no verified general customer profile/MFA/session-management page. Those controls are explicitly unavailable; no guessed Core URL or staff gateway is presented as account management. The existing OS sign-out endpoint is invoked with its actual POST contract.

## Security

Every preference request authenticates through the existing session and derives ownership from that session, never request user IDs. The database primary key is the owner ID with cascading account deletion. Forced owner-only RLS uses transaction-local `app.current_user_id`; no staff bypass is added. Staff/customer navigation and grants are unchanged. PUT requires a matching browser Origin and original Host plus JSON; cross-site Fetch Metadata is denied. Host routing still confines customer domains to published content.

Testing uncovered and corrected two issues: Next's internal request origin differs from the browser's original Host; CSRF comparison now validates the original Host. A `FOR SHARE` membership lock unintentionally required tenant update-policy visibility for a read-only membership check; it was removed. Context preference is not authorization and every actual tenant operation must independently revalidate membership. A membership revoked immediately after preference validation can leave stale presentation metadata; it cannot authorize a subsequent resource operation.

Appearance CSS is imported only by authenticated workspace layout and scoped under a preference boundary. No personal wallpaper/theme selectors target customer published renderers. Orb, Lattice pane scrolling and native adapter/recovery contracts are preserved.

## Database release and recovery

Additive `drizzle/0015_workspace_preferences.sql` creates one table with an owner primary key/FK, revision default/check, bounded JSON size, timestamp, forced RLS and conditional runtime SELECT/INSERT/UPDATE grants. The primary key indexes owner lookups. Journal follows the repository's existing SQL-only migration convention; no generated full-baseline recreation is included.

No production migration was run. Controlled release: review the additive SQL, apply it using the existing trusted migration process against the intended database, verify runtime grants/forced RLS and owner isolation, then release the application. A committed migration does not prove production application. Forward recovery: retain the table/data and deploy the previous app version; do not drop user preferences. Roll back a failed migration transaction before retrying. Any later data removal requires separate review and authorization.

Neon branch creation hit the existing project branch limit. Testing therefore uses a new database named `phase8_settings_acceptance` on existing nonproduction branch `br-twilight-credit-basukg9w`, isolated from its existing database and all production data. Only synthetic users, organizations, sessions and a NOBYPASSRLS test role are used. A Preview-only DATABASE_URL_RUNTIME override is scoped to this exact Git branch; production and development environment variables are unchanged.

## Verification evidence

- TypeScript: passed locally.
- ESLint: passed, only nine pre-existing warnings in unrelated files/shared tab fallback parameters.
- Vitest: 55 files, 407 tests passed, including new preference validation/migration, API ownership/CSRF/conflict/retry and signed-out Settings route coverage.
- Drizzle consistency: passed.
- Production build and middleware-manifest guard: passed.
- Compiled HTTP host-routing matrix: passed, including new signed-out Settings/API and customer-host Settings isolation checks.
- All 16 migrations applied transactionally in the isolated acceptance database (175 SQL statements).
- Real compiled-server requests with a synthetic NOBYPASSRLS role verified anonymous read/write denial, authenticated defaults/save, cross-account/cross-tenant denial, simultaneous update 200/409, invalid app IDs, CSRF denial, membership revocation, database owner isolation, forged-owner RLS denial and additive migration rollback.

Browser/CI/preview evidence will be added for the final commit. Physical tablet verification is deferred. Viewport emulation cannot establish physical touch quality.

## Files changed

Settings server page/client/CSS and route tests; shared account preference provider/boundary and workspace layout; full-size App Library; registry Settings launch and route description; launcher/mobile navigation and scoped appearance integration; Orb Settings link; preference contract/store/API/tests; owner table/schema/migration/journal; safe OAuth Settings return destination; compiled HTTP regression checks and this document/evidence. Existing central registry is extended, not replaced.

## Phase 9 handoff

Lattice already preserves mounted native panes and uses account-keyed session recovery/dirty-close checks. Settings tracks unsaved account changes in the existing tab shell, protects unload and its direct back link, preserves changes while moving categories, and warns before organization context selection. General cross-route dirty-navigation interception, universal draft restoration, account-scoped global tab snapshots, and independent context-safe state adapters across all apps remain Phase 9 work. Do not claim a settings save synchronizes website drafts or that metadata tabs restore every app's in-memory state. Phase 10 still owns physical-device and complete workspace acceptance.
