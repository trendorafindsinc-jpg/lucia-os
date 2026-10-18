# LUCIA OS management panels — acceptance contract

Status: requirements locked; implementation is not yet complete.

The staff and tenant-owner experiences are separate workspaces inside the same LUCIA OS application and repository. LUCIA Core is used only for LUCIA ID authentication. Organisation membership, product roles, staff grants, support cases, audit records, and tenant data are owned and enforced by LUCIA OS.

## LUCIA Staff Panel

Required areas:
- Operations overview with real database-backed counts and service/queue status; no fabricated metrics.
- Customer support inbox with case status, priority, category, assignment, replies, internal notes, and a visible history.
- Tenant and website lookup for support purposes, with purpose-limited access and explicit audit events.
- Incident and abuse reports, escalation, resolution notes, and status history.
- Staff accounts, scoped roles/permissions, suspension/revocation, and access review.
- Audit trail for staff actions and sensitive access.
- Clear denial states for users without an active staff grant. Organisation membership must never imply staff access.

## Tenant Owner Panel

Required areas:
- Organisation profile and settings.
- Websites, pages, domains, publishing, forms/enquiries, analytics, and content tools.
- Team invitations, member status, role assignment, and ownership transfer with re-authentication/confirmation where appropriate.
- Organisation subscription, invoices, payment status, and billing history.
- Customer support case creation, replies, attachments where safely supported, and case status tracking.
- Audit/history for meaningful organisation changes.

## Security invariants

- Every tenant operation resolves an active user and an active membership from LUCIA OS's database on the server.
- Every tenant read/write is scoped by immutable organisation ID; client-supplied organisation IDs are locators only.
- Staff access is independent of tenant membership, least-privilege, revocable, and audited. Support access to tenant data must be purpose-limited and logged.
- Never trust client-supplied roles, status, tenant IDs, payment state, or staff claims.
- All state-changing controls must call real server-side operations; do not ship decorative/fake buttons.
- Use CSRF protections where applicable, validation, rate limits, safe errors, and audit records that exclude secrets.
- Customer support replies and uploads must be isolated by case/tenant and protected from stored XSS and malicious files.
- Billing changes must use verified provider events and idempotent server-side settlement; browser redirects cannot mark an invoice paid.

## UI quality bar

- Responsive navigation with clear separation between Staff and Organisation workspaces.
- Accessible keyboard navigation, visible focus, semantic labels, useful empty/loading/error states, and reduced-motion support.
- Plain-English labels, status badges used sparingly, searchable/filterable lists, and confirmation for destructive/high-impact actions.
- Do not expose internal IDs or raw JSON to ordinary users. Provide contextual help and clear next steps.

## Release acceptance tests

- Tenant A cannot read or mutate Tenant B's websites, pages, forms, enquiries, billing, members, or support cases by changing IDs.
- Non-staff users cannot access staff routes or APIs; tenant owners cannot grant themselves staff privileges.
- Revoked membership/staff access takes effect on the next protected operation.
- Staff access to tenant data records actor, purpose, target, result, timestamp, and request/correlation ID.
- Support case visibility, assignment, replies, internal notes, and attachments are correctly scoped.
- Role changes, member removal, ownership transfer, and billing transitions are validated server-side and audited.
- All UI actions have server-side enforcement and tests; keyboard/mobile flows work.
- Lint, type-check, build, relevant unit/integration tests, and cross-tenant security tests pass before merge.
