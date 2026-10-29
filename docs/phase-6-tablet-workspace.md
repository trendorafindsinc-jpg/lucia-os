# Phase 6 — Adaptive tablet workspace

**Status: READY FOR VERIFICATION — not accepted.** Base: `main`; branch: `phase-6/tablet-workspace`. Scope intentionally excludes Phase 7 registry redesign and LUCIA Core.

## Architecture audit
The canonical product vision and 30-phase roadmap govern this implementation. The existing `WorkspaceLauncher` uses `WORKSPACE_APPS`, native LUCIA icons and server-verified website/organisation counts. `/workspace/desktop` is the existing Lattice entry, authenticated server-side using `getCurrentUser`. Its two embedded native adapters are `VisualSiteEditor` and `TemplateGallery`; arbitrary URLs and external iframes are not eligible. Pane state and snapshots live in the existing `DesktopState` and `WorkspaceContext` contracts. PRs #119/#120/#121 modified Lattice scrollports, touch-action, wheel and keyboard handling; those implementations remain in place.

## Implementation decisions
- 681–1279px gets a tablet-specific Blue Glass launcher composition, reduced hero height, flexible 3/4-column original app grid and touch-sized Lattice controls.
- Layout uses CSS media queries and actual viewport width, **not user agents** or pointer identity. Fine pointers, trackpads and hybrid touch laptops use the same rules. Safe-area bottom inset is respected.
- Split eligibility requires two native panes and at least **1100px of viewport width**. The smaller pane remains roughly 440px or wider after shell padding, gap and 45/55 ratio limit. At 1024px or less the shell uses Focus while retaining the selected Split preference and both mounted panes. On rotating back to 1180px, Split resumes without remounting app adapters.
- Pane balance is an accessible, touch-draggable range control with 5% steps from 45% to 55%, supporting keyboard Arrow/Home/End semantics natively.
- The prior bounded scrollports and `touch-action: pan-y` remain active; no global wheel handler, forced horizontal scroll, or new scroll library was added.
- Home, Orb entry, app switching, close/reopen prompts, and session-scoped draft recovery continue to use existing components/contracts. No invented installed apps.

## Files modified
- `src/components/workspace/desktop-workspace.tsx` — viewport split eligibility, constrained pane balance and user-facing focus fallback.
- `src/components/workspace/desktop-workspace.module.css` — dedicated tablet pane/control layout.
- `src/app/workspace/workspace-launcher.module.css` — dedicated responsive tablet launcher.
- `src/lib/workspace/tablet.ts` — pure UI capability predicate.
- `src/lib/workspace/tablet.test.ts` — portrait/landscape/boundary/fallback unit cases.
- This document.

## State and security
Existing open pane adapters stay mounted across Focus/Split transitions. Unsaved changes continue to trigger existing close/replace confirmation; snapshots remain browser-session scoped, not cloud/cross-device durable. Cached contexts remain untrusted inputs. Every server API and route still authenticates and authorizes individually. Neither tenant checks, staff navigation, publishing paths, CSP, iframe policy, database, LUCIA Core, secrets nor DNS were changed.

## Verification evidence and limitations
**Not yet locally executed in this connector-only engineering pass:** `npm run typecheck`, `npm run lint`, `npm test -- --run`, `npm run build`, `npm run db:check`, `npm run test:routing:http`. CI/preview checks need to be inspected on the exact PR head. Added Vitest unit cases are not a substitute for real browser testing.

**Browser acceptance outstanding:** actual authenticated screenshots and interaction at 390×844, 768×1024, 820×1180, 1024×768, 1180×820, 1280×800 and 1440×900; touch/wheel/trackpad, active app focus, independent pane scroll, divider drag, keyboard inputs, dirty drafts on orientation change/refresh, Orb safe bounds, no horizontal overflow, login and denied/cross-tenant routes. Viewport emulation cannot prove hardware touch performance.

## Acceptance criteria
Require green typecheck, lint, full unit/integration/build/security checks; authenticated browser acceptance with evidence at every target viewport; real cross-tenant denial and permission revocation; verified Vercel preview; explicit product-owner acceptance before merge. Current status is **READY FOR VERIFICATION**, not VERIFIED or ACCEPTED.

## Follow-ups (not implemented)
- **Phase 7:** reconcile `WORKSPACE_APPS` and `LATTICE_APPS` into the canonical registry with stable app keys, availability/entitlement metadata, original icons, and declared split/recovery capabilities.
- **Phase 8:** persist user-selected wallpaper, icon arrangement and workspace settings under an explicit authenticated preference contract.
- **Phase 9:** extend cross-route draft preservation/deep-link semantics beyond the current two native adapters.
- **Phase 10:** full mobile/tablet/desktop authenticated interaction and accessibility acceptance gate.
