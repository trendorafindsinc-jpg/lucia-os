# LUCIA OS — Development and Release Baseline

**Status:** Approved working baseline  
**Applies to:** All LUCIA OS development, including work performed by coding agents  
**Production branch:** `main`  
**Integration branch:** `development` (to be established)  
**Production site:** `https://os.lucia.name.ng`  
**Proposed staging site:** `https://dev-os.lucia.name.ng`

## 1. Purpose

LUCIA OS must ship useful customer-facing improvements quickly without exposing customers to unfinished work or regressions caused by development agents.

The goal is not to maximize the number of checks, reports, CI runs, or deployments. The goal is to deliver the intended product outcome quickly, preserve working functionality, and make releases safe.

This baseline establishes a permanent separation between development, staging, and production.

## 2. Branch and environment model

### `main` — production

- Represents the approved production release.
- Connects to the production deployment at `os.lucia.name.ng`.
- Must not be used for experiments or direct coding-agent implementation.
- Receives changes only through an explicitly approved release from `development`.
- Production data, customer accounts, domains, uploads, and settings must not be used as test fixtures.

### `development` — integration and staging

- Permanent integration branch for completed feature work.
- Connects to a separate staging deployment, proposed at `dev-os.lucia.name.ng`.
- Is the place to combine features and experience the product before release.
- Must use isolated staging data and staging-safe configuration.
- Must not point to production databases, storage buckets, payment credentials, or destructive production services.
- Must authenticate through the existing LUCIA Core identity system using an explicitly registered staging origin and callback configuration. Do not create a second identity system or weaken production origin checks.

### Short-lived task branches

Create an independent branch for each distinct task, for example:

- `feature/blogging-experience`
- `feature/website-generation`
- `feature/layout-studio`
- `fix/published-site-rendering`

Branches may be developed in parallel when their work is genuinely independent. Each task must have a clear scope and must not overwrite another task's changes. If two tasks need to modify the same files or shared interfaces, coordinate their ownership or sequence the work rather than allowing conflicting edits.

Completed task branches are integrated into `development`, not directly into `main`.

## 3. Required delivery flow

```text
Task branch(es)
      |
      v
development
      |
      v
Staging deployment and real product review
      |
      v
Owner explicitly approves release
      |
      v
main
      |
      v
Production deployment
```

1. Start each task from the current agreed base and state exactly what customer-visible outcome is required.
2. Implement only the agreed scope. Do not rewrite unrelated working systems.
3. Integrate completed work into `development`.
4. Deploy the integrated result to staging.
5. The product owner checks the relevant real customer workflow and decides whether the result is acceptable.
6. Only after explicit approval may the release be merged into `main`.
7. Confirm the production deployment and retain a straightforward rollback path.

No coding agent may merge into `main`, promote a production deployment, or treat silence as release approval.

## 4. Speed and verification policy

Verification must support delivery, not become the work itself.

- Prefer a short, targeted check of the changed behaviour over repeated broad verification.
- Do not rerun expensive checks without a reason, such as a relevant code change or a failed result that needs diagnosis.
- Do not spend a day producing verification reports while the requested customer-facing feature remains absent.
- A successful build or CI run is not proof that a customer workflow works.
- A verification claim must identify what was actually exercised and what remains unverified.
- Avoid adding dependencies, infrastructure, abstractions, or test suites unless they are needed for the requested outcome or a concrete risk.
- Keep the implementation focused and deliver a visible, usable result early.

Use risk-proportionate checks:

- **Low-risk visual/content changes:** inspect the affected screen or page and its responsive behaviour.
- **Customer workflows:** exercise the shortest relevant end-to-end path in staging.
- **Authentication, authorization, tenant isolation, payments, data deletion, and storage:** perform targeted security and data-integrity checks appropriate to the change.
- **Release:** perform a concise release-impact check and confirm rollback readiness.

Do not require every small task to undergo a full release-readiness programme.

## 5. Customer experience is the acceptance standard

A feature is not complete merely because code exists, a build passes, or an agent says it is complete.

For website creation and publishing, the relevant acceptance outcome is a real generated and published website with its intended visual layout, styling, navigation, content, and working interface—not a page containing only unformatted words.

For blogging, the outcome is a usable blogging experience, not a stylesheet-like or raw-code presentation.

For every task, state the expected visible result and inspect that result in the staging product. Report honestly if it is incomplete.

## 6. Regression protection

- Preserve existing working behaviour unless the task explicitly changes it.
- Before changing a shared component, identify the customer-facing areas that depend on it.
- Keep changes small enough to understand and reverse.
- Do not combine unrelated refactors with feature delivery.
- Do not delete, replace, or migrate existing functionality simply because an agent prefers a different implementation.
- If a task causes an unrelated regression, stop expanding scope and restore the affected behaviour before proceeding.
- Keep production data isolated from staging and development operations.

## 7. Parallel work rules

Parallel agents are permitted for independent tasks, not uncontrolled simultaneous editing.

Each agent/task must have:
- one named branch;
- one bounded objective;
- an explicit list of files or subsystems it owns where practical;
- a clear completion handoff describing changes and known limitations.

Do not let multiple agents independently redesign the same subsystem. Integrate one coherent change at a time when tasks overlap.

## 8. Release and rollback

A release to `main` requires:
- owner approval of the actual staging result;
- a clear summary of customer-visible changes;
- known limitations disclosed plainly;
- confirmation that production configuration and data are not being replaced by staging configuration;
- a known previous production release or deployment that can be restored if the release causes a serious regression.

If production regresses, prioritize restoring the last known-good release over continuing feature development.

## 9. Non-negotiable operating principles

1. Protect customers before protecting an agent's claimed success.
2. Ship the requested product outcome, not just code and reports.
3. Keep `main` production-only.
4. Integrate task branches through `development`.
5. Use staging for real product review with LUCIA Core authentication.
6. Keep staging data and secrets separate from production.
7. Let the owner approve every production release.
8. Keep verification focused, fast, honest, and proportional to risk.
9. Preserve working functionality; avoid unrelated rewrites.
10. Optimize for delivery speed without sacrificing customer trust.

## 10. Implementation status

This document records the approved operating baseline. It does **not** claim that the `development` branch, staging Vercel environment, staging domain, isolated staging data, or LUCIA Core staging-origin configuration have already been created.

Those infrastructure changes must be implemented deliberately and reported separately. Until they are ready, do not pretend that a preview deployment is an isolated, authenticated staging environment.
