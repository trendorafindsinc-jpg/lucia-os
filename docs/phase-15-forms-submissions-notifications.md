# Phase 15 — Forms, submissions and notifications

## Included
- `/forms` workspace with a typed starter contact form and visitor preview.
- Schema validation for form definitions, field IDs/types, submission records and notification preferences.
- Required-field, email, select-option and unknown-field validation before a demo submission is accepted.
- In-session submissions inbox with new/reviewed/archived status filters and actions.
- Owner notification and visitor confirmation preferences with a clear readiness state.
- Unit tests for schema constraints, input validation, session record creation and notification planning.

## Explicit limits
The workspace is a browser-session prototype. Form definitions, submissions and notification settings are not persisted; refreshing clears them. It does not create a public form endpoint, rate limit requests, store uploaded files, send email, or connect a tenant/website to these forms. The UI must not be used to collect real customer data yet.

A production version requires durable tenant- and website-scoped storage, Core-backed access control, CSRF/origin protection as appropriate, rate limits and abuse controls, retention/deletion policies, server-side validation, notification provider integration, delivery retries, audit events, and end-to-end tenant-isolation tests.

## Safety and regression scope
No database migrations, production deployment, provider credentials, invented Core endpoints or School OS changes.
