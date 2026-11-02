# Phase 15 scheduled worker operations

The durable article queue and customer-media reconciliation are invoked by
`.github/workflows/phase15-scheduled-workers.yml` every five minutes. The
workflow runs from the repository's default branch and calls the production
LUCIA OS endpoints:

- `GET /api/cron/publish-articles`
- `GET /api/cron/reconcile-media`

## Authentication boundary

The workflow requests a short-lived GitHub Actions OIDC token with audience
`lucia-os-phase15-workers`. The application verifies the token signature
against GitHub's published signing keys and checks the issuer, audience,
repository, repository owner, subject, default-branch ref, exact workflow
path, event type and token lifetime. Tokens from pull requests, forks,
other repositories, other workflows or non-default branches are rejected.
No static GitHub Actions secret is required. The existing `CRON_SECRET`
comparison remains supported for controlled legacy/manual operations.

## Scheduling and retries

Vercel Hobby cron supports only once-daily execution and up to hourly timing
precision. That is not suitable for the durable scheduled-article queue or
two-hour stale-upload recovery, so the Vercel cron declarations are removed.
GitHub Actions supplies a five-minute best-effort trigger; it is not an
exact-to-the-minute SLA. Each worker processes bounded batches, and the
database state is authoritative: due articles remain queued on failure,
publication is idempotent, and failed media cleanup retains its reservation
for a later retry.

Scheduled workflows run only from the default branch. The recurring production
worker therefore becomes active after this implementation is merged to
`main`. Preview builds do not run production maintenance jobs.
