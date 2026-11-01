# Phase 14 Upgrade — Website-First Studio Implementation and Acceptance Audit

**Baseline:** main at e462ac0ee3d5fa966e81d8d61c34fc7735a71f14 (1 November 2026)
**Implementation:** upgrade/phase-14-website-first-studio
**Authority:** docs/phase-14-16-studio-upgrade-programme.md and docs/upgrades/phase-14-website-first-studio.md on documentation PR #142.
**Status:** Implementation PR for founder review. NOT a completed/released Phase 14. No production migration, credential rotation or merge authorized.

## Customer journey — before and after

| Task | Previous baseline | Upgrade |
| --- | --- | --- |
| Enter Studio | /workspace/websites with sidebar, metrics, plan/team/publishing actions | Same deep link displays authorized saved-site cards and Create New Website |
| Resume existing | Select from numerous actions and land in a tab-heavy editor | Select Edit Website and see the real v2 LayoutRenderer as the editing canvas |
| Create new | /create had three setup pages including organisation, region, custom slug and starting template | One responsive screen, 3 required prompts and 2 optional prompts; server derives slug and organization |
| Choose Layout | /templates gallery to /create, no business suitability rank | Top three deterministic matches; all 48 discoverable; read-only thumbnails served by the same renderer with full-page preview links |
| Edit words | Multi-panel business/content/design fields before page preview | Tap visible heading/body/intro/contact for contextual text change on actual rendered page; preserve detailed-controls deep link |
| Replace images | Existing controlled artwork picker and media library within separate form panels | Tap eligible section image, choose built-in/owned asset and alt text; preserve authorized media library |
| Move/add | Previously form-driven limited reorder/advanced insert | Visible section handles, drag/drop and Move Up/Down; contextual Add Section via existing validated registry |
| Save & recover | Revision-checked explicit draft-save flow | Debounced server-confirmed autosave, local recovery, offline/conflict/failure status; undo/redo with inverse edits; manual Save now |
| Preview/Publish | Separate /publish path | Draft-only Preview inside site editor, Publish handoff to existing authorized /publish flow; no new delivery architecture |

## Implementation architecture

- Existing LUCIA ID session remains the sole identity authority; website picker reads only active accessible organization memberships and continues to rely on RLS-scoped transactions.
- Existing onboarding API accepts an additive website-first payload while preserving legacy payloads. Slug derivation is account-bound and deterministic; existing server advisory lock and project reuse remain.
- Original 48 canonical lucia.layout.* IDs and metadata continue to determine design, previews, draft composition, page routes, and server validation.
- Existing LayoutRenderer is used for both editor canvas and real catalog thumbnails; no alternate website renderer introduced.
- Existing PATCH /api/websites/:id/draft enforces ownership, permissions, revision/If-Match and validation. New frontend sends the same composition edits and honors acknowledgement before saying Saved.
- Previously supported classic detailed controls remain available for existing sites and legacy Layout flows; no destructive conversion.
- Publishing routes, live revision pointers, domains and IDrive storage provider are unchanged. Blog, News and Advanced Code Mode are future phases, not falsely functional buttons.

## Tests and evidence

Development sandbox: Vercel isolated Node 22 environment using checked-out exact Git head, not production.
- TypeScript: npm run typecheck passed on the tested implementation.
- Targeted lint: selected new/modified modules pass --quiet.
- Full unit suite before newest catalogue additions: 79 files / 902 tests passed.
- Full catalogue focused: 97 tests for canonical identities/category distribution, homepage/interior rendered structure and validated edits across all 48 passed. Additional tests validate required/optional onboarding and route-entry compatibility.
- Production local Next build passed on the earlier implementation head after typed-route corrections. Re-run exact-head build after final changes.
- CI/Vercel exact PR head: not yet confirmed at the point of authoring; capture separately on PR.

**Structural tests are not visual design acceptance**; server-rendered pages and syntactically valid edits do not prove an excellent user-facing result. Historic candidate descriptions remain accurate until independently approved.

## Outstanding mandatory acceptance gates

1. Five first-time participants performing real timed creation and publication; measure success, time, assistance, confusion, page transitions.
2. Authenticated browser acceptance at 320, 390, 768, 1180, 1440 px and on genuine mobile/touch/keyboard for picking, editing, undo, offline interruption and recovery.
3. Real newly created websites and existing previously published websites on isolated test organization data; verify ownership and cross-tenant denial in running application and production-like DB.
4. Real publish with correct public host/domain, draft preview isolation, last-live preservation on failed publish and domain routing regressions.
5. Independently verified historical v2 composition restore after image references change, including retained media. Prior Phase 16 storage report flags this as an unresolved live gate.
6. Customer-owned IDrive media upload and bucket-restricted credential denial remain contingent on previously approved live storage acceptance; do not bypass.
7. 48 independent visual/design, functionality and interior-page reviews with mobile screenshots, accessibility checks and no unlicensed assets.
8. Exact-head CI and Vercel preview checks and real browser proof before declaring ready.

## Known limitations in this incremental implementation

- The picker offers an explicitly labelled fallback panel rather than a real screenshot for draft sites that lack thumbnails; this needs authentic site-card preview capture.
- Inline click-to-edit handles primary heading, paragraph, intro and eligible images. Nested project cards and service-item text remain editable using the preserved detailed-settings interface. Additional direct granular editing requires UI acceptance.
- Drag handles live in an optional section tool rail rather than directly overlaying each rendered section; Move Up/Down is provided.
- The existing /publish route is the authoritative handoff rather than an inline publish drawer.
- Older v1 sites still open the legacy editor to avoid destructive conversion.
- Visual Mode’s support for user-supplied code is intentionally unavailable pending Phase 16.
- Current identity and Layout structure are not a substitute for actual final 48-Layout art direction and real published-site acceptance.

## Release rule

**Do not merge without explicit founder approval. Do not declare Phase 14 Upgrade DONE while mandatory checks remain unverified.**
