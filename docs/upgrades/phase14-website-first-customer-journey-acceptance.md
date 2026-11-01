# Phase 14 Website-First Customer Journey — Isolated Browser Acceptance

**Date:** 1 November 2026  
**Repository:** trendorafindsinc-jpg/lucia-os  
**Development PR:** #143, \`upgrade/phase-14-website-first-studio\`  
**Status:** **Partial PASS — local compiled application and synthetic-session acceptance. Founder release approval withheld.**  
**Baseline tested:** \`8b7f7d635e3c4bbb56426a26868fc60ab013adbd\` with the small, independently tested 320px CSS fix and acceptance-script corrections in this PR. Exact-head CI of the final commit is a separate check.

## Real environment

- Isolated Vercel Sandbox, 2 vCPU / 4 GB; actual public GitHub source cloned at specified PR head.
- PostgreSQL **18.6** on a newly created **\`lucia_phase14_journey_acceptance\`** disposable database, fully migrated with the project's Drizzle migration runner. No production DB was attached.
- Application runtime uses a separate \`lucia_os_runtime\` role, **rolsuper=false, rolbypassrls=false**; schema privileges are granted but authorization/RLS is not bypassed.
- Browser: **Chromium 141 / Playwright 1.56.1**, genuine browser DOM/HTTP, compiled Next.js 15 application started by the existing \`scripts/check-website-foundation-http.mjs\` harness.
- Synthetic user A, user B, organization A/B, hashed HttpOnly app-session credentials and disposable owned websites. These are real local app sessions, **not live LUCIA Core OAuth**.
- Public host simulation uses real HTTP requests to the compiled app with the synthetic \`<slug>.lucia.name.ng\` Host header, not externally verified DNS/TLS.
- Each run verifies authorized server-side database persistence and deletes only its isolated synthetic websites and fixtures. The database was explicitly reset once after a test-only cleanup failure caused by an unregistered creation ID; the acceptance script was corrected so future cleanup registers the ID before later assertions.

## Actual acceptance evidence

### Existing publish and tenancy contract
\`WEBSITE_TEST_PHASE14=1 WEBSITE_TEST_PHASE14_LAYOUTS=meridian WEBSITE_TEST_PREMIUM_FAST=1 WEBSITE_TEST_PREMIUM_ONLY=1\`

**PASS:** 1 HTTP check, 2 browser checks. Meridian creates, assigns, edits, reloads, previews, publishes and renders on all relevant real compiled virtual-host paths. Customer B cannot read/edit/publish Customer A's draft; stale or corrupt publishing preserves the last-known-good published page; member revocation denies editing and publishing. An outdated browser-test selector for the retired business-identity dashboard was corrected to target the real website-first editor.

### New customer UI journey
\`WEBSITE_TEST_PHASE14_WEBSITE_FIRST=1 WEBSITE_TEST_PREMIUM_FAST=1 WEBSITE_TEST_PREMIUM_ONLY=1\`

**PASS:** **1 HTTP check, 9 browser checks**, including:
1. Real customer website picker: two A websites visible, B's foreign website hidden; verified B's separate site view.
2. Three mandatory questions/two optional inputs; barbershop category recommendations; optional access to all **48** canonical Layout choices (availability, not visual certification).
3. Actual persisted Meridian project creation via rendered form; direct navigation to website-first editor; customer B and anonymous reads of A's draft denied.
4. On-page hero text editing, Undo, Redo, server-confirmed autosave, page reload and actual persisted content equivalence.
5. Registered section insertion, actual durable composition, and no material document horizontal overflow at **320/390/768/1180/1440px**.
6. In-context contact email replacement, server-confirmed saved data, and the correct draft preview.
7. The new **in-Studio Publish dialog** exercising the existing authenticated publish endpoint; the published result verified at the correct synthetic customer hostname with the edited text.
8. No unhandled Chromium page errors.
9. Existing application harness additionally confirmed no unhandled application errors.

**Confirmed defect and correction:** At width 320px, section reorder controls enlarged the document to **335px**. Browser DOM diagnostics attributed this to \`.website-first-editor-sections\` children. The responsive row styles were adjusted to constrain flex-item widths without removing touch/keyboard controls. The CSS was compiled anew, and the entire new customer journey was rerun with the strict overflow assertion enabled; **all 9 browser checks passed**.

**Test script:** \`scripts/phase14-website-first-journey.mjs\`. Invoked from \`scripts/check-website-foundation-http.mjs\` when \`WEBSITE_TEST_PHASE14_WEBSITE_FIRST=1\`. Browser evidence is generated under local \`artifacts/phase14-journey/\` (including a 390px real screenshot and optional JSON); this path is ephemeral sandbox output, **not an uploaded GitHub artifact or public screenshot URL**.

## How to reproduce in an isolated environment

Prepare an isolated \`*_acceptance\` PostgreSQL DB with all migrations, synthetic fixtures and a **non-superuser, NOBYPASSRLS** role. Install Playwright and Chromium, build the app and run:

\`\`\`sh
WEBSITE_TEST_ADMIN_URL='<isolated admin DB URL ending _acceptance>' \
WEBSITE_TEST_RUNTIME_URL='<isolated non-BYPASSRLS runtime URL for same DB>' \
WEBSITE_TEST_PLAYWRIGHT_MODULE=playwright \
WEBSITE_TEST_CHROMIUM='<absolute Chromium executable>' \
WEBSITE_TEST_PREMIUM_FAST=1 \
WEBSITE_TEST_PREMIUM_ONLY=1 \
WEBSITE_TEST_PHASE14_WEBSITE_FIRST=1 \
WEBSITE_TEST_EVIDENCE_FILE=artifacts/phase14-journey/website-first.json \
node scripts/check-website-foundation-http.mjs
\`\`\`

Do not apply this acceptance harness to production DBs. No actual customer accounts or published production websites are modified.

## Still blocked before final founder approval

1. **Real LUCIA Core OAuth** user session, production-like customer domain/DNS/TLS and live end-to-end publishing: synthetic cookie and Host routing are not proof of these.
2. **Historical persisted v2 rollback including real IDrive media**; bucket-restriction proofs and real object lifecycle remain Phase 16 live provider acceptance work. Published-page preservation on failed builds was checked, but is not full version restoration.
3. **All 48 premium Layouts individually**: structural and choice availability are covered by automated tests; art direction, completeness, media, multi-viewport human visual review, accessibility and fully interactive customer journeys for each Layout still require genuine evidence.
4. **Accessibility** of entire new Studio including keyboard and assistive technology is not fully certified; five width tests and buttons are not a substitute for WCAG audit.
5. **Five independent first-time human usability sessions** and approximately-five-minute completion benchmark have **not been conducted**. An automated browser is not a human usability participant.
6. Additional nonblocking scope: live production-authenticated thumbnail experience, real customer media upload and full low-bandwidth/offline recovery require independent checks. Cloudflare Workers check is separate from Vercel and has previously failed; do not label every external status green.

**Release instruction:** Keep PR #143 draft/unmerged and Phase 14 Upgrade **NOT FINALLY APPROVED** until the real outstanding gates are supported by evidence. Record any further tests against their exact commit and environment.
