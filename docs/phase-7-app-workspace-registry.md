# LUCIA OS — Phase 7: App and Software Commerce Registry

**Base:** main at 774105664c3a32b62302469dfe1c49bc3381efe0, including Phase 6 PR #122.
**Working branch:** phase-7/app-workspace-registry.
**Delivery status:** Implemented on an isolated branch; subject to CI, preview and browser acceptance. Not merged.

## 1. Repository audit

Read the current product vision, 30-phase roadmap, workspace architecture, Blue Glass design, and Phase 4/5/6 implementation notes. Reviewed the launcher, mobile App Library, Orb, tab state, Lattice, native pane editors, existing SVG artwork, local organization authorization, and one-time software purchase policy.

Prior duplication: app-registry.ts defined six presentation-only app records; desktop.ts independently defined LATTICE_APPS; tabs.ts manually associated routes with app labels; mobile Settings had a separate app tile. Existing website routes, native pane adapters, session dirty-state, Orb movement and tablet split width rules were functioning foundations, not to be replaced.

No verified customer software installation records were found in the audited workspace. Existing Store and Loom remain explicitly unavailable. The website engine has a pre-existing billing facility; it is not a customer-owned commercial software subscription processor.

## 2. Canonical static app registry

src/lib/workspace/app-registry.ts now defines:
- Immutable app ID, compatibility key, name, description, category, system/first-party/commercial classification.
- Original LUCIA SVG icon contract, typed route/local/disabled launch contract, and availability state.
- Workspace mode constraints, optional website/organization context, required permission references, entitlement policy references.
- Split and native adapter declaration, lifecycle, dirty-close requirement and recovery contract.
- Optional software product/version references, allowed only for future commercial apps.

createAppRegistry rejects duplicates, missing icon/name data, malformed app IDs, unsafe app destinations, missing native Split adapters and any claim of an available app without an actual launch action. Public application metadata is deterministic and safe for client-side rendering. It is NEVER a permission or purchase authority.

Current app states:
- Overview: route to workspace, built-in, available.
- Layout Studio: route to websites, first-party, available; native editor pane for Lattice.
- Layouts: compatibility route to templates, first-party, available; native gallery pane.
- loomifyAI: first-party route, available; no unsupported Split embedding.
- Loom and LUCIA Store: planned, disabled, no fake launches.
- Settings: actual mobile App Library local settings action; unavailable as a desktop launcher until Phase 8 implements authenticated settings routing. Settings metadata is not duplicated.

The Home launcher excludes local-only Settings to avoid a dead desktop tile. The mobile App Library displays the registered local Settings action. The Orb resolves its AI destination from the same app registry. All existing SVG art and Blue Glass styling are preserved.

Availability vocabulary includes built-in-available, configuration-required, installed-authorized, not-installed, temporarily-unavailable, access-denied, unsupported-mode and planned. Product availability, granted licence and local workspace capability remain separate. Dynamic installation visibility is reserved for a server-authorized adapter and no installation is invented.

## 3. Lattice, tabs, navigation and state compatibility

desktop.ts retains the only tested explicit native pane adapters: VisualSiteEditor at /editor and TemplateGallery at /templates. NATIVE_PANE_ADAPTERS is the adapter allowlist; LATTICE_APPS intersects it with registry capabilities, taking labels and icons from the registry. A Split capability flag alone can never embed another app.

The existing Phase 6 capability-sized Split/Focus layout, viewport rule, keyboard interactions, draggable ratio, pane snapshots and dirty confirmation remain intact. Unsupported destinations open via normal server-checked routes, not embedded pane content. No iframe policy changes.

tabs.ts keeps route-to-context identities such as website-engine:website:site-id and layouts:catalogue. Recovery derives trusted app IDs/labels from validated saved routes rather than serialized display labels, role claims, installation identifiers or entitlements. Corrupt and duplicate entries and planned app tabs are rejected. Valid tab dirty markers and Lattice user-specific snapshot restoration are preserved; session snapshots do not certify server access, cloud save or payment rights.

Legacy /editor, /templates, /workspace/desktop, /workspace/websites, and existing deeper editor routes are not renamed or removed.

## 4. Commercial software contracts

src/lib/software/contracts.ts introduces pure, typed contracts without live workflows.

| Concept | Scope |
| --- | --- |
| SoftwareProduct | Stable product identity, feature catalogue, branding capabilities, configuration schema reference, deployment modes, licence policy, commercialization modes, maintenance/infrastructure policy |
| SoftwareVersion | Stable purchasable release identity, version number, compatibility, available features, configuration/migration requirements and release/security lifecycle |
| SoftwareLicence | Tenant-specific product/version right, explicit use/branding/subscription/resale rights, maintenance period, revocation, entitlement and optional included-upgrade versions |
| CustomerInstallation | Future tenant-owned running instance with enabled features, customization, product/version/licence reference and authorization scope |
| CustomerDeployment | Future verified website binding, normalized relative route, exact version, reservation and rollback state |
| CustomerMonetization | Future separate owner subscription products, end-user plans/accounts/access, customer payment-provider connection reference, billing/webhook events, revenue and settlement references |

