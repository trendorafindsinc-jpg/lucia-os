# Phase 16 — Premium Website Personalization Studio

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
