# Phase 9 — Visual website editor

## Delivered
- A responsive `/editor` workspace with editable website name, headline, introduction, call-to-action label and four colour palettes.
- Live preview updates immediately as the draft changes.
- Catalogue template switching, section visibility controls, and accessible up/down section reordering.
- Zod validation for draft fields and unit tests for initial drafts and section ordering.
- Template catalogue remains the source for template metadata and suggested sections.

## Deliberate boundaries
- Drafts live only in React state; they are not persisted, autosaved, or associated with an authenticated account.
- The preview uses generated CSS shapes and text, not real media assets.
- No database writes, Core tenant/membership assumptions, custom domain actions, publishing, or production deployment.
- The preview call-to-action is illustrative. Forms, navigation, revision history, and rollback are later roadmap phases.
- Core remains the authority for identity and access; no Core endpoint is invented.

## Acceptance
- The editor route renders from a valid template query parameter and safely falls back to a catalogue template.
- Controls update the preview, section visibility and order.
- Draft schema and section movement have unit coverage.
- Standard CI (lint, type-check, tests, production build) must pass before merge.
