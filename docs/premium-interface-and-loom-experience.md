# LUCIA OS — Premium Interface and Experience Direction

**Status:** Approved product/design direction  
**Applies to:** LUCIA OS v1 website engine and Loom  
**Implementation rule:** This document is a design contract, not proof that the interface is implemented. Each feature must pass its own functional and acceptance checks.

## Product feeling

LUCIA OS should feel like a carefully made, premium technology product: beautiful, calm, concise, responsive, and trustworthy. It must not feel like a crowded template marketplace, a generic admin dashboard, or a decorative mockup. Function and clarity come before effects.

## Shared design principles

- **One coherent system:** consistent typography, spacing, surfaces, borders, icons, controls, focus states, and motion across the workspace and Loom.
- **Restrained premium styling:** refined glass/surface treatments, clear hierarchy, generous breathing room, and purposeful colour. Avoid excessive blur, gradients, cards, and competing visual effects.
- **Concise by default:** show the action and information needed for the current task; place advanced controls in contextual panels instead of showing every option at once.
- **Real actions only:** every visible button, tab, menu, search, filter, and link must work. Do not use dead controls or claim that an operation succeeded before the server confirms it.
- **Honest states:** loading, empty, saved, unsaved, unavailable, permission-denied, and error states must be distinct and understandable. Errors must preserve user work whenever possible.
- **Mobile-first behaviour:** touch targets, navigation, editors, dialogs, tables, and complex layouts must adapt to narrow screens without horizontal overflow or hidden critical actions.
- **Accessibility:** semantic controls, keyboard navigation, visible focus, appropriate contrast, reduced-motion support, and meaningful labels.
- **Purposeful motion:** use short, connected transitions to explain navigation, expansion, saving, and state changes. Motion must not delay tasks or be required to understand the interface.

## Website-engine workspace

- Make the primary journey obvious: create or open a website, edit it, preview it accurately, save it, and publish it deliberately.
- Keep website content/history versions separate from commercial product versions and purchase entitlements.
- Keep AI assistance optional. The normal editor must remain usable without AI; AI proposals must be validated, previewed, reviewable, and applied explicitly. Applying an AI proposal must not silently save or publish.
- Preserve drafts on recoverable failures and clearly indicate whether the current version is saved or live.
- Store, Portals, and Business Admin may appear in v1 navigation only as clearly unavailable future destinations. Do not present them as usable or sellable before their gates pass.
- Loom is in v1 scope and must not be labelled as a future/unavailable destination.

## LUCIA Store and ownership experience

The approved commercial model is technology ownership through one-time purchases, not a mandatory subscription to retain purchased software.

- Use **LUCIA Store** as the storefront and **My Purchases** for the customer's owned products/capabilities.
- Clearly distinguish free baseline features, paid one-time items, exact product versions, licence terms, compatibility, upgrade options, and third-party recurring fees.
- Purchased items should appear in My Purchases and become available in the workspace only after verified, idempotent payment settlement and authorization.
- Do not imply that domain registration/renewal, paid email, or external-provider fees are included unless the specific item explicitly says so.
- Until security, payment verification, audit, and tenant-isolation gates pass, Store/checkout/discount redemption/entitlement activation must remain disabled or clearly unavailable.

## Loom community experience

Loom should combine the structured collaboration and project clarity associated with GitHub with the social discovery and human activity of Facebook, while remaining an original LUCIA product.

### Desktop composition
- **Left rail:** Loom navigation, followed spaces/communities, saved items, and concise shortcuts.
- **Central feed:** posts, discussions, shared work, announcements, and activity with clear author/context/time and useful content hierarchy.
- **Right rail:** relevant communities, trending discussions, people/topics to follow, and contextual discovery. Do not fill it with noise.

### Mobile composition
- Replace the desktop three-column layout with a focused single-column feed and compact navigation.
- Move discovery and community lists into deliberate panels or tabs; keep creating, reading, replying, and following easy to reach.
- Preserve context when navigating back from a post or discussion.

### Loom interaction rules
- Make creating a post, replying, reacting, following/unfollowing, saving, searching, and joining/leaving available only when the action is genuinely implemented and authorized.
- Clearly distinguish public, community-only, private, and restricted content; never expose content across access boundaries.
- Use meaningful empty/loading/error states and preserve composed text after recoverable failures.
- Avoid engagement tricks, fake activity, placeholder metrics presented as real, and decorative controls that do nothing.

## Acceptance checklist

A design review is not complete until:
1. The core create/edit/preview/save/publish journeys are tested at desktop and mobile widths.
2. Loom navigation, feed, discovery, post detail, and core interactions are backed by real routes and authorized data/actions.
3. Keyboard/focus, contrast, reduced motion, and narrow-screen behaviour are checked.
4. Every visible control is exercised; no dead buttons or misleading success states remain.
5. Visual consistency is reviewed across loading, empty, success, error, and unavailable states.
6. Browser/database and tenant-isolation checks pass for any persisted or community-facing functionality.
7. Design polish does not bypass security, persistence, or release gates.

## Current implementation note

The repository has foundations for website rendering, editor previews, and version-history work, but Loom's dedicated community destination is a separate deliverable. Documentation and shared rendering primitives do not count as a completed Loom community UI. Track the implementation and acceptance evidence in the 30-phase roadmap and phase-specific pull requests; do not mark a phase complete based on this document alone.
