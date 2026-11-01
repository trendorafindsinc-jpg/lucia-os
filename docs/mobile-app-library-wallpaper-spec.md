# Mobile workspace refinement — implementation contract

Approved 2026-10-29 after Phase 4 merge.

## Required experience
1. The fixed mobile dock contains exactly five deliberate positions: **Home · Apps · Orb · Activity · More**. The Orb is the centered circular assistant affordance, not a blank slot. No dead buttons: if Activity or Orb is not functional, give a truthful accessible explanation or limited working panel rather than silently doing nothing.
2. **Apps** opens a distinct App Library view. Show a dense, responsive icon grid with only each app icon and short name below it; no large description cards. Source entries from the existing workspace app registry and respect entitlements/availability. Keep a path back Home and preserve per-app tabs/state.
3. Provide an atmospheric **Aurora Glass** default wallpaper behind Home and App Library, without degrading contrast, performance or safe-area readability.
4. **Settings → Appearance → Wallpaper** lets each signed-in user preview and select built-in wallpapers (Aurora, Ocean, Midnight, Sunset), upload a personal wallpaper with safe type/size handling, reset to default, and optionally adjust glass intensity. Persist preferences in LUCIA OS (not LUCIA Core), per-user, without leaking across tenants/users or requiring privileged identity changes. Respect reduced motion.
5. Phone-first changes must not break tablet/desktop workspace, existing routes, authentication or tenant isolation.

## Acceptance tests
- Apps tap changes to a separate icon-only grid; supports long app lists and small iPhones.
- Home / Apps / Orb / Activity / More all have visible positions and predictable actions; center Orb never disappears.
- Wallpaper preview/apply/reset persists after reload and re-authentication, and is isolated between accounts; invalid upload rejected.
- Contrast, touch targets, VoiceOver labels, scrolling and bottom safe area checked on mobile.
- Lint, typecheck, tests, production build and authenticated browser QA before merge.

## Deferred incident
Review [#112](https://github.com/trendorafindsinc-jpg/lucia-os/issues/112) in each subsequent phase; this refinement does not change DNS, middleware or public publishing.
