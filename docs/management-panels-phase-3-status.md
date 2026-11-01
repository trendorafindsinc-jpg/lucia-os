# LUCIA OS staff and tenant-owner panels — three-phase delivery

## Phase 1 — Secure foundation (completed; CI passed and merged to main)
- Add explicit local staff grants, tenant support cases/messages, and platform audit event storage.
- Add database-backed, fail-closed access policy helpers for staff permissions and tenant membership.
- Add migration, indexes, support-message/case tenant isolation policies, and policy unit tests.
- No production migration is run automatically. Review and CI must pass before continuing.

## Phase 2 — Management UI (completed; CI passed and merged to main)
- Add protected LUCIA Staff overview with database-backed recent support cases and queue summaries.
- Add tenant-owner workspace with active memberships and per-organisation website, invoice, and support summaries.
- Add responsive layouts, empty states, and clear Phase 3 labels for unfinished actions.
- Keep access checks server-side; browser-supplied tenant identity is not trusted.

## Phase 3 — Real workflows and production hardening (in progress)
- Build case creation, replies, internal notes, assignment, priority/status transitions, resolution, and case history.
- Implement authorised member/role management and staff-grant administration with step-up confirmation for high-impact changes.
- Record sensitive actions and staff support access in audit events; apply safe input handling, rate limits, and upload controls if attachments are added.
- Add integration/E2E tests for cross-tenant denial, staff-vs-tenant boundary, revoked access, internal-note privacy, audit recording, and billing state.
- Verify backup/restore and production environment configuration.

**Current Phase 3 work:** introduce shared Zod schemas for support case creation, message bodies, status changes, and assignments, with tests for bounds and invalid values. These schemas are validation primitives only; they do not replace server-side authorization or tenant checks.

**Exit gate:** all security acceptance tests and standard CI pass. No release or production migration until the gate is satisfied.

## Fixed boundaries
- Repository: `trendorafindsinc-jpg/lucia-os` only.
- LUCIA Core is the authentication/identity authority only. LUCIA OS owns its local organisations, memberships, roles, staff grants, support workflow, audit records, and billing.
- Never infer staff access from tenant membership or accept roles/tenant scope from the browser as authority.
