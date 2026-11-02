# LUCIA OS Deployment Environments and Release Strategy

**Status:** Approved architecture; implementation/configuration is a separate rollout task.  
**Approved:** 2026-11-02  
**Repository:** `trendorafindsinc-jpg/lucia-os`

## 1. Decision

LUCIA OS will use **one Git repository and two separately hosted application environments**:

1. **Production** — the stable customer-facing service.
2. **Development / staging** — a persistent, authenticated environment for ongoing engineering, integration, product expansion, and customer-journey acceptance before release.

The environments use the same application codebase but must have independent deployment configuration and isolated data/integrations. This is not a customer-specific deployment model: customers continue using the shared LUCIA OS service.

The production service must remain online while this workflow is introduced. Do not disable, replace, or repoint the customer domain merely because development is active.

## 2. Branch and hosting topology

| Purpose | Git branch | Vercel project | Stable domain |
| --- | --- | --- | --- |
| Customer production | `main` | Existing `lucia-os` project | `https://os.lucia.name.ng` |
| Integration and acceptance | `develop` | Separate `lucia-os-staging` project | Proposed: `https://staging-os.lucia.name.ng` |
| Individual tasks | `feature/*`, `fix/*`, `upgrade/*`, `docs/*` | Temporary Preview deployments | Vercel-generated preview URLs |

The staging hostname is a proposed target, not a claim that DNS or Vercel domain assignment is already configured. Confirm availability and configure it during the staging rollout.

### Branch responsibilities

- **`main`** is the production release line. Only reviewed, accepted release changes and urgent production fixes belong here.
- **`develop`** is the persistent integration line. It receives completed feature/fix branches and is deployed to the stable staging domain.
- **Task branches** are short-lived and scoped to one coherent change. Their Preview deployments are useful for isolated review, but are not a substitute for the persistent staging environment.
- Keep `develop` after merges. Do not delete it as though it were a temporary feature branch.

Create `develop` from the latest verified `main` commit at rollout time. Do not create it from an outdated historical commit or an unverified deployment.

## 3. Environment isolation

The staging Vercel project must not share production credentials or customer data.

| Concern | Production | Staging |
| --- | --- | --- |
| Database | Production Neon branch/database | Separate Neon branch/database with staging-only data |
| Authentication | LUCIA Core production configuration | Explicitly configured LUCIA Core staging client/callback allowlist, where supported |
| Payments | Live provider credentials | Provider test/sandbox credentials only |
| Email | Production sender and delivery policy | Test/sandbox delivery or tightly controlled allowlist |
| Object storage | Production bucket and access policy | Separate staging bucket or strictly isolated staging namespace and credentials |
| Webhooks | Production endpoints and signing secrets | Separate staging endpoints and signing secrets |
| Analytics | Production property/stream | Separate staging property/stream where applicable |
| Secrets | Production-only Vercel environment variables | Staging-only Vercel environment variables |

Rules:

- Never copy production secrets into staging, commit secrets, or print secret values in logs.
- Never point staging at the production database or production customer-media bucket.
- Do not copy real customer personal data into staging. Use synthetic or explicitly sanitized fixtures.
- Keep storage permissions least-privilege and bucket/namespace restricted. Do not weaken production storage controls to make staging easier.
- Keep payment, email, and webhook side effects in test mode until an explicitly approved production release.
- Staging must identify itself clearly as non-production in its UI and operational metadata.

### LUCIA Core authentication

LUCIA Core remains the sole global authentication authority. This environment split does not create a second identity system or duplicate authentication logic.

Configure staging as an explicitly registered application environment with its own exact callback/redirect origins and logout/return URLs. Do not use broad wildcard redirect allowances. Production callback URLs must remain unchanged. Test that sign-in returns to the correct environment and that sessions cannot be confused across environments.

## 4. Access and customer safety

- Production is public at the official customer domain and remains the canonical customer service.
- Staging and its deployment URLs must be protected by Vercel SSO/password protection or an equivalent approved access-control layer.
- Only authorised staff, reviewers, and invited acceptance testers should access staging.
- Keep Preview protection enabled for non-public work. Do not disable protection to work around a login or preview-access problem.
- Customer-facing links, email templates, OAuth callbacks, payment callbacks, canonical URLs, and public website publishing must never accidentally point to staging.
- Staging must not send real customer notifications, charge real payment methods, publish to customer-owned domains, or mutate production records.

## 5. Standard development and release workflow

