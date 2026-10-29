# Phase 5 — Desktop workspace implementation

2026-10-29. Status: **IN PROGRESS / browser acceptance open**. Authority: current 30-phase roadmap, workspace architecture contract and approved Blue Glass design system. Earlier phase-5 roles/version documents belong to a superseded sequence.

## Baseline and scope
Main baseline: 390d886 (customer-host routing fix #116). Existing shell had navigable app tabs, mobile app switching and editor recovery snapshots, but no split-view host or native pane navigation. Phase 5 adds desktop composition and eligible app workspaces; Phase 6 tablet composition, Phase 7 general registry and Phase 8 full settings remain separate.

## Implemented
- Desktop launcher entry and navy/Blue Glass desktop workspace at `/workspace/desktop`, with a server-side session gate and server-derived account identity.
- Two native app panes: Layout Studio and Layouts. No iframes, arbitrary-page embedding or relaxed frame protections. Other destinations use their normal full-screen routes and server/API permission checks.
- Split at desktop widths of at least 1280px with a fine pointer/hover capability; narrower and touch-only views retain one visible app at a time. Hidden panes stay mounted so switching/focusing or resizing does not reset them.
- Closed/replaced pane adapters ignore late asynchronous state updates so a completed request from an old app cannot alter the next app in that slot.
- Independent pane search/navigation context and state adapters. Editor draft snapshots and Layouts filters are separate per pane; cached desktop recovery is versioned and accepted only for the server-authenticated account. Recovery is browser-session storage, not cross-device persistence. Saving still uses existing tenant-authorized APIs; publishing remains separate.
- Focus/single-app mode, split mode, swap sides, keyboard focus (Alt+Shift+Left/Right), accessible balance slider, close/reopen actions and unsaved-change confirmation. Duplicate contexts cannot be opened concurrently across panes. Explicit app launches take priority over clean cached panes without replacing unsaved work.
- Existing desktop tab strip gains arrow/Home/End navigation, selected-tab focus handling and a linked app panel. The preferred tab limit evicts clean tabs only, retaining all unsaved tabs. Closing the Desktop tab discards its recovery snapshot only after the existing dirty-tab confirmation.
- Fix editor context reset: a new preview cannot retain the previous saved website ID/loading flags. Per-context pending requests keep their existing cancellation checks.
- Private preview section IDs and anchor links are namespaced per editor/proposal, preventing cross-pane anchor collisions; published renderer defaults stay unchanged. Preview roots avoid additional main landmarks.
- Standalone editor receives a Suspense boundary for search-based navigation. Native embedded app roots avoid nested main landmarks and editor heading IDs are unique.

## Changed areas
`src/app/workspace/desktop/*`, desktop workspace/navigation components and CSS, native editor/gallery adapters, tab shell/helpers, desktop launcher/styles, scoped theme additions, desktop helper/server-entry tests, and the compiled HTTP routing test. No runtime dependency added.

## Local verification
- TypeScript passed.
- Unit suite: 46 files / 321 tests passed (including unsafe destinations, duplicate contexts, account/version recovery, dirty-tab retention, launch priority, and signed-out server-entry denial).
- Lint passed with pre-existing warnings; no new hook warnings remain.
- Production build passed; existing customer-host middleware manifest guard passed.
- Compiled production-server HTTP matrix passed, including signed-out desktop denial and tenant-host desktop isolation.
- Drizzle consistency passed. No schema or migration changes.
- CI and preview evidence must be read from the exact PR head; local checks do not substitute for browser acceptance.

## Open acceptance gates and limits
- Actual signed-in desktop screenshots and interaction testing at 1280/1440px and a narrow window, including filters, swap/focus/resize, close/reopen, keyboard, unsaved prompt cancellation, route return and reload recovery.
- Two independently authorized saved websites: load/edit/save each, permission revocation and cross-tenant failure cases through real HTTP. Existing API tests remain; no new server authorization bypass is introduced, but this multi-pane flow is not yet evidenced end-to-end.
- Storage failure remains an in-memory recovery fallback. A successful website save must come from its existing API response; users are told to save permanently rather than rely on browser recovery.
- Native pane support is limited to the two declared adapters. Guided setup, AI, team, billing, publishing and other apps open full-screen. Entering desktop from a dirty standalone editor requires saving first; unsaved standalone drafts are not silently copied into a different workspace.
- No complete Phase 5 acceptance, production rollout or Phase 6 start is claimed.

## Safety / incident #112
The customer-domain incident was fixed on baseline #116 and closed after live verification. Its middleware/build guard and HTTP matrix remain intact. This phase changes no DNS, secret, Core authentication, production data, database policy or published website rendering behavior. Draft PR only; no main merge or production promotion in this implementation step.
