# Repository Instructions for Codex

## Architecture source of truth

For all Lucia OS architecture, platform-boundary, website-builder, Studio, graph, composition, rendering, media, blogging, commerce, subscription, domain, publishing and migration work, read:

- `docs/LUCIA-OS-MASTER-ARCHITECTURE.md`

This document records the agreed target architecture. It is a blueprint, not proof that the described systems already exist and not blanket authorisation to implement them.

## Required working method

1. Inspect the current branch and working tree before editing.
2. Read the relevant architecture sections and inspect the existing implementation before proposing changes.
3. Report current state separately from target state; do not assume historical audits remain current.
4. Make small, reviewable, dependency-ordered changes. Do not implement the entire roadmap in one task.
5. Preserve compatible existing backend infrastructure, but do not preserve the old editor interface as the foundation of the new Lucia Studio.
6. Keep one canonical website graph. Do not introduce competing permanent website representations.
7. Core website creation, composition, editing, validation and rendering must not depend on AI.
8. Keep canvas coordinates separate from website layout properties.
9. Reuse media through stable asset IDs; keep binary files in object storage and metadata/references in the database.
10. Enforce tenant isolation and subscription entitlements on the server.
11. Protect customer data during subscription expiry, migration and deletion workflows.
12. Do not silently discard legacy data or unsupported website features.
13. Follow existing repository conventions for TypeScript, Next.js, Drizzle, Zod and tests unless a reviewed architecture decision changes them.
14. Run relevant tests and checks; report exact commands and outcomes. Never claim unrun checks passed.
15. Do not perform destructive database, billing, domain, deployment, production or live-site changes without explicit approval.
16. If requirements conflict with the blueprint or are materially ambiguous, stop and ask for clarification.

## Scope and authorisation

A request to inspect, audit, document or plan does not authorise implementation. A request to implement one feature does not authorise unrelated refactors or broad roadmap execution. Keep changes limited to the requested scope.