**Business journey:** Discover → Purchase → Customize → Brand → Publish → Monetize → Maintain → Optional Upgrade.

A customer’s one-time payment to LUCIA buys ONLY an explicitly licensed product/version. That customer’s later recurring charges to their end users are a distinct financial relationship. Branding, resale and monetization rights require separate explicit licence flags. Expiration of a maintenance year does not automatically expire an owned version; major upgrades require explicit additional entitlement. Hosting, payment-provider fees and external service bills must be presented separately before sale.

Current capability is limited to validation contracts: software identity, version identity, configuration field types, explicit licence rights, maintenance dates, and deployment path preflight. There is no real checkout, entitlement writer, installation, deployment, webhook processing, revenue accounting or upgrade activation.

validateDeploymentPath normalizes simple relative ASCII paths, denies encoded/traversal/URL inputs, reserved system/auth/staff/routes and known published-page prefix collisions. Later activation MUST check tenant authorization, verified website ownership, existing published content and atomically reserve routing before making an installation live. The current validator alone does NOT activate a route.

## 5. Security and access

LUCIA Core continues to own identity/authentication only. LUCIA OS continues to own server-side tenant membership, access, ownership, website routing and future commerce enforcement. The static registry never grants access. Server-side route and API permissions were not weakened. No third-party code execution, arbitrary external route, secret storage, CSP or iframe changes were introduced. Staff routes remain isolated.

The future installation projection contract accepts only a previously server-authorized summary; it must never be treated as a trusted browser assertion. The current code creates no customer installations. Real cross-tenant installation access and revocation tests belong to the later operational phases where server persistence exists.

## 6. Files

Modified:
- src/lib/workspace/app-registry.ts
- src/lib/workspace/desktop.ts
- src/lib/workspace/tabs.ts
- src/app/workspace/workspace-launcher.tsx
- src/app/workspace/mobile-experience.tsx
- src/components/workspace/assistive-orb.tsx
- src/components/workspace/desktop-workspace.tsx
- src/components/workspace/workspace-tab-shell.tsx

Added:
- src/lib/software/contracts.ts
- src/lib/software/contracts.test.ts
- src/lib/workspace/registry-phase7.test.ts
- docs/phase-7-app-workspace-registry.md

No database migrations or production infrastructure mutations. Existing app keys, links and SVG identifiers remain compatible.

## 7. Verification evidence and limitations

New tests cover unique IDs, naming independence, registration rejection, icon completeness, safe launch destinations, unknown applications, mode/configuration/permission state, UI route metadata and Lattice native adapters, corrupt cached tabs, preserved dirty drafts, cross-tenant installation projection rejection, feature schemas, version identity, licence versus maintenance policy, monetization permissions, reserved path and route conflicts.

Existing launcher, tabs, Lattice, tablet, mobile, routing, tenant access and icon tests remain regressions. Required commands include npm run typecheck, npm run lint, npm test, npm run build, npm run db:check and npm run test:routing:http, with the last HTTP test requiring a running built server. GitHub CI and Vercel preview must be reported for the exact PR head. **No command is represented as passed merely because it is listed here.**

Browser acceptance remains required for authenticated mobile 390px; tablet portrait 768px and 820px; landscape 1024px and 1180px; desktop 1280px and 1440px. Verify launcher/App Library/Orb, disabled entries, Lattice Focus/Split, keyboard/dirty recovery, app routes, authorization denial and no overflow. No physical tablet was available. Browser emulation does not prove real hardware quality.

## 8. Risks, future decisions and Phase 8

The catalogue is static and cannot enumerate purchased apps until later server-authorized installation contracts are implemented. Existing Settings stores wallpaper and Home visibility in localStorage on one device, not cross-device user preferences. Session state is recoverable only within applicable browser sessions. Future production security needs migration/revocation/reconciliation and runtime conflict detection.

Decisions pending for later commercial phases: first niche product, exact licence text and product-by-product monetization rights, maintenance and upgrade exceptions, external infrastructure liability, end-user identity design, customer payment provider choice, atomic route reservation namespace, application deactivation and security withdrawals.

**Phase 8 readiness:** inspect existing local wallpaper/display preference logic; implement a real authenticated settings and organization-context persistence boundary without duplicating LUCIA ID, with user-controlled wallpaper/icon preferences and device-aware defaults. Do not build premature Store checkout or website white-label deployment.

**Merge status:** No merge authorized. Do not merge without explicit approval.