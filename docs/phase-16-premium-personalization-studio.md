# Phase 16 — Premium Website Personalization Studio

**Current release gate:** customer-owned media integration is implemented below but remains BLOCKED on restricted credentials and live-provider acceptance. No merge or production migration is claimed.

**Base:** `main` at `ccf44ba47335c4152fb6e236d188510bb8c93095`. **Branch:** `phase-16-premium-personalization-studio`. **Target:** all 48 original `lucia.layout.*` identities. **Release policy:** founder approval required; do not merge Phase 16 automatically.

## Baseline and reuse

Phase 13's validated v2 composition, Phase 14's eight flagships and 48 registered candidates, and Phase 15's real preview → selection → creation → editor → publication are retained. The existing `CompositionStudio`, `applyPremiumEdit`, `websiteMutationSchema`, `/api/websites/:id/draft`, workspace recovery, canonical assets, production `LayoutRenderer`, `/publish` and published-revision protection are extended rather than replaced. The old 37 legacy starters and v1 editor remain functional.

## Implemented Phase 16 scope

- Task-oriented Business identity / Page content / Design controls in the **existing** Studio. Mobile-friendly input and preview controls with page/section lists, integrated editing feedback and real live, unsaved v2 renderer preview.
- Canonical identity fields: `identity.name`, `identity.description`, optional `identity.profile` containing `tagline`, `contactEmail`, `enquiryEmail`, `phone`, `address`, `serviceArea`, optional `social` (Instagram, Facebook, LinkedIn, X) and optional built-in `logo` image/alt. Old persisted v2 documents remain valid because the profile is optional. No database schema migration needed.
- New validated `business-detail`, `business-social` and `business-logo` edits use the existing authorized, versioned `composition-edit` PATCH. HTML markup, insecure URLs, unknown assets, malformed email/telephone and unsupported mutations are rejected. No arbitrary CSS or custom URL upload is allowed.
- The name and description render from one site identity in the header/footer; exact-matched page-title changes are supported without global editorial text rewriting. The public footer presents verified shared profile fields and safe external social links. An enquiry destination update rewrites registered shared contact-panel email fields within **this website's** revised definition only, so publishing readiness validates the same destination displayed by the renderer. Other editorial, service and portfolio content stays untouched. A distinct contact address intentionally configured within a panel is treated as part of the website's global enquiry contract.
- Section text editing expands existing heading/body controls with hero eyebrow, trust-strip entries, individual service descriptions, and individual portfolio/project descriptions; artwork and image-alt editing reuse allowlisted built-in manifest choices. Approved typography/scale/radius tokens and preset accent colors use the existing permission-checked token mutations, with a minimum accent/background contrast guard.
- Existing revision/If-Match, 409 conflict protection, account/tenant authorization, workspace tab recovery, safe draft publication and rollback remain authoritative. Unsaved state visibly blocks the publishing handoff and triggers a navigation warning; page switches retain pending edits. Preview is explicitly identified as **unsaved local** until the authorized save succeeds.
- Secure customer file uploads do **not** exist in the approved asset architecture; the Studio offers only repository-owned, server-validated images. No unapproved file storage or upload routes were introduced.

## Test and release evidence

The Phase 16 compatibility suite exercises all 48 canonical IDs with schema validation, profile edit persistence, public enquiry propagation, content section preservation, page path stability and safe image replacement. Additional cases test invalid business data, social/link safety, logo removal and exact-brand mappings. Existing tenant isolation, idempotent creation, failed publish recovery and revision conflict tests remain in the repository; the Phase 14/15 isolated HTTP/Chromium harnesses are retained for real compiled acceptance.

**The distinction matters:** isolated browser acceptance of all eight flagships, five viewport editor journeys, production-grade A/B tenant authorization and exact-head CI/Vercel are Phase 16 gates requiring actual execution. Green unit tests alone are not evidence for them. Real LUCIA Core OAuth cannot be inferred from synthetic sessions.

## Phase boundaries and limitations

No new renderer, content schema family, unrestricted section/page creation, arbitrary HTML/CSS, payment flow, S3 requirement, second identity provider or global customer data migration. Phase 17 owns catalogue-wide independent visual acceptance; Phase 18 owns free publication policy verification; Phase 19 owns full product release acceptance. Production remains unchanged and merging requires separate explicit founder approval.

## Final isolated application acceptance — 31 October 2026

- **Application code baseline:** `ccf44ba47335c4152fb6e236d188510bb8c93095` on main, extended in the Phase 16 branch. The flagship browser test ran against the compiled production Next.js application from the Phase 16 branch; the final test-harness selector and evidence corrections are included in the release PR.
- **Database:** freshly migrated isolated `lucia_phase16_acceptance` PostgreSQL 18. Two separate synthetic customer accounts with genuine hashed application session cookies, enforced organization-scoped HTTP APIs and distinct least-privilege `lucia_phase16_runtime` role: `rolsuper=false`, `rolbypassrls=false`. No LUCIA Core OAuth simulation is represented as an external OAuth test.
- **Browser:** Chromium, existing Phase 15 and Phase 14 infrastructure, real server-side persistence and public virtual-host routing. `WEBSITE_TEST_PHASE15=1 WEBSITE_TEST_PHASE16=1 WEBSITE_TEST_PHASE14_LAYOUTS=flagships WEBSITE_TEST_PREMIUM_FAST=1 WEBSITE_TEST_PREMIUM_ONLY=1` yielded **27 passing browser checks and 1 HTTP check**, with **zero unhandled browser errors**.
- **All eight complete passes:** Meridian, Canvas, Haven, Academia, Maison, Nexus, Impact and Estate. Each navigated the Layout Library and registered multi-page preview, selected its canonical ID, created its real website, loaded the persisted Studio, changed business description, tagline, enquiry email, public email, Instagram link and logo asset, saved and reloaded the actual draft, edited its contact page heading, saved the new revision, denied Customer B's unauthorized direct PATCH, rejected an outdated If-Match revision, and republished. Public homepages reflected business identity; public contact routes reflected the new enquiry address and page heading. Previous publishing rollback, unauthorized reads/edits, stale save and invalid publication checks also passed before the customization run.
- **Responsive:** browser viewport measurements for Phase 16's actual Meridian editor at widths 320, 390, 768, 1180, 1440; five-width catalogue/preview and eighty public webpage responsive assertions were preserved by the Phase 15 gate. No horizontal document overflow assertion failed. The [390px real editor screenshot](acceptance/phase-16/studio-business-390.jpg) is actual Chromium output with isolated customer demonstration data, not a design mock.
- **Automated tests:** 48/48 customization contract cases in `phase16-personalization.test.ts`; targeted business validation, image restrictions, social HTTPS, branding, logo deletion, section injection, old-name metadata and enquiry clearing tests. The complete repository suite was rerun after a discovered registered-title mapping regression and the narrow fix. See exact final-head GitHub Quality checks and PR acceptance comment for authoritative latest counts.
- **Cleanup:** isolated website fixture count returned to zero after browser tests. No production database/customer data was modified.
- **Real OAuth status:** Core authorization and actual LUCIA ID end-to-end callbacks are outside synthetic acceptance; historical Phase 15 diagnostics must not be represented as a live Phase 16 login pass. The production merger remains separately founder-authorized and has not been performed.

### Verified corrective actions

1. Existing branded page titles with a registered ` — Business Name` suffix now update through the explicit metadata rule, preserving unrelated editorial text; this fixes the regression detected by the full unit suite.
2. Clearing the shared enquiry address explicitly clears each registered contact-panel destination, so the existing publishing readiness check fails safely instead of publishing stale contact information.
3. Changed section text containing HTML markup is rejected server-side while the original React renderer continues to escape ordinary text.
4. The inherited acceptance harness now uses the Phase 16 business tab as the editor readiness marker, targets the registered page selector reliably and restores the normal viewport after the dedicated mobile screenshot, preventing its state leaking into subsequent flagship tests.


## Customer-owned media implementation — 31 October 2026

**Release status: BLOCKED pending restricted credentials and live storage acceptance. No production merge or database migration has been performed.** Earlier built-in-image-only statements describe the previous checkpoint. This additive implementation follows the approved shared storage decision from PR #139.

### Implemented integration

- Existing Studio now has a durable-image library UI: upload, compression, usage/quota information, retry/refresh and protected removal. Ready customer images join the existing logo, hero, editorial and project image selectors. Saving still uses the same Guided/Advanced edit API and renderer.
- Upload endpoint authenticates the server session, checks account changes and same-origin requests, bounds streamed multipart bytes, resolves active tenant membership and independently checks website-edit permissions. Original filenames/object keys never establish ownership.
- Sharp performs real image decoding, MIME/format agreement, a 4 MB source limit, a 24-million-pixel ceiling, animation rejection, autorotation, metadata removal, a 1600px dimension cap and WebP transcoding capped at 260 KB. Originals are not retained. Compression targets do not guarantee identical subjective quality for every source.
- PostgreSQL owns opaque `media:UUID` references, tenant/website ownership, object keys, dimensions, alt text, byte usage and pending/ready/deleting/deleted lifecycle. The private S3 adapter signs requests server-side, uses AES-256 encryption and never returns credentials, provider error bodies or signed URLs.
- Website reservations and the LUCIA OS product budget are checked atomically under the shared budget-row lock. Default website quota is 5 MB, capped at 200 retained images; platform operators can set individual website quotas through an audited API and `/staff/storage`. Ten successful/reserved uploads per website per minute are bounded; invalid-input abuse throttling and provider-account-wide inventory still need further acceptance/hardening.
- The initial OS allocation is conservatively 2 GB within the shared 10 GB planning budget. Staff monitoring reports **OS reservation usage**, with an 80% warning. It does not falsely report other-product buckets or monthly bandwidth as measured storage. A shared-account inventory collector remains an outstanding release requirement for broader cross-product use.
- Save and publication lock/check each referenced image against the exact authorized website. Public `/_media/UUID` delivery uses a narrowly scoped published-reference lookup; private images require active membership. Existing customer-host workspace/API denial remains intact.
- Removal locks the website home and media row in the same order as save/publication, rejects references from any current draft, publication or retained version, and enforces a 30-day grace period after publication. A possibly completed but unconfirmed upload keeps its quota reservation; pending uploads older than 24 hours can be safely removed through the existing library endpoint. Space is refunded only after confirmed object deletion.

### Verified provider setup and secure credential step

The connected IDrive API confirmed bucket `lucia-os-customer-media-2026`, London-2, reachable, with actual `LocationConstraint=eu-west-3` and endpoint `https://s3.eu-west-3.idrivee2.com`.

Configured nonsecret server-side Vercel settings for Production and Preview: `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `MEDIA_WEBSITE_QUOTA_BYTES=5000000`, `MEDIA_PRODUCT_BUDGET_BYTES=2000000000`, and `MEDIA_UPLOADS_ENABLED=0`. No credential was copied or disclosed.

**Required owner action:** in the IDrive e2 console, Access Key → Create Access Key → London-2 → Read and write; permit object deletion, disable bucket deletion, and select **only** `lucia-os-customer-media-2026` (the provider defaults to all buckets, so deselect that default). Prefer separate Production/Preview keys. Save the generated ID directly into Vercel project `lucia` as `S3_ACCESS_KEY_ID`, and the secret as `S3_SECRET_ACCESS_KEY`, both type Secret/Sensitive in the intended environments. Do not send either value through chat, source control, screenshots or GitHub. The available IDrive connector supports S3 operations but cannot create restricted keys. Keep uploads disabled until the isolated live-provider acceptance passes.

### Migration and recovery

`0016_customer_media.sql` is additive: three tables, constraints/indexes, forced media RLS, a bounded public lookup and runtime grants. Its generated Drizzle snapshot reconciles the existing schema baseline without recreating existing tables. Production migration is **not applied**. Verify function ownership and least-privilege grants in the isolated database before controlled deployment. Recovery is to disable uploads and retain tables/objects/references; never drop media or rewrite existing published snapshots. Existing built-in Layout editing/publication continues without S3 credentials or new media references.

### Fresh verification and outstanding gates

The local suite passed **834 tests across 75 files**, including actual Sharp compression, format spoofing/corruption/size rejection, server-only request signing, unknown/cross-website references, quota denial, uncertain provider-write reservation retention, deletion reference protection, revoked access and HTTP authentication/account/origin guards. TypeScript, ESLint (three existing warnings), production build, compiled routing and Drizzle consistency were executed; final exact-head CI remains authoritative.

The isolated compiled-application workflow now includes actual PostgreSQL/API media denial cases and the Phase 16 personalization journeys. Synthetic media metadata is used only for **negative authorization tests**, not as evidence of uploaded bytes or a successful storage workflow.

**Not verified:** live IDrive upload → durable reload → preview/publication → rollback; real concurrent quota races; credential restriction against another bucket; actual shared-account storage inventory; customer-image browser acceptance; production migration/deployment. These remain mandatory release gates. No PASS, successful upload, production merge or production migration is claimed from unit tests or historical built-in-image browser results.

### Additional boundary corrections

Private media authorization uses the actual HTTP Host rather than Next.js's internal server URL. Customer-host rewrites cannot use a platform session to obtain private draft images. Two route-level regression cases cover the internal-URL/customer-Host mismatch and legitimate platform-owner checks. Rate-cap checks now precede decoding as well as atomic reservation, preventing repeated expensive compression once the website upload cap is reached. The first CI attempt exposed a local symlink-contaminated generated lockfile; it was removed, restoring the repository's existing lockfile-free install convention. Final-head Quality and deployment checks must be read on PR #138, not inferred from earlier failures or passes.
