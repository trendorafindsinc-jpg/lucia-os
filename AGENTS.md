# Codex / AI Agent Operating Instructions

Before changing code in this repository, read these files in order:

1. `docs/lucia-os-product-vision.md` — canonical founder-approved product direction.
2. `docs/implementation-roadmap-30-phases.md` — sequential delivery and acceptance gates.
3. `docs/architecture.md`
4. `docs/engineering-standards.md`
5. `docs/security-baseline.md`
6. The relevant focused specification, including `docs/website-engine-blueprint.md` where applicable.
7. Relevant code, tests, migrations, active branches/PRs, and current Git status.

The former `docs/unified-platform-blueprint.md` is retained as a historical pointer. It is not an independent product authority. The canonical product vision and current roadmap supersede conflicting assumptions in older phase-specific documents; reconcile any conflict before implementation rather than following stale wording silently.

## Required working method

- Begin with Section 1: the signed-in, device-adaptive workspace. The signed-out welcome page is not the first task.
- Audit actual code, tests, active branches/PRs, and behaviour before implementation. Identify the unwanted workspace design direction; do not treat it as approved just because it exists.
- Work one phase at a time. Provide a concise baseline, exact phase, gaps, likely files/areas, risks, and acceptance checks.
- Keep changes narrow. Do not refactor unrelated systems or silently pull later sections into the current phase.
- Every visible control must have real behaviour from UI event through validated server/API action to persisted result and updated UI. No dead buttons, fake progress, fabricated data, or premature success.
- Test negative cases, tenant isolation, permission denial, retries, partial failure, and recovery—not only happy paths.
- Record actual commands/checks and outcomes. If a test was not run, say so.
- Keep existing customer websites, data, purchase records, and live versions safe.
- LUCIA Core / LUCIA ID provides global authentication only. LUCIA OS owns local organisation membership, permissions, product data, purchases, and entitlements.
- Enforce authorisation and tenant scope on server actions, APIs, rendering, assets, background jobs, webhooks, and exports. Never trust client-selected tenant IDs or hostnames.
- Roles, paid entitlements, payment state, and Loom verification are distinct concepts.
- Standard website creation and publishing are free. Do not make the basic website flow depend on a subscription, paid Layout, or AI.
- Layouts must be complete, polished, responsive and meaningfully different; a title/copy/colour change alone does not make a distinct Layout.
- Loom is the professional network, never the website design library. Paid status or purchase cannot automatically grant a verified badge.
- Store's default software model is a one-time licence for a specific version with its explicitly defined update period. White-label/resale rights are product-specific. Disclose external/runtime costs.
- Website Blueprints, AI output, and user content are untrusted input. Validate against supported schemas/components; never execute arbitrary generated code.
- Payment and entitlement state must be server-verified, idempotent, auditable, and recoverable.
- Failed save/publish operations preserve the previous known-good live website.
- Do not perform destructive migrations, production resets, DNS/secret changes, or production deployments without explicit approval for that specific action.
- Do not merge to `main` without required verification and explicit merge approval.
- Never claim code changed, tests passed, or deployment/merge succeeded unless tool results prove it.

## Product navigation and section order

1. **Workspace** — device-adaptive signed-in operating environment and app launcher.
2. **Website Engine and Layouts** — free standard website creation/publishing; curated finished designs with meaningful previews.
3. **Loom** — professional discovery, verified membership, discussions, groups, business directory, connections, messaging, collaboration, and trust/safety.
4. **LUCIA Store** — free and paid technology applications, version licences, one-year update window as the proposed standard, major-version upgrades, eligible white-label/resale rights, and purchasable services such as custom domains.

First-class workspace icons include Overview, Website Engine, Layouts, Loom, LUCIA Store, installed applications, and Settings. App visibility/launch must respect availability, permissions, and licences. Portals and Business Admin are not v1 products and must not appear as functional capabilities.

## End-of-session report

Always report:
1. Phase and status.
2. Files changed.
3. Tests/checks run and outcomes.
4. Acceptance evidence and remaining gaps.
5. Risks or blocked decisions.
6. Next smallest safe action.
7. Whether merge/deploy happened (normally no unless explicitly approved).
