# LUCIA Visual Experience System

**Phase:** 16 of 30. **Date:** 31 October 2026. **Status:** implemented architecture; live media and final creative acceptance remain gated.

## One renderer, three creative directions

The optional `visualExperience` property belongs to the existing `lucia.layout-composition` v2 definition; historical drafts without it remain unchanged. The shared `visualExperienceSchema`, Studio controls, `applyPremiumEdit`, revisioned draft mutations and `LayoutRenderer` implement one closed vocabulary, not three renderers or new Layout IDs.

| Expression | Reference flagship | Visual direction | Motion direction |
| --- | --- | --- | --- |
| **Elegant** | Meridian | Editorial hierarchy, restrained serif typography, generous spacing, framed imagery and refined lines | Short transitions, barely perceptible lift |
| **Dynamic** | Canvas | Expressive type, firm graphic dividers, layered portrait artwork, energetic asymmetry | Purposeful rising reveals, responsive graphic detail |
| **Cinematic** | Haven | Immersive photo-led hero, atmospheric depth, legible image overlay, scene-first composition | Deliberate entrances and optional spotlight detail |

The descriptions above are a **design contract** and examples of implementation intent, not a founder-approved assessment of three fully tested live deployments.

The validated knobs are: `expression`, `motion`, `reveal`, `transition`, `interaction`, `background`, `typography`, `image`, `depth`, `lighting`, `reducedMotion`. Unsupported combinations, Design Lock and invalid arbitrary fields must be rejected on the server as well as hidden/disabled in the UI. Each control must have visible effect where applicable; if a section cannot support it, remove or scope that control instead of implying an effect.

## Accessibility and safety

The renderer adds `data-expression` and `data-visual-*` only to opted-in v2 sites. Visual styles are scoped under `.premium-visual`; the existing page/navigation and media pipeline remain authoritative. No customer HTML/CSS, remote scripts or alternate storage service are permitted. All imagery is approved built-in artwork or server-authorized `media:UUID` references.

Content must remain visible when view-timeline animations are unsupported or JavaScript is unavailable. Respect both `prefers-reduced-motion: reduce` and the customer override; avoid infinite animations, sound and parallax dependencies. Preserve semantic headings, keyboard focus, text contrast, image alt text and responsive navigation.

## Verified evidence and its limits

At the previously verified head `bb011f392408a0c95477aef7d6ad44ff92612790`, tests cover the validated 48-ID definition contract, three expression attributes rendered in public and preview HTML, Design Lock, invalid expression combinations and reduced-motion persistence. GitHub Quality `41228662603` and isolated browser/publishing `41228662718` passed. Flagship screenshot workflow `41228662632` captured eight original Layouts at widths **320, 390, 768, 1180 and 1440px** using Chromium.

These are **not** proof of end-to-end image upload, independently reviewed expression screenshots or founder visual signoff. The eight screenshot exemplars and contract tests do not constitute full individual aesthetic acceptance of all 48 Layouts.

## Remaining Phase 16 visual acceptance

On an isolated migrated authenticated preview with bucket-scoped IDrive test credentials, run **Meridian/Elegant**, **Canvas/Dynamic** and **Haven/Cinematic** as distinct complete real Studio journeys. For each: select Layout, edit branding/content/imagery, switch supported options, save, reload, private-preview, publish to a test hostname, recover a prior revision, and compare actual published and preview rendering at 320/390/768/1180/1440px.

Test interaction, visual hierarchy, image crop, text contrast, keyboard focus and reduced-motion independently. Capture real Chromium screenshots plus a manifest naming the exact SHA, deployment, expression, viewport and outcome. Confirm built-in artwork still works with S3 disabled. The final live media test must use actual customer file bytes through the application, not synthetic metadata or S3 mocks.

Phase 17 owns comprehensive bespoke creative critique and visual acceptance of the entire 48-Layout catalogue.
