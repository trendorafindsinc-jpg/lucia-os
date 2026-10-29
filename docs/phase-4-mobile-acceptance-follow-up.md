# Phase 4 mobile acceptance follow-up — 2026-10-29

Status: **IN PROGRESS**, PR #114. This supersedes conflicting implementation details in the earlier mobile handoff; it does not declare Phase 4 accepted.

## Changes
- Full-viewport App Library; freeze and restore the underlying page scroll position on phones, make the Home content inert while a library/settings screen is open, and release the lock when resizing above the phone breakpoint or leaving the launcher.
- Restore the actual shared Assistive Orb in the center dock position. The launcher and recognized app workspaces use the same component and loomifyAI destination. No second AI service, microphone permission, or automatic action is added.
- Make the Home Apps statistic open the App Library instead of pointing at the hidden Home app list.
- App Library → Settings → Display / Wallpaper. Available apps stay in the library by default; users can explicitly enable Show apps on Home. Preferences remain account-keyed and device-local; cross-device synchronization is not implemented.
- Validate uploaded image decoding in addition to MIME/size checks; surface read/storage failures without claiming a successful save.
- Focus the opened mobile screen and support Escape. The Orb is a non-modal expandable region; it does not claim modal focus trapping.

## Files
MobileExperience and styles, WorkspaceLauncher and styles, OpenAppLibraryButton, shared AssistiveOrb and styles, WorkspaceTabShell, launcher acceptance tests, and this evidence note.

## Verification and boundaries
- Baseline commit be41ec5: GitHub Quality run 701 passed; Vercel preview was ready. That evidence does not validate the new commits.
- Existing launcher SSR assertions updated to verify one shared Orb, truthful availability text, and the replacement App Library button rather than the old hidden anchor. Existing keyboard/safe-area tests retained.
- New lint, typecheck, unit-test, migration consistency, and production-build results must come from the final PR commit's Quality run.
- Connected Chrome preview navigation to /workspace returned the real LUCIA ID sign-in view. No authenticated mobile interaction or visual acceptance is claimed. Sign-in is required to complete those checks.
- Actual mobile acceptance still needs 320/390px checks: Apps and Home navigation, background scroll/focus isolation, Settings/back navigation, preference reload/account separation, invalid upload/storage-failure recovery, center Orb and per-app Orb, and safe-area/keyboard/reduced-motion behavior.
- Local clone/build could not run because the execution environment could not reach GitHub; connected GitHub API was used for source review and commits. CI is the build/test authority for this update.
- Issue #112 reviewed: customer-subdomain/publication incident remains open and deferred. This update does not change middleware, DNS, publication queries, production data, or LUCIA Core.
- No main merge or production promotion performed by this update. Keep PR draft until required verification is complete.
