# LUCIA OS staff and tenant-owner panels — three-phase delivery

## Phase 1 — Secure foundation (completed; CI passed and merged to main)
- Add explicit local staff grants, tenant support cases/messages, and platform audit event storage.
- Add database-backed, fail-closed access policy helpers for staff permissions and tenant membership.
- Add migration, indexes, support-message/case tenant isolation policies, and policy unit tests.
- No production migration is run automatically. Review and CI must pass before continuing.

**Exit gate:** lint, typecheck, tests and build pass; migration review confirms that no existing customer data is altered.

## Phase 2 — Premium management UI (in progress)
- Add a protected LUCIA Staff workspace with database-backed recent support cases and live queue summaries.
- Add a tenant-owner workspace with active organisation memberships and database-backed website, invoice, and support-case summaries.
- Use responsive navigation, accessible controls, clear empty states, and plain-language copy; unimplemented areas are visibly marked for Phase 3 rather than presented as working controls.
- Hide privileged navigation unless the server confirms the required access; page hiding is not a security boundary.

**Exit gate:** mobile and keyboard checks pass; every visible action is either wired to a protected server operation or clearly marked unavailable without presenting a fake control.

## Phase 3 — Real workflows and production hardening
- Implement case creation, replies, internal notes, assignment, priority/status transitions, resolution, and case history.
- Implement authorised member/role management and staff-grant administration with step-up confirmation for high-impact changes.
- Record sensitive actions and staff support access in audit events; apply safe input handling, rate limits, and upload controls if attachments are added.
- Add integration/E2E tests for cross-tenant denial, staff-vs-tenant boundary, revoked access, internal-note privacy, audit recording, and billing state.
- Verify backup/restore and production environment configuration.

**Exit gate:** all security acceptance tests and standard CI pass. No release or production migration until the gate is satisfied.

## Fixed boundaries
- Repository: `trendorafindsinc-jpg/lucia-os` only.
- LUCIA Core is the authentication/identity authority only. LUCIA OS owns its local organisations, memberships, roles, staff grants, support workflow, audit records, and billing.
- Never infer staff access from tenant membership or accept roles/tenant scope from the browser as authority.
