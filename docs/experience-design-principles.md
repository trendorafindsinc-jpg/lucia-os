# LUCIA OS — Experience and visual design principles

**Status:** Approved product-design direction; implementation and acceptance must be verified phase by phase.  
**Applies to:** Website Engine v1 and subsequent phases in the 30-phase roadmap.  
**Related decisions:** [One-time purchase model](commerce-model-one-time-purchases.md) and [Issue #77](https://github.com/trendorafindsinc-jpg/lucia-os/issues/77).

## Product experience promise

LUCIA OS should feel like a polished, premium technology product: beautiful, concise, calm, trustworthy, and easy to use. It must not feel like a crowded website builder, a generic admin dashboard, or an online catalogue pasted into a workspace.

Visual polish is not a substitute for working behaviour. Every visible primary action must work, give clear feedback, preserve user work on failure, and be testable on mobile and desktop.

## Workspace structure

- **Workspace:** The customer's focused place to create, edit, preview, publish, and manage websites.
- **LUCIA Store:** The storefront for optional capabilities, modules, tools, and separately purchasable product versions.
- **My Purchases:** A clear inventory of what the customer owns, the exact version/licence, compatibility, updates/support terms, and any available upgrade purchase.
- **Unavailable/future capabilities:** Store, Portals, and Business Admin must not appear to be working v1 features. If shown for product orientation, label them clearly as unavailable or coming later and disable actions honestly.
- **Loom:** In scope for v1. Its exact current implementation status must be reported from code, tests, and acceptance evidence—not inferred from a roadmap entry.

## Commercial UX rules

- The baseline website engine is free within its documented scope.
- Optional software, modules, premium capabilities, and major versions may be one-time purchases.
- A successful purchase grants a durable entitlement to the exact product/version under the licence shown at purchase; no subscription is required merely to retain that purchased-version entitlement.
- New major versions are separate purchases unless a listing explicitly includes an upgrade.
- Keep website draft/publish history separate from commercial product versions and purchase entitlements.
- Distinguish third-party recurring costs—such as domain renewals, paid email, and external provider fees—from LUCIA software purchases.
- Do not expose live checkout, discount redemption, or entitlement activation until payment verification, idempotency, auditability, authorization, and tenant-isolation gates pass.

## Visual and interaction standards

1. **Restrained premium visual language:** consistent typography, spacing, surfaces, borders, motion, and iconography; use glass-like effects selectively, never at the expense of contrast or legibility.
2. **Concise hierarchy:** one clear primary action per view where practical; secondary actions stay secondary; advanced details are progressively disclosed.
3. **Responsive by default:** mobile-first layouts, touch-friendly controls, no clipped panels, and no hover-only essential interactions.
4. **Functional states:** loading, empty, success, validation, permission-denied, offline/failure, and recovery states must be designed—not left as browser defaults or silent failures.
5. **Preserve work:** failed saves or publishes must not destroy drafts or replace the last known-good published version.
6. **Accessible and readable:** semantic controls, keyboard support, visible focus, meaningful labels, adequate contrast, and reduced-motion support.
7. **Honest capability boundaries:** never imply that a disabled, unverified, or future feature is available. Do not show fabricated purchase status, payment success, analytics, or publishing outcomes.
8. **Coherent end-to-end flow:** discovery, creation, editing, preview, saving, publishing, ownership, and support should share one design system and consistent terminology.
9. **Quality before decoration:** animation and visual effects must be lightweight, purposeful, and subordinate to speed, reliability, and task completion.

## Acceptance checklist

- A new user can identify how to start a website without needing to understand internal technical concepts.
- A user can distinguish the free baseline from paid options before making a purchase.
- My Purchases reflects server-verified entitlements and identifies the owned product/version accurately.
- Unavailable/future capabilities cannot be mistaken for functioning v1 features.
- Core workspace flows are browser-tested at mobile and desktop sizes, including keyboard/focus behaviour and error/recovery states.
- No design phase is marked complete based only on screenshots, documentation, or a successful build; functional tests and relevant security/data-isolation checks are also required.
