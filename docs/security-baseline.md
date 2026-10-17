# Security Baseline

This document defines requirements, not a claim that all controls are already implemented.

## Authentication and sessions

- LUCIA Secure/Core is the identity authority; never create a parallel LUCIA OS password system.
- Use a verified authorization-code flow with exact registered callback URLs and server-side code exchange.
- Validate state and applicable issuer/audience/nonce/expiry claims.
- Use Secure, HttpOnly cookies and an appropriate SameSite policy; rotate or invalidate sessions correctly.
- Never pass access tokens in query strings, browser storage, analytics, or logs.
- Reject open redirects; allow only validated local destinations or explicitly registered return URLs.

## Authorization and tenancy

- Enforce permissions on every server action, route handler, API endpoint, file operation, and background job.
- Resolve membership from trusted server-side state; never trust client-supplied roles, organisation IDs, subdomains, or portal names.
- Scope every tenant query by immutable organisation ID.
- Use RLS as defence in depth only after transaction-pooling and session-context behaviour has been designed and verified.
- Custom roles can only grant permissions the assigning user is authorised to grant. Organisation roles cannot grant platform staff powers.
- Revocation must affect subsequent operations, including requests from existing browser sessions.
- Staff support access must be purpose-limited, justified, time-bounded where feasible, and audited.

## Sensitive actions and audit

Audit authentication/security events, membership and role changes, ownership transfer, domain changes, publishing actions, billing state changes, refunds, exports, and staff access. Avoid recording passwords, tokens, payment secrets, or unnecessary sensitive content.

Require explicit confirmation and stronger checks for ownership transfer, refunds, security configuration, and high-impact access changes. Ownership transfer requires a verified recipient and an auditable confirmation.

## Inputs, files and web content

- Validate and normalize input server-side; use parameterized ORM queries.
- Apply CSRF protection where applicable, rate limits, abuse controls and safe error messages.
- Restrict uploads by size, content type and actual file signature where feasible; use generated object keys and tenant-scoped authorization.
- Escape untrusted content appropriately; sanitize allowed rich text and defend against stored XSS.
- Protect forms against spam and abuse; apply retention and export controls.
- Keep secrets in managed environment variables; rotate compromised credentials.

## Billing safety

- Treat provider webhooks as untrusted until signature/authenticity checks pass.
- Verify payment status server-side and make webhook processing idempotent.
- A redirect or client message must never activate paid entitlements by itself.
- Keep provider credentials server-only and redact them from logs.
- Separate LUCIA subscription records from transactions made by tenants' own customers.

## Release gate

Before production launch, demonstrate cross-tenant denial tests for reads/writes/deletes/media/forms/exports; auth callback and session tests; permission-escalation tests; payment replay/forgery tests; backup restore evidence; and secure environment separation. Any unresolved critical isolation or authentication defect blocks launch.
