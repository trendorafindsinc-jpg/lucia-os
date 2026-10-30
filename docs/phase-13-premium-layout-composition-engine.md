# Phase 13 — Premium hybrid layout composition (implementation record)

**Status: IN PROGRESS — not accepted.** This record reports implemented code and unverified gates separately. The 48 premium catalogue and the Phase 14 decision PR are still distinct from this implementation.

## Architecture audit and decision

The existing `src/lib/layout-blueprint/blueprint.ts` defines persisted `lucia.loom-blueprint` v1, a strict four-section union, limited theme values and a `SiteDraft` compatibility adapter. Phase 12's real-renderer inventory found 37 starter records, all ultimately producing the hero/content-grid/contact sequence. The existing layout renderer, draft/publish transaction and website identity boundary remain authoritative. No alternate site engine or database has been created.

## Changes committed in this branch

- Additive, strongly typed `lucia.layout-composition` v2 contract and `layoutVersion` with immutable identity. v1 remains byte-compatible and saved sites are **not** auto-upgraded.
- Closed registry of seven section **schemas**: premium hero, trust strip, editorial story, project gallery, service journey, experience and contact panel. Variant selection and section content are runtime validated. These are contracts, **not yet registered React rendering implementations**.
- Independently ordered page definitions with valid unique paths, stable page/section IDs, unique section-instance IDs, navigation target validation and optional responsive composition modes.
- Strict and scoped token **data**: bounded role colours, typography families, scale, width, radius, rhythm, and motion. Tenant-scoped CSS application remains outstanding.
- Allowlisted local built-in asset references and mandatory image alt text. No arbitrary external URLs, event handlers, executable code, CSS or raw HTML pass the schema. Asset existence/licence verification remains an integration requirement.
- Guided and Advanced edit decision function, immutable edit copies, section-order validation and Design Lock guards. This is a foundation, not a finished visual editor or authenticated server action.
- Meridian, Canvas and Haven two-page data fixtures in Vitest to demonstrate distinct recipes. They are not published premium sites or browser-tested examples.

## Compatibility, security and publishing

No migration or production data change. The persisted v1 adapter and legacy schema remain unchanged and are still the default for existing projects. No v2 draft/publish integration is yet implemented; consequently the project cannot claim v2 publishing parity or successful rollback coverage. An authenticated, tenant-scoped server transaction with revision checking must validate the v2 input before any persisted write or publication. Layout definitions and edit permissions do not confer access rights.

## Tests and known limitations

The branch contains targeted validation tests. CI results, exact test totals, lint, TypeScript, build, and five-viewport authenticated browser acceptance must be obtained against the final commit; no passing result is asserted in this document.

**Remaining P1 gates:** integrate seven section types into the **existing** LayoutRenderer; resolve per-page public and preview paths through the same composer; apply scoped tokens and responsive layouts; validate built-in asset manifests; add server-boundary persistence/publishing support with the existing revision/tenant mechanisms; test v1 compatibility and v2 transaction safety; complete real browser acceptance at 320, 390×844, 768×1024, 1180×820 and 1440×900. These must be completed before Phase 13 can be declared PASS.

## Phase 14 handoff

Keep the eight flagship briefs and approved 48-layout catalogue authoritative. Meridian, Canvas and Haven currently illustrate **data structure** only. Phase 14 visual execution must not be recorded as finished until its real renderer, licensed imagery and multi-page website acceptance pass. S3, Paystack, and the ₦5,000 one-time optional domain model are unchanged.
