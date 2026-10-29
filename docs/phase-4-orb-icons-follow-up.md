# Phase 4 — SVG icons and movable Orb

2026-10-29. Follow-up to main merge #114, requested during mobile testing.

- Replace App Library, dock and Home-stat text glyphs with one shared inline SVG icon renderer. The existing first-party app silhouettes remain consistent across launcher and library; unavailable apps retain their actual artwork and unavailable state.
- Phone Home centers the real Orb in the third dock position after Home and Apps. Other launcher screens and existing app workspaces use the floating Orb. The placeholder slot has no extra fake icon.
- Add a luminous blue/cyan core, rotating orbital rings and a slow glow pulse. Reduced motion disables animation; forced colors retains a usable control.
- Away from phone Home, pointer/touch drag snaps to the nearest edge. Vertical position is bounded away from header and bottom controls. Arrow keys provide a non-drag alternative. Session-local position survives app navigation; invalid stored placement falls back safely. This is a presentation preference, never authorization.
- A drag does not open the assistant. Tap/keyboard activation still opens the same loomifyAI entry. Pointer cancellation restores the prior snapped placement. No second AI, microphone use, or automatic action is introduced.

## Verification
Local checks: lint (existing warnings only), TypeScript, complete unit suite, Drizzle consistency and Next.js production build passed. New tests exercise SVG coverage/distinct artwork and edge placement, offscreen inputs, invalid storage and restoration. Launcher SSR acceptance still checks one Orb and a valid accessible panel target.

Actual phone touch, reduced-motion, screenshot and authenticated end-to-end acceptance remain open. Connected Chrome could not reach this execution environment's localhost; the temporary visual fixture was removed and was not committed. CI and Vercel preview status must be inspected for the final PR head. Build/test success does not establish visual acceptance.

Issue #112 reviewed and remains deferred: no changes to DNS, middleware, public publishing, production data or LUCIA Core.
