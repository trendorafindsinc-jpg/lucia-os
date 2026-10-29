# Phase 4 — Mobile workspace redesign

Status: **in progress**. Phase 3 remains on main; Phase 4 work is isolated on `feat/phase-4-mobile-workspace`.

## Scope

1. Mobile header and Blue Glass launcher composition with touch-friendly cards and safe-area handling.
2. A phone-only app switcher that replaces the desktop tab strip without deleting tabs, losing draft snapshots, or bypassing dirty-tab safeguards.
3. Mobile-adapted Assistive Orb, keyboard accessibility and responsive layouts.
4. Automated checks, Vercel preview and authenticated browser acceptance before main merge.

## First implementation slice

The shared workspace shell now renders a mobile-only app switcher on recognized app routes. It displays the current app and previously opened workspace tabs; switching uses the existing safe-route navigation. The desktop tab bar remains unchanged above 680px. CSS provides touch targets, a scrollable app menu and safe-area padding.

## Pending verification

Lint, TypeScript, unit tests, production build and authenticated browser interaction have **not yet been verified** for this branch. Do not merge until these gates pass. The switcher does not claim to create split-screen or new AI capabilities.
