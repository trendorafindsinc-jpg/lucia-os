# Phase 13 — Premium Hybrid Layout Composition Engine

**Implementation and local acceptance: PASS. Release requires successful Quality and Vercel checks on the exact final PR head before merge.**

Continues PR [#133](https://github.com/trendorafindsinc-jpg/lucia-os/pull/133), preserving the schema foundation and renderer increment through `74810a6c2eb9879e0baa3f500d6df1bd6af5236c`. Original baseline is `35ed2d87ac39affcbb62d39cfd75aa6fdca23de6`; reconciled main `8a2e547f2d1c96c95b1eb40347bf5b5e1cb181b3` adds the approved Phase 14 scope and roadmap, without runtime changes. This phase does not implement the approved 48 finished websites or change their catalogue.

## Audit and implemented integration

The inherited branch defined v2 schemas, edit guards, three test fixtures and seven renderer presentations. Real draft APIs and publication accepted only legacy `SiteDraft`; public rendering parsed only legacy snapshots; images were placeholders. The existing Phase 11 transaction, Phase 9 recovery, website identity, tenant authorization and hostname middleware remain authoritative.

| Boundary | Implementation |
| --- | --- |
| Definition | `website-definition.ts` validates versioned data, selects the existing Blueprint adapter for legacy drafts, and passes v2 compositions unchanged to `LayoutRenderer`. Unsupported version markers cannot fall back to legacy parsing. |
| Draft | Existing `GET/PATCH /api/websites/:id/draft`, organization-scoped home row, real database persistence and revision ETag. New explicit assignment/edit commands are applied to the freshly locked saved definition. |
| Preview | Existing Studio and Publishing preview use the same validated renderer. Page selection and internal navigation stay within the private preview. Publishing preview loads the confirmed server draft. |
| Publication | Existing transaction validates the whole saved definition, compares `If-Match`, synchronizes each registered public page and activates the existing hostname. Obsolete paths become private on successful commit. Exceptions roll back all page/hostname changes. |
| Public pages | Existing `/site/[slug]/[[...path]]` and custom-domain `PublicWebsite` select the authorized published website/page and render the exact requested page. Unknown paths remain 404. Page title and description use Next `generateMetadata` and the same request-cached published-page resolver as rendering; customer titles override the workspace metadata. |
| Legacy | Existing v1 SiteDraft records, layout IDs, ownership, URLs and adapter remain unchanged. No automatic conversion or migration. |

## Closed section registry and presentation

The seven strict section schemas map to explicit React cases in the existing `LayoutRenderer`: premium hero (offset/full-bleed/typographic), trust strip, editorial story, project gallery, service journey, experience and contact panel. No module name, executable component, raw HTML or arbitrary CSS can be supplied. Unknown or invalid definitions fail validation rather than rendering invented content.

Tokens are six-digit role colors and closed typography, scale, width, radius, rhythm and motion choices. Styles and custom properties are scoped under the rendered `.premium-layout` root; section grids use minimum-zero tracks, mobile stacking and wrapping. Gallery rail scrolling is intentional within its section. There is no global horizontal-overflow concealment. Reduced-motion styles disable animation/transition effects; this phase adds no decorative animation library.

All image references resolve through a closed manifest in `premium-assets.ts`. Three original repository-owned geometric SVG illustrations are imported as build assets under `/_next/static/media`, which existing customer-host routing permits. Mandatory alt text, intrinsic dimensions and responsive sizing are applied with Next Image. Unknown built-in references and arbitrary remote/private asset URLs are rejected. These illustrations are structural demo assets, not the licensed photographic art direction required for Phase 14. No S3 configuration or successful-upload claim is introduced.

## Server-enforced customization

Draft mutation commands are strict and bounded (300,000-character request limit; at most 40 validated edits). Assignment accepts only the three server-registered demonstrations and is explicitly confirmed in Studio. It preserves the project name and does not affect the published version. Replacing an existing v2 composition or downgrading it through a legacy draft payload is rejected.

`composition-edit` takes a mode and edit commands, never client-supplied permissions. Policy is read from the saved definition inside the existing row-lock/revision transaction:

- Guided content edits require the relevant text, image, link or contact capability. Text permission does not confer image/link access. Optional Guided variant capability is explicit and still obeys locks.
- Advanced variants, tokens, section ordering and page responsiveness require their own capabilities. Registered section insertion/removal and page insertion/removal require `section-structure` or `pages`. New content passes the same schemas and route relationships.
- Locked sections retain their identity, variant and position; they cannot be removed. A page containing a locked section cannot be removed. Locked token keys cannot be changed. Editable content remains editable under Design Lock.
- The homepage cannot be removed. New paths must be unique, normalized, nonreserved and registered. Navigation and hero actions must resolve; removing a referenced destination without repairing its relationship fails validation.

The existing Studio entry now selects the legacy editor or a bounded composition-controls panel. It supports real content editing, page selection, ordering, Advanced accent/responsive settings, live unsaved preview and real Save draft. It uses the Phase 9 adapter for dirty protection, discard, save-and-continue and account-scoped tab recovery. Failed saves retain edits and permit retry; conflicts require explicit reload. Recovery is session-local and does not claim database persistence or cross-device draft synchronization. A full visual composition editor remains Phase 16 work.

## Structural demonstrations

Runtime demonstrations are registered in `structural-layouts.ts`, not falsely added as finished catalogue acquisitions:

| Demonstration | Home section sequence | Interior composition |
| --- | --- | --- |
| Meridian | Offset hero → trust indicators → chapter service journey → illustrative case story → contact | Story → service journey → contact |
| Canvas | Masonry project index → editorial notes → contact | Editorial story → project index → contact |
| Haven | Immersive illustrated hero → experience → place story → contact | Experience → story → contact |

Each has independent home/about page definitions, metadata and navigation. Tests compare actual rendered section signatures. These prove structural capability; final commissioned-quality art direction, photography, typography and complete business content belong to Phase 14 and its separate decision record/PR #132.

## Security and compatibility boundaries

LUCIA ID remains the sole identity authority. Existing verified session, active organization/membership, role permissions, RLS context, website/org predicates, account-change header, same-origin protections and `If-Match` checks remain in force. Browser recovery and layout permissions confer no access. Membership is checked again at mutation time. Public rendering reads only published snapshots; corrupt private drafts cannot replace an existing live version.

Strict registered data, bounded strings/arrays, React text escaping and fixed token values prevent executable layout content. Paths reject traversal, encoded separators, duplicate routes and reserved internal areas (`api`, `workspace`, `staff`, `auth`, `site`, `_next`, etc.). Existing host middleware remains unchanged; private endpoints cannot be reached through customer hosts. No Core, payment, entitlement, production configuration or customer data changes are part of this phase.

## Architecture decisions

1. **Registered sections, not arbitrary components.** A closed schema/component mapping makes validation, compatibility and safety review deterministic. New types require code and tests.
2. **Additive version coexistence.** Legacy drafts keep their exact storage contract; v2 uses an explicit discriminator. Conversion is explicit, authorized and revision-bound, never inferred from a cached route or performed as a destructive migration.
3. **One preview/public contract.** Studio, Publishing preview, standard hostname and custom hostname reuse `LayoutRenderer` and validated definitions. A preview-only renderer would hide publication incompatibility.
4. **Root-scoped tokens.** Validated values become custom properties only on the website root, with registered class variants. No user CSS is concatenated into global styles.
5. **Stored-policy edit commands.** Full untrusted replacement would allow permission escalation and Design Lock removal. Commands apply to locked server state, with compare-and-swap revision protection shared with publishing.
6. **Existing tenant router.** Pages are data under an existing website, not Next modules. Closed paths and reserved prefixes prevent routing ambiguity. Active hostname bindings resolve through the existing `PublicWebsite` helper and take precedence over nonunique tenant-local slugs. To preserve pre-domain-table v1 URLs without silently migrating customer data, an unbound standard hostname may use a single unambiguous published v1 slug. Ambiguous legacy slugs fail closed; v2 requires an active binding. Custom-domain delivery continues to require its active binding. A future controlled legacy-domain backfill can retire this compatibility fallback.
7. **Atomic multi-page promotion.** The home row stores the complete private composition; publishing snapshots the same definition across its page records in one transaction. Obsolete public paths are retired only on successful promotion. No new database or temporary draft service is needed.
9. **Framework metadata parity.** Browser acceptance found that JSX title elements inherited the OS title. Next `generateMetadata` now reads the same request-scoped cached resolver as page rendering, with absolute customer titles and page-specific descriptions. No cross-request tenant cache is introduced.
8. **Build-owned asset URLs.** Static imports produce immutable asset URLs served through the already-approved static boundary, avoiding customer-path rewrites and external storage dependencies.

## Verification evidence

Final local verification: 533 Vitest tests in 65 files; TypeScript passing; ESLint passing with three pre-existing warnings; Drizzle consistency passing; production build and compiled host-routing HTTP checks passing. The final authenticated browser run completed **24 browser checks plus the staff-denial HTTP check**. Final screenshot review caught Haven's white-on-white CTA caused by a legacy `!important` rule. The scoped correction passed a fresh **9-check Haven regression**, including measured CTA contrast ≥4.5:1 and all five viewports; see `haven-contrast-evidence.json`. A separate complete legacy run passed **8 HTTP checks**. Evidence is committed under `docs/acceptance/phase-13/`: `browser-evidence.json`, `legacy-http-evidence.json`, and the three 390px screenshots. Full three-Layout run source fingerprint (before the scoped Haven contrast correction): `4ccab8fe90c9d53e070b1b1b70a90c5417888f924e87b81fcb674079d967d262`. Checks include real creation/assignment/save/reload, unsaved refresh recovery, failed-save retry, saved preview, actual publication, home/interior metadata and navigation, image loading, keyboard focus, reduced motion, overflow, stale/corrupt publication preservation, Design Lock, membership revocation and tenant isolation.

| Emulated viewport | Meridian | Canvas | Haven |
| --- | --- | --- | --- |
| 320 × 844 | PASS | PASS | PASS |
| 390 × 844 | PASS | PASS | PASS |
| 768 × 1024 | PASS | PASS | PASS |
| 1180 × 820 | PASS | PASS | PASS |
| 1440 × 900 | PASS | PASS | PASS |

Final exact-head Quality and Vercel evidence belongs to [PR #133 checks](https://github.com/trendorafindsinc-jpg/lucia-os/pull/133/checks); both must pass before merging. The auxiliary, nonrequired Cloudflare Workers build fails for this branch. Current main reports success, so its cause must not be described as a confirmed baseline failure. Provider build logs are not exposed by the available connector. This auxiliary deployment has not been disabled or represented as passing; the approved Vercel target and required Quality checks pass.

The existing `check-website-foundation-http.mjs` runner remains the isolated authenticated acceptance infrastructure. `WEBSITE_TEST_PREMIUM=1` adds `premium-composition-acceptance.mjs`, using genuine project records, session fixtures, NOBYPASSRLS runtime, API calls, Studio/Publishing browser interactions and public-host requests. The restricted loopback proxy preserves customer URL/Host and forwards actual application responses; it does not mock rendering or authorization. Cleanup removes only synthetic test resources. Physical device, live OAuth, production DNS/TLS and production customer publishing are not claimed.

An intermediate acceptance attempt passed legacy create/save/publish and public geometry but timed out on Version History after the build was regenerated while its server was running. It is not accepted as final evidence; a fresh-build run is required. A fresh-build rerun subsequently passed Version History and account-scoped recovery. Its newly added composition-refresh check correctly failed against the build predating the composition recovery registration; that build is also not final evidence. No test assertion was weakened.

The first remote Quality run caught missing SVG ambient types on a fresh checkout (typecheck runs before Next generates `next-env.d.ts`). `src/types/images.d.ts` explicitly references Next's image types; final-head CI must reverify this correction. Vercel reached READY for intermediate commit `fba5182`, which is not a claim about later commits.

## Deployment and Phase 14 handoff

No schema changes or migrations. No production migration was executed. Built-in Layout selection, standard website creation, editing, previews and publication remain free. Optional custom-domain access remains the separate ₦5,000 one-time Store/Paystack boundary; no checkout or entitlement activation was invented. S3-compatible customer media remains deferred.

PR #133 may leave draft only after exact-head CI/Vercel confirmation. The founder subsequently authorized the Phase 13 merge once mandatory release gates pass; do not bypass protections or failed required checks. Phase 14 can refine the three structural demonstrations through the same registered engine after acceptance. The canonical 48-Layout specification, eight flagship briefs and 8 → 16 → 32 → 48 review gates remain unchanged.

## Final corrections and scope limits

Browser execution caught and verified the fix for workspace metadata overriding public website titles. The published-slug uniqueness constraint was confirmed by a real rejected duplicate (`23505`); the fixture was corrected to respect that invariant rather than weakening it. Native select tests now use exact accessible combobox roles; an isolated DOM diagnostic confirmed the original exact label-text selector included option text. No production assertion or authorization requirement was removed.

The complete legacy HTTP rerun passed concurrent 200/409 saves and failed-publication preservation. Intermediate failed executions are not counted as passing evidence. Customer published pages were exercised through a restricted forwarding proxy to the real compiled server, not mocked responses or production DNS. Synthetic records are cleaned up. Physical hardware, live Core OAuth and production DNS/TLS acceptance remain deferred.

Full visual editing and v2 checkpoint-history UX remain future customization work. Phase 14's merged D14-07 decision supersedes the historical three-exemplar target: all 48 approved Layouts belong to Phase 14, reviewed in 8 → 16 → 32 → 48 batches. These three Phase 13 compositions remain structural demonstrations, not accepted premium designs.

## Changed implementation areas

- Existing draft, publishing choices and publishing APIs; standard/custom-host public page and metadata routes.
- Shared LayoutRenderer and scoped CSS; existing Studio entry and version-aware composition controls; saved Publishing preview.
- Existing Blueprint v2 exports; composition schemas/permissions, versioned website adapter, structural definitions, build-owned asset manifest and three original SVGs.
- Existing continuity snapshot validator; SVG type reference for clean CI; validation/rendering/compatibility tests.
- Existing isolated acceptance runner plus focused premium workflow; this architecture record and committed browser evidence.

No database migrations, production database changes, external payment/storage configuration or LUCIA Core modifications were introduced.
