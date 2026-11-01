# Phase 11 — Website foundation

## Scope and baseline

Continue the existing website engine from main `8ad0dc9a50af2a073025b712ffd7ce72ed7c48f7` (canonical documentation PR #130). No second editor, renderer, publishing service, identity system or database was introduced. Phase 12's separate [premium architecture](phase-12-premium-layout-architecture.md) prepares the next composition phase; it does not claim 48 implemented designs.

## Executed audit and corrections

| Capability | Existing implementation | Confirmed issue | Correction / boundary |
| --- | --- | --- | --- |
| Create | Authenticated onboarding transaction creates organization/membership, website and initialized page records | Existing organization reuse did not explicitly reject inactive/viewer membership; browser setup cache was not account-scoped | Revalidate membership/status/permission; reject reserved addresses and unknown Layouts; verified-account request guard; account-scoped bounded session recovery |
| Save | Authorized website home SiteDraft in PostgreSQL; browser recovery and version checkpoints | Last-writer-wins saves could overwrite a newer draft; recovery did not retain its durable base revision | Strong resource-bound revision, required If-Match, row lock and compare inside authorized transaction; conflict review; preserve newer edits during in-flight save |
| Preview | Existing SiteDraft → Blueprint → registered LayoutRenderer | Publishing preview could imply unsaved form content was the saved project; invalid/missing drafts could receive demo defaults | Fetch selected authorized project and compare revision; render confirmed saved content; explicitly reject unavailable/corrupt drafts |
| Publish | Existing transaction separates draft `content` and public `publishedContent`, creates active free hostname | Selection by slug was ambiguous across authorized organizations; stale publication could replace newer work; invalid saved data could become defaults | Require exact website ID plus matching slug and revision; validate saved home before publication; atomically preserve previous live version on conflict or failure |
| Tenant isolation | LUCIA ID-backed OS session, local memberships, permissions, organization-scoped queries and PostgreSQL RLS | Cached identifiers and frontend selection cannot be authorization | Preserve independent server checks; revalidate membership/status in write transaction; account-change guard is additional consistency protection, never a grant |
| Domains | Exact active hostname lookup, reserved routes, DNS/ownership reference workflow | Legacy entitlement helper described recurring premium access and error attributed OS commerce to Core | Rename unused helper input to server-verified custom-domain access; truthful Store boundary. No paid checkout or entitlement activation fabricated |
| Media | Durable text/structured content; media URL/key reference metadata | No durable object upload integration or usable licensed photographic catalogue | Preserve working references and honest upload messaging; S3 remains deferred, no credentials required |
| Existing designs | 37 starters, six CSS families, actual shared renderer | Catalogue card art is not an accurate finished-site screenshot; all current home compositions share three sections | Explain illustrative starter status and add working current-design preview links; preserve all legacy IDs |

Creation retains the existing advisory-lock/idempotent transaction and local organization association. It never accepts an arbitrary organization association from the submitted setup form. A retry for the same authorized project returns its real existing identifier; global hostname conflicts still fail safely at publication. An address shown in setup is suggested, not guaranteed reserved until publication.

## Draft and publishing contract

`GET /api/websites/:websiteId/draft` returns the exact authorized saved home draft, a strong quoted revision and ETag. The revision hashes website identity plus durable home content. `PATCH` and publishing POST require that revision in `If-Match`: missing/invalid preconditions return 428; stale values return 409; invalid content is rejected. Row locks serialize competing updates before comparing the fresh value. Unknown object fields follow the existing validated schema, never executable content.

Publishing now requires `websiteId` as well as the existing validated settings/action. Slug disagreement is a conflict, not a lookup for another website. Publishing choices carry resource ID, revision and draft validity. The existing save/publish transaction remains authoritative. A late hostname uniqueness conflict rolls back draft/publication changes and reports 409, including PostgreSQL errors wrapped by Drizzle. The existing public reader receives only published snapshots, not private draft changes.

The revision currently covers the legacy home SiteDraft. It is not a universal project revision for independent structure/media/SEO writes. Phase 13 must widen the revision/atomic-save contract before introducing multi-page composition mutations. Existing internal published paths reuse the supported home rendering with a page title; complete distinct page designs remain future composition work.

Old open browser clients without If-Match fail safely and must reload. No database migration or rewriting of existing content is needed. Existing recoverable editor drafts without a trustworthy base revision require explicit review against the saved draft; they are not discarded or silently treated as current.

## Editor and recovery behavior

All supported editor mutation paths checkpoint draft data with their base revision, including ordinary fields, section operations, AI proposal application and version recovery. Recovery remains account/resource scoped through the existing Phase 9 continuity envelope. Base revision metadata cannot grant access. Closing/discarding a resource clears its associated draft/base only.

On conflict, the editor retains local edits, displays the latest saved draft and disables blind saving. Loading the saved draft requires explicit discard confirmation; cancelling preserves local work. Keeping local edits after reviewing a newer revision requires explicit confirmation and a subsequent real save. Only an API-confirmed commit clears dirty state. Newer edits made during a successful in-flight save remain dirty and recoverable against the newly confirmed base.

Setup uses `lucia-os:website-setup:v2:<verifiedUserId>` in bounded session storage. Unowned legacy global setup data is deliberately not imported or deleted, preventing cross-account disclosure. Corrupt/disabled storage does not crash the wizard. A cache-clear failure after a successful database commit cannot turn creation into a false failure. No credentials or private drafts are uploaded to Core.

Version History's existing restore action also sends the loaded draft revision. It rejects stale restoration without overwriting the current draft, requires an explicit history refresh/review, and updates its revision after a confirmed restore. Invalid saved drafts disable checkpoint/restore actions rather than materializing demo defaults. Resource changes ignore late load/restore results. No new version service was created.

The publishing preview uses a native modal dialog for focus containment, Escape and focus return to the preview trigger. The existing visual design remains intact.

## Mobile overflow correction

The initial authenticated Civic Legal check measured document width 392px at a 390px viewport. Geometry identified the editor top action row extending to x=391.625px; the preview heading also exceeded its content container. The local editor breakpoint now wraps the action row, and the shared Layout heading/action constraints wrap within the real renderer container. No global horizontal-overflow mask was added. A clean build was necessary to remove an old duplicated stylesheet from local incremental output.

Clean-build diagnostic measurements: Civic Legal document width equals 320/390/768/1180/1440px at those respective viewport widths; heading scroll width equals client width and the right edge stays inside its parent. The authenticated shared-family checks additionally assert document and heading geometry. Existing workspace tab strips retain their intentional contained scrolling.

## Free access and infrastructure boundaries

Standard creation, built-in Layout selection, editing, saving, preview and supported LUCIA-address publishing contain no subscription/payment/AI prerequisite. Real synthetic projects exercise these paths without a purchase. Authorization, active membership, validation, reserved-address and uniqueness checks remain enforced.

Custom-domain access is the optional **₦5,000 one-time Store purchase**, separate from registrar registration/renewal. Paystack is approved. Checkout/payment verification is not implemented here; no client redirect can grant access. Existing domain ownership/DNS controls remain. S3-compatible customer upload storage is deferred; no bucket, new environment requirement or temporary upload masquerading as permanence was added.

## Security and release safety

The real compiled application is tested using synthetic accounts in an existing isolated `*_acceptance` database and a non-superuser NOBYPASSRLS runtime role. Fixture cleanup removes only synthetic records. Test setup uses its explicitly supplied administrative connection; application requests use the restricted runtime connection. No production customer websites, Core, secrets, DNS, payment records or production database migrations are modified.

Website mutations reject cross-site browser requests and mismatching present Origins, retaining authenticated non-browser JSON clients. Server session and permission checks remain mandatory independently of headers, browser state or revision tokens. Rendering uses registered components with React text escaping; no arbitrary customer HTML/CSS/JavaScript execution is introduced.

## Verification evidence

**Executed 30 October 2026. Phase 11 functional acceptance: PASS.** No unresolved P0/P1 defect was found in the scoped workflow. The exact final PR head must additionally receive green Quality checks and a READY Vercel preview before the founder-authorized merge. Those immutable commit/check/deployment links are recorded in the PR's verification section; older green commits are not release evidence.

| Executed check | Result |
| --- | --- |
| `npm test` | 500 tests, 62 files passed; includes authenticated route, ownership, registry/recovery, publishing, security and catalogue/architecture suites |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS, zero errors; three pre-existing warnings (billing unused import, SEO image recommendation, AI test unused import) |
| `npm run db:check` | PASS; no migration files/schema changes |
| `npm run build` | PASS; customer-host middleware confirmed in compiled build |
| `npm run test:routing:http` | PASS; compiled platform/customer/custom-host/private-path/staff gates, spoofed forwarding header and shared static assets |
| `node scripts/check-website-foundation-http.mjs` with explicit isolated DB and browser configuration | PASS: 8 HTTP/security groups and 17 authenticated browser groups |

The browser run used the real compiled Next application, real PostgreSQL records, existing OS session validation and a NOBYPASSRLS application role. Application API responses were not mocked or fulfilled. Component-only diagnostic probes were separate and are not counted as acceptance. Compiled build ID: `R0Djjy8e-MIc2EauaHEb4`. Tested source SHA-256 (sorted repository `src`, `scripts` and package/config inputs): `9c07378007fe5d7e3b199f889235f7ce6ba935cc4610ec78d0152fc40bc07a09`. Final source is unchanged after that run; documentation and screenshot additions do not change this fingerprint.

### Authenticated browser acceptance

| CSS viewport | Existing editor renderer geometry | Published site and keyboard controls | Evidence |
| --- | --- | --- | --- |
| 390 × 844 | PASS, all six families including Civic Legal | PASS | [Phone screenshot](acceptance/phase-11/public-390.png) |
| 768 × 1024 | PASS, all six families | PASS | [Portrait tablet screenshot](acceptance/phase-11/public-768.png) |
| 1180 × 820 | PASS, all six families | PASS | [Landscape tablet screenshot](acceptance/phase-11/public-1180.png) |
| 1440 × 900 | PASS, all six families | PASS | [Desktop screenshot](acceptance/phase-11/public-1440.png) |
| 320 × 740 (additional narrow phone) | PASS, all six families, including heading bounds | Not a separate full publication journey | Geometry assertions in the runner |

These are viewport emulations, not physical-device acceptance. Geometry assertions check document width and heading scroll/client width and parent boundaries; the result is not inferred solely from screenshots. Screenshots show actual synthetic published content and visible keyboard focus, not prospective premium Layout mockups.

The real journey created a project, edited and committed its draft, reloaded it, previewed confirmed saved content, published it, and loaded its assigned hostname in Chromium. Four public viewport checks passed. Cancel preserved the recovered local draft; explicit discard loaded the newer saved draft; stale recovery could not silently overwrite it. The Lattice native editor saved the correct resource. Version History created a real checkpoint, rejected a stale restore, then restored after explicit refresh without publishing. Account switching did not import another account's setup cache, and disabled storage did not turn a successful database creation into failure. There were no unhandled application errors.

The HTTP groups independently verified signed-out denial, reserved/unknown input, cross-origin and viewer denial, idempotent creation, cross-account draft/read/write denial, concurrent 200/409 saves, exact resource publication despite duplicate slugs, late hostname collision rollback, corrupt draft rejection, revoked membership and customer denial of staff grants. Customer-controlled script-like text rendered literally and did not execute.

### Test transport and limitations

This runtime cannot directly route Chromium's synthetic customer DNS names to loopback. A restricted ephemeral loopback HTTP proxy forwards only the test port and one-level `*.lucia.name.ng` names to the real compiled application, retaining the address bar URL and exact Host header. It forwards genuine HTTP responses, including assets; it does not simulate a renderer, bypass authorization or modify production DNS. Native HTTP hostname checks independently pass. This establishes application routing and durable publication behavior, not a new production DNS/TLS rollout.

Earlier interrupted runs exposed the mobile overflow and publishing-preview focus-return defect; both were corrected and retested. One run hit a PostgreSQL WebSocket test-tunnel CONNECT_TIMEOUT; it was not counted as passing. The native modal assertion was corrected after an isolated Chromium reproduction showed BODY is transiently active during browser-chrome focus cycling: the accepted invariant requires a real modal and prohibits underlying page controls receiving focus, including a direct attempted focus. Escape and Close explicitly restore the trigger. No assertions about application authorization or persistence were relaxed.

Physical phone/tablet testing and a new end-to-end Core OAuth sign-in are deferred; authenticated acceptance here exercises the existing OS session contract with synthetic accounts. Vercel READY is a deployment/build gate and is not represented as authenticated browser acceptance. Store/Paystack checkout, domain activation/DNS/TLS provisioning, durable S3 uploads, new multi-page composition and the 48 premium implementations remain separately scoped dependencies. Current starter completeness/imagery gaps are documented in Phase 12; this phase does not certify them as premium designs.


## Changed implementation areas

- Onboarding API, authenticated create page, setup validation and account-scoped wizard recovery.
- Draft API and shared resource revision/origin/unique-error helpers.
- Publishing request schema, choices API, transactional publication and project-specific UI/preview.
- Existing visual editor, Version History restoration and continuity snapshot validation.
- Local editor and shared renderer responsive constraints; native publishing preview dialog.
- Catalogue preview links and truthful starter copy; legacy domain entitlement terminology.
- Focused route, validation, catalogue inventory, architecture consistency and recovery tests; compiled website HTTP/browser acceptance runner.

## Deployment and recovery

No migration, new service, S3 configuration or production credential change is required. Deploy client and API together; stale clients receive safe precondition errors and must reload. A code rollback retains original database content and existing public snapshots. Never run an earlier client against the new mutation API and interpret 428 as a successful save. Monitor save/publish conflicts and unauthorized access without logging private draft content.

## Phase 13 handoff

Use the existing Blueprint/renderer and durable project model. Preserve v1 compatibility and customer content. Implement validated registered composition, page-aware rendering, widened atomic revisions, accurate shared preview/public output and the Phase 12 quality gates. Guided/Advanced/Design Lock remain engineering contracts, not newly functioning controls. Licensed imagery and genuine distinct pages are prerequisites for flagship acceptance.
