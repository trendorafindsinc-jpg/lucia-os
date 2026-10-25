# Phase 25 — Unified workspace and navigation

## Scope

The v1 workspace should make the primary supported workflows easy to find and should preserve organisation context across the user's work. Overview, Websites, and Domains now share the same primary navigation structure. The navigation links must lead to working destinations; unfinished future-version products must not look active.

## v1 destinations

- **Overview** — organisation membership and a concise workspace summary.
- **Websites** — durable website list and entry to create/edit, domains and publishing.
- **AI Studio** — website creation and AI proposal entry through the existing setup flow. Do not imply that an AI action succeeded until its result is returned.
- **Loom** — the existing website template/design library at `/templates`.
- **Plan & Billing** — the existing billing workspace at `/billing`.
- **Domains and Publishing** — contextual tools linked to a selected website where possible.
- **Help & Support** — existing support route.

## Future destinations — unavailable in v1

Store, Portals, and Business Admin are intentionally not v1 features. If shown in navigation, each must be visibly labelled **Unavailable in v1** and must not link to unfinished workflows, accept orders, collect data, or imply that the product is available. The current UI uses non-interactive status labels rather than fake links.

## Acceptance checklist

- [x] Organisation overview, website list, and domain management have a shared, consistent set of primary destinations.
- [x] AI Studio and Loom point to existing routes (`/create` and `/templates`); Plan & Billing points to `/billing`.
- [x] Store, Portals, and Business Admin are visibly unavailable and not clickable.
- [x] The existing responsive workspace navigation styles collapse to a horizontal, scrollable strip on narrow screens.
- [x] The links use real Next.js routes and retain standard keyboard focus treatment.
- [ ] Browser verify every destination and confirm click-to-result behaviour on desktop and mobile.
- [ ] Verify current organisation context is clear when the user belongs to multiple organisations.
- [ ] Verify the deployed production build after the deployment rate limit clears.

## Evidence boundary

Code review can confirm the route targets, labels, and responsive CSS rules. It does not prove live browser behaviour, accessibility with assistive technology, or deployment health. Those remain beta checks. This phase does not enable Store, Portals, Business Admin, checkout, or any production financial operation.
