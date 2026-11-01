# Engineering Standards

## TypeScript and application design

- TypeScript strict mode; avoid `any` unless narrowly justified and documented.
- Keep domain logic out of presentation components and route handlers where practical.
- Validate all external input at trust boundaries with schemas.
- Use explicit result/error states; never swallow security, persistence, or payment errors.
- Prefer small modules with clear ownership and typed interfaces.
- Do not expose database records or provider payloads directly as public API contracts.
- Do not include secrets or private customer data in logs.

## Database conventions

- Use Drizzle schema definitions and committed, versioned migrations.
- Use immutable primary identifiers; include organisation scope on tenant-owned records.
- Add foreign keys, uniqueness constraints, indexes and deletion behaviour deliberately.
- Use transactions for multi-record invariants.
- Prefer soft deletion or explicit lifecycle states for customer-facing assets when recovery is required.
- Never run destructive migrations or reset production data without a verified backup and explicit approval.

## UI and accessibility

- Customer-facing language must be plain English; do not show raw JSON, internal IDs, stack traces, or developer-only terms.
- No inert or fake controls. If an action is unavailable, explain why and show a genuine disabled state.
- Responsive mobile-first layouts, keyboard support, visible focus, semantic HTML, and accessible labels.
- Confirm destructive actions and show the impact before proceeding.
- Make saving, publishing, failure, and retry states visible.

## Testing

- Unit tests for domain rules and permission evaluation.
- Integration tests for database constraints, tenant isolation, authentication boundaries, and provider callbacks.
- End-to-end tests for customer-critical journeys as those flows are implemented.
- Add a regression test for every fixed security or data-loss defect.
- Test failure paths, not only happy paths.
- Run formatting/lint, type checks, tests, and production build before proposing merge/deployment.
- Do not claim tests passed unless they were actually run and results inspected.

## Git and releases

- Use small, descriptive commits and phase-scoped changes.
- Do not merge unverified work to main or deploy unfinished features.
- Keep generated files and secrets out of commits.
- Review migration and environment changes separately from UI changes.
- Document acceptance evidence and known gaps at each phase boundary.
