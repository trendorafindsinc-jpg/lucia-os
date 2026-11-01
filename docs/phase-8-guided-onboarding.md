# Phase 8 — Guided website setup

## Delivered
- A mobile-friendly three-step setup flow at `/create`: organisation details, website goal/design/address suggestion, and a review.
- Selection from the Phase 7 template catalogue, including deep links such as `/create?template=schoolhouse`.
- Friendly input guidance and Zod validation for required fields, template IDs, names and site-slug syntax.
- Automatic address suggestions with an explicit edit option; availability is not claimed or checked.
- A review/preview state that is honest about the current persistence boundary.

## Deliberate boundaries
This phase does not create a tenant, website, account, or database record. The completed setup remains in client memory and is lost on refresh/navigation. The final screen states this clearly. Core currently has no documented tenant discovery/creation endpoint in the consumer contract available to this project, so no endpoint was invented and no local organisation row is treated as proof of authorisation. Durable creation must be connected only after Core's contract and server-side authorization path are documented and tested.

No production database, deployment, payment system, or legacy School OS was changed.

## Validation
- Unit tests cover valid setup, invalid slugs, unknown templates, blank names and slug generation.
- Standard CI checks remain required: dependency installation, lint, TypeScript, unit tests and production build.