1. Start a task branch from the current `develop` branch.
2. Implement one focused change and add/update tests and documentation.
3. Open a pull request targeting `develop`.
4. Require review and relevant automated checks before merge.
5. Merge the accepted task into `develop`.
6. Deploy the `develop` branch to the persistent staging project/domain.
7. Run the relevant regression tests and genuine customer-journey acceptance on staging. Record the commit SHA, deployment URL, test results, and any known limitations.
8. When the release is accepted, open a release pull request from `develop` to `main`.
9. Run the full production release checks and review database migration compatibility, environment configuration, security, accessibility, and rollback readiness.
10. Merge the approved release into `main`. The production Vercel project deploys the production branch to `https://os.lucia.name.ng`.
11. Verify the exact production deployment and critical customer journeys after release. Record evidence against the released commit.

A successful build is necessary but does not, by itself, prove customer acceptance. Do not describe a feature as accepted merely because it merged or deployed.

## 6. Production hotfix workflow

For an urgent production defect:

1. Branch from the current production `main` commit using `hotfix/*`.
2. Implement the smallest safe correction and add regression coverage.
3. Open a pull request into `main`; run the required production checks and obtain release approval.
4. Deploy and verify the production fix.
5. Merge or back-port the same fix into `develop` immediately so staging does not regress or later reintroduce the defect.

Do not make unrelated feature changes part of an urgent hotfix.

## 7. Release and database discipline

- Use release tags for identifiable customer releases (for example, `v1.0.0`, `v1.1.0`, and `v2.0.0`) once the release/versioning convention is adopted.
- Database changes must be backward-compatible across the deployment transition whenever practical: expand schema, deploy compatible application code, migrate/backfill safely, then remove obsolete schema in a later release.
- Do not assume a code deployment and database migration are one atomic transaction.
- Migrations must be tested against staging data before production.
- Backups, migration recovery, and rollback behavior must be considered before any destructive schema/data operation.
- A code rollback does not automatically reverse a database migration or external side effect.

## 8. Vercel project configuration plan

The intended Vercel configuration is:

### Existing production project

- Keep project `lucia-os`.
- Keep `main` as its production branch.
- Keep `os.lucia.name.ng` and existing customer website hostnames assigned to production.
- Do not change the production branch, detach customer domains, or disable production auto-deployment as part of ordinary staging setup.

### New staging project

- Create a separate Vercel project named `lucia-os-staging` connected to the same repository.
- Set its production/deployment branch to `develop` (the stable staging branch for this project).
- Assign the approved staging hostname after DNS and domain ownership checks.
- Configure staging-only environment variables and integrations.
- Enable access protection for the staging domain and Preview deployments.
- Verify the project root, build command, framework settings, Node.js version, deployment hooks, and environment variable scopes match the application requirements without copying production secrets.

If the Vercel plan/project capabilities make a second project or custom environment unavailable, stop and present the limitation and options before changing the production project. Do not silently substitute a weaker isolation model.

## 9. Rollout sequence and safeguards

This document records the approved target architecture. It does **not** mean that the staging branch, second Vercel project, domain, databases, credentials, or access controls have already been created.

Perform rollout in this order:

1. Verify the current `main` commit and its production deployment.
2. Create `develop` from that verified `main` commit.
3. Create and configure the separate staging Vercel project.
4. Provision isolated staging database, storage, authentication callbacks, payment/email test configuration, and secrets.
5. Assign and protect the staging domain.
6. Deploy `develop` and verify sign-in, website creation/editing/publishing in a safe staging tenant, uploads, embeds, and critical customer journeys.
7. Add repository branch rules and required checks for `main` and `develop`, subject to available GitHub plan/permissions.
8. Only after staging is verified, adopt the standard PR/release workflow for ongoing work.

At every step, preserve the existing production service and customer data. If a step cannot be completed safely, leave production unchanged and report the exact blocker.

## 10. Completion checklist

The architecture is fully operational only when all applicable items are evidenced:

- [ ] `develop` exists and was created from the verified production `main` commit.
- [ ] `develop` is the deployment branch for the separate staging Vercel project.
- [ ] Production `main` remains the deployment branch for the existing `lucia-os` project.
- [ ] Production domain and customer website hostnames still resolve to production.
- [ ] Stable staging domain resolves to the staging project.
- [ ] Staging deployment and Preview deployments are access-protected.
- [ ] Staging database and storage are isolated from production.
- [ ] Staging has separate credentials and test-mode external integrations.
- [ ] LUCIA Core staging callbacks are explicitly configured and tested.
- [ ] Branch protections and required checks are active where supported.
- [ ] A task-to-staging-to-production release has been rehearsed with evidence.
- [ ] Production smoke tests and rollback/recovery procedures are documented.

## 11. Operating principle

**Build continuously; release deliberately.** LUCIA OS can continue evolving rapidly in development while customers receive only reviewed and accepted releases from production. Do not freeze customer access to achieve this separation, and do not let routine development merges reach the customer domain.
