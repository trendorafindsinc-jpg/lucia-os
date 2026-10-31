# Phase 15 — Accurate Layout previews and selection

## First implementation slice

Status: **IN PROGRESS**, started from Phase 14 merge `5e584f35bff424e4163eb3f53a6c70070b012b01`. This follows the canonical roadmap; the earlier Phase 15 forms document is a historical prototype, not this phase's authority.

Phase 14's verified engineering was merged through PR #136 on the founder's explicit instruction to ship and begin Phase 15. Vercel production is READY for that merge. Professional visual acceptance, further refinement of the forty candidates, physical-device review and real external OAuth remain outstanding founder review; this is not a claim of 48 independently accepted premium designs. The existing inventory and evidence retain those distinctions.

## Implemented behavior

- Layout catalogue links all 48 canonical IDs to actual, authenticated, multi-page previews. The collection is explicitly labelled as undergoing visual review. Existing 37 legacy starters remain available and separately labelled.
- `/templates/preview/[id]/[[...path]]` validates the canonical ID and exact registered page, then requires the real LUCIA OS session. Unknown designs and pages fail closed. No arbitrary URLs, modules or customer data are loaded.
- Preview uses the existing production `LayoutRenderer`, validated candidate factory, tokens and built-in assets. Native navigation, page selector, browser history and deep links address actual registered pages. Demonstration content is clearly labelled and nothing is published by viewing it.
- “Create this website” carries the exact selected canonical ID into existing setup, including the safe LUCIA ID return route. Account-scoped recovery remains intact.
- The existing authenticated, tenant-authorized onboarding transaction now writes the selected v2 definition directly to the real project's root draft, plus its registered page paths. Legacy selections retain v1 initialization. There is no second creation service, renderer or definition registry.
- Standard creation and publication remain free. The existing demonstration-contact guard, revision checks and publication mechanism are preserved; previewing a design does not waive publication validation.

## Architecture and security

`starting-layouts.ts` adapts display metadata from the existing canonical definition factory and legacy catalogue. It does not define new design identities. Website setup accepts only registered IDs and bounded names. Database writes remain behind existing membership, account-change, CSRF/origin and transaction safeguards. Preview paths accept only exact registered internal routes, and customer-host middleware continues to reject workspace/preview exposure.

No schema changes, migrations, credentials, payment integrations or production customer writes are introduced.

## Verification

Recorded after the first-slice implementation: unit/route validation covers all 48 exact initial definitions, legacy metadata preservation, unknown and unsafe IDs, invalid names, authenticated preview routing, exact interior-page selection, durable transaction page values, organization scope and sign-in return-route retention. Local results: **719 tests across 70 files passed**, TypeScript passed, ESLint passed with the same three existing warnings, Drizzle consistency passed, and the production build plus compiled host-routing checks passed during this slice. The PR CI verifies the final committed source.

New browser acceptance of the catalogue-to-creation UI is **not yet completed**. Phase 14's full isolated publishing results are historical evidence for the shared engine, not proof that this new UI slice passed acceptance. Phase 15 is therefore not marked complete.

## Next acceptance work

Exercise the authenticated catalogue → interior-page preview → create → Studio → save → publish journey; verify 320/390/768/1180/1440 widths, keyboard focus, Back/Forward and refresh. Inspect initial v2 drafts in the existing isolated database suite. Improve discovery without substituting schematic legacy cards for actual previews. Complete per-design professional visual review separately, and retain clear candidate versus accepted status.

## Follow-up engineering corrections (31 October 2026)

- Corrected candidate discovery and filtering so descriptions, industries and Layout IDs can be searched, with a live count and empty-result feedback. Kept legacy starters, and explicitly labelled designs that remain under visual review.
- Added a labelled preview page selector and keyboard focus restoration on real page changes; preserved the existing production renderer and safe return to the Layout Library.
- After a successful server-side website creation, setup now directly opens the persisted editor at /editor?websiteId=<id>. No client-only projects or bypass of the authorized creation transaction.
- Added all-48 homepage route cases to the existing preview test; these require CI execution and do not establish browser acceptance.

**Remaining gates:** Authenticated end-to-end browser journeys, five responsive viewports, two-account real HTTP tenant isolation, external OAuth (where available), accessibility evidence, final-head CI/Vercel and production smoke tests. No fabricated screenshots, real OAuth claims or customer data writes. Phase 15 remains **INCOMPLETE** pending these checks. Global X-Frame-Options: DENY remains intact; no decorative device emulation has been introduced.

- Updated the pre-existing isolated browser acceptance runner's two creation journeys to assert the new direct editor handoff instead of clicking the former post-save link. This prevents an old test expectation from misreporting the Phase 15 navigation behavior. Execution of those browser cases remains a separate release gate.
