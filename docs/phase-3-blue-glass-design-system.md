# LUCIA OS — Phase 3 Approved Blue Glass Design Direction

**Decision:** APPROVED by product owner, 2026-10-29.
**Scope:** Phase 3 shared visual and interaction foundation. This is a design contract, **not** a claim of implementation or Phase 2 acceptance.
**Authority:** Complementary to `lucia-os-product-vision.md`, `workspace-architecture-contract.md`, and `implementation-roadmap-30-phases.md`. The canonical product and security contracts take precedence.

## Visual north star

Build a distinctive, premium **blue glass** LUCIA OS: deep navy structural areas, luminous blue accents, restrained translucent surfaces, clean typography, airy composition, layered depth and subtle responsive motion. The signed-in workspace should feel like one coherent operating environment, not disconnected dashboards. The reference concept presented and approved in chat shows desktop and phone compositions, workspace tabs, app cards, design tokens, interaction states and the Assistive Orb. **Reference imagery is illustrative**, not a literal product screenshot or source of truth for app availability, user identity, organisation counts, prices or feature completion.

Do not copy Apple branding, proprietary UI, icons, or exact layout. Create original LUCIA branding and assets.

## Visual primitives (initial design specification)

- **Palette:** navy `#0B1729` for dark shell/navigation, vivid blue `#1F6BFF` for primary actions, lighter blue `#80B8FF` for highlights, cool mist `#F2F7FF` for light backdrops, white `#FFFFFF` for primary light surfaces, ink `#132238` for light-surface text. Secondary violet `#885CF6`, success `#10B981`, warning `#F59E0B`, danger `#EF4444`. These are starting tokens to tune through accessible contrast tests, not immutable pixel specifications.
- **Surfaces:** opaque dark shell where legibility/security demands it; restrained backdrop blur and translucent layered cards only where content remains legible. Provide opaque fallback when transparency is reduced or unsupported.
- **Type:** clean system-first sans-serif; clearly distinguished page titles, section headings, body, labels and captions. Prefer readable text over ultra-light decorative type.
- **Spacing:** 4px base scale, with practical 8/12/16/24/32px intervals; generous whitespace without sacrificing useful desktop density.
- **Shape:** rounded cards, tabs and controls with consistent radius tokens; soft shadows and subtle borders; no excessive glow.
- **Motion:** fast, purposeful tab, card and panel transitions; respect `prefers-reduced-motion`; never hide state changes behind animation.
- **Focus and accessibility:** visible high-contrast keyboard focus, semantic controls, descriptive labels, minimum comfortable touch targets (target 44×44 CSS px where feasible), keyboard navigation and WCAG AA contrast targets for ordinary text and interactive UI.

## Shared component contract

1. **Workspace shell:** deep navy navigation structure with blue glass content atmosphere; meaningful active/hover/focus/disabled states. Customer flow remains separate from explicit `/staff` entry; never surface staff-only structure through customer navigation.
2. **Workspace tabs:** one tab per app workspace, not arbitrary URL; clear selected/unselected/close/add affordances, dirty-work warnings and restore behaviour as defined by Phase 2 contract. Tabs shown only where device composition allows.
3. **App cards and launcher:** original icons, concise descriptions, truthful availability and real launch actions. Never display fabricated counters or unavailable apps as if functional. Portals and Business Admin are future Store products, not v1 workspace launcher entries.
4. **Split-view affordances:** clear resize, swap/close/focus controls on eligible desktop/capable tablet; no forced phone split view. Actual capability and independent authorization are governed by the workspace architecture contract.
5. **Assistive Orb:** recognizable luminous blue compact state; expandable panel with accessible close/return affordance; distinguish idle, listening (only if supported), processing, success and failure states. Do not imply voice, AI, or background capabilities not actually connected.
6. **State library:** design and implement consistent loading, skeleton, empty, error, validation, retry, disabled, confirmation and success states. Never fake save/publish success or hide real errors.
7. **Device composition:** Phase 3 supplies shared tokens/primitives; Phase 4 builds phone layout and app switcher, Phase 5 desktop tabs/split view, Phase 6 capable tablet. Reference mobile bottom navigation is a visual proposal, not permission to bypass later phase boundaries.

## Implementation and acceptance

- Put theme values in centralized semantic tokens rather than scattered hardcoded styles. Cover light surfaces and navy shell with accessible contrast.
- Build reusable primitives with variants and documented states. Prefer existing framework conventions where sound; avoid unrelated redesign.
- Validate desktop, tablet and phone widths, safe areas, keyboard/focus, reduced motion, transparency fallback and high-contrast states.
- Ensure all controls have genuine behavior or an honestly disabled explanation; no fake apps, metrics or progress.
- Add component/interaction regression coverage for tabs, disabled controls, loading/error feedback and Orb compact/expanded transitions as implemented.
- **Phase gate:** do not claim Phase 3 implemented or complete until Phase 2 is explicitly accepted, code/tests are audited, and Phase 3 implementation plus verification evidence are recorded.
- No production database, DNS, secret, deployment or main-branch change is authorized by this design approval alone.

## Decision record

- **Approved direction:** blue glass, not predominantly white/silver.
- **Approved artifacts:** design direction and documentation of its consistent application.
- **Not yet approved/verified:** production rollout, fabricated demo data, Phase 2 completion, Phase 3 acceptance, or any visual concept feature absent from the product contract.
