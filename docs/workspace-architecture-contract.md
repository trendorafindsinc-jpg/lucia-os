# Workspace Architecture Contract (pre-UI)

**Status:** Proposed implementation contract for Phase 1/Phase 2 planning; no UI implementation approved by this document alone.  
**Authority:** Subordinate only to [LUCIA OS Product Vision](lucia-os-product-vision.md) and the [30-phase roadmap](implementation-roadmap-30-phases.md).  
**Purpose:** Define the architecture and behavioral contract before replacing the current signed-in organisation dashboard.  
**Design constraint:** Do not copy the rejected workspace redesign in PR #86. Use original LUCIA visual language; Apple products are interaction references only, not branding or screen templates.

## 1. Core concept

The signed-in workspace is a **device-adaptive app-launch environment**, not a marketing page and not a dashboard-first admin panel. It gives the customer one coherent place to launch Layout Studio, Layouts, Loom, available installed apps, and Settings.

The workspace shell is presentation and navigation. It is not an authorization boundary. Every protected route and data operation keeps its current server-side authentication, local membership/permission checks and tenant scoping. LUCIA Core/LUCIA ID authenticates the identity; LUCIA OS decides what the user may access.

## 2. Route and module boundaries

### Proposed route responsibilities

- `/workspace`: authenticated workspace home/app launcher; signed-out users are sent through the existing LUCIA ID login flow with a safe return-to path.
- `/workspace/websites`: existing website projects and drafts.
- `/create`: standard free Layout Studio create flow. The entry must work without AI/provider configuration.
- `/templates`: preserve as a compatibility route for the existing catalogue while customer-facing labels migrate to **Layouts**. Avoid breaking old links/bookmarks. A canonical `/layouts` route may be added later with a redirect/alias only after route tests confirm behavior.
- `/editor?websiteId=...`: contextual editor launch with server-side ownership/permission validation; missing, invalid or cross-tenant website IDs fail safely.
- `/workspace/domains?websiteId=...`: contextual domain management. Custom-domain purchase must not be fabricated; domain ownership, payment entitlement and activation remain separate server-verified states.
- `/workspace/team`: membership/people view subject to existing local permissions.
- `/settings` (proposed): do not create a fake settings surface. Add only when profile/security/preferences controls have defined behavior and authorization.
- `/loom` (future route): independent professional network; never alias it to `/templates`.
- Store and installed apps: show only products actually implemented and available. Until Store exists, show a truthful unavailable state, not a working-looking app tile.
- Portals and Business Admin: out of v1 and never presented as functional apps.

Do not move or rename API endpoints as part of the visual-shell change. Existing API contracts are dependencies, not design details.

## 3. Shared shell components

Implement the shell as small, accessible modules rather than copying markup into each page:

- `WorkspaceShell`: authenticated page frame, safe area handling, global layout and responsive composition.
- `WorkspaceHeader`: LUCIA brand mark, current workspace context, profile/menu and essential status; avoid occupying excessive mobile height.
- `WorkspaceNavigation`: route registry, active destination, accessible labels, focus state and breakpoint-specific presentation.
- `WorkspaceAppGrid` / `WorkspaceAppIcon`: icon, title, availability state, destination and launch semantics. Icon art is original LUCIA artwork and independent of route/auth logic.
- `WorkspaceContext`: current selected organisation and, where relevant, selected website; values originate from server-validated memberships and route data.
- `WorkspaceUnavailableApp`: explicit disabled state with reason and future availability; no click affordance unless it opens a real explanation.
- `WorkspaceEmptyState`: honest states for no memberships, no websites, or no installed apps; no fabricated counts or activity.
- `WorkspaceErrorState`: recoverable loading/query errors with retry only when retry is actually wired.
- `WorkspacePreferences`: only after persistence semantics are specified; never pretend local-only changes are saved across devices.
- `WorkspaceTabManager`: owns the app-workspace tab list, active tab, open/activate/close behavior, and safe close flow for dirty work. It stores app keys and validated context identifiers, not trusted permission claims.
- `WorkspaceStateAdapter`: a narrow contract each app can implement to preserve and restore its route, selection, drafts, and editor state. Declare which state is in-memory only and which is durably saved; never claim all state survives reload unless tested.
- `WorkspaceSplitView`: displays two eligible app workspaces on desktop/laptop and capable tablets, with independent navigation, focus, and context. It is unavailable on phone layouts and falls back to the app switcher when either app does not support split view.
- `WorkspaceAssistiveOrb`: compact floating shortcut surface that expands on activation. It may offer launcher, tab switching, and permitted navigation, but is never the only way to navigate and never bypasses route permissions.

Use a typed, centralized route/app registry for labels, icons, status and destinations. The registry is not a permissions source; the server remains authoritative.

## 4. Workspace tabs, state, and split view

### Tab semantics

- A workspace tab represents one app workspace/context, such as Layout Studio, Loom, or an entitled purchased portal. It is not a general-purpose browser tab and does not imply that LUCIA is implementing a browser engine.
- The user can open an app workspace, activate another tab, close a tab, and return to the launcher. Closing a tab must not silently discard known unsaved edits; use the app's dirty-state signal and an honest confirmation/recovery path.
- Switching tabs must not reset an app simply because it became inactive. Each app declares its state adapter and restoration guarantees. Preserve active in-memory state for ordinary switches; durable drafts and reload restoration are guaranteed only where implemented and tested.
- A tab contains stable app identity plus validated context (for example a website ID). Context identifiers are inputs, never authorization. Every destination rechecks identity, local membership, entitlement, permission, and tenant scope on the server.
- Browser back/forward, refresh, direct links, and return-to-launcher navigation remain functional. The tab model must not hijack browser navigation or make a route inaccessible without client-side state.
- Limit tab restoration to safe, validated metadata. Do not put secrets, tokens, sensitive records, or trusted permission decisions in tab state or URL parameters.

### Split view

- Supported targets: desktop/laptop and capable tablets. Phones use a full-screen app switcher instead of side-by-side panes.
- Each pane hosts an eligible app workspace with independent navigation, focus, and validated context. Split view is optional; apps that cannot support the pane constraints open full-screen instead.
- Capability and entitlement checks remain independent for both panes. Split view does not allow an app to access another app's private data, bypass permissions, or assume arbitrary pages can be safely embedded.
- Define responsive minimum pane widths from tested content. When the viewport becomes too narrow or the user rotates a tablet, fall back predictably to a single active workspace without losing the active context.
- Phase 2 defines the contract and seams; Phase 3 designs its visual treatment; Phase 5 implements desktop behavior; Phase 6 implements tablet adaptation.

### Assistive Orb

- A small floating orb is a global shortcut affordance, with compact and expanded states. Its final visual treatment belongs to the UI phases.
- Initial contract: launcher/home, switch open workspace tabs, show the app switcher, and close the expanded menu. Other actions are added only when they have real, permission-aware destinations.
- It must be dismissible, keyboard accessible, screen-reader labelled, touch-friendly, safe-area aware, and respectful of reduced motion. It must not obscure primary actions, trap focus, or be the only navigation method.
- The orb does not impersonate Siri or claim native OS privileges. A future Capacitor wrapper may provide platform-specific integration, but the web implementation must work without native plugins.

## 5. Device-specific compositions

Use shared product concepts but distinct interaction layouts, not one desktop layout squeezed onto all screens.

### Phone (iOS-inspired interaction, original LUCIA design)
- Touch-first app grid with generous targets (target at least 44 CSS px where practical), clear icon labels and safe-area spacing.
- Compact header; avoid persistent wide sidebar.
- Primary navigation through app grid and a small, stable navigation/menu affordance.
- No hover-only actions. Drag to rearrange, if implemented, must have an accessible alternative and must not be required to launch an app.
- Preserve scroll position/context where possible when navigating back.

### Tablet (iPad-inspired interaction, original LUCIA design)
- Deliberate intermediate composition with balanced app grid, optional compact rail/sidebar and useful whitespace.
- Do not simply scale up the phone view or force desktop-density navigation into a narrow viewport.
- Support touch and keyboard input, landscape and portrait orientations.

### Desktop (macOS-inspired interaction, original LUCIA design)
- Spacious desktop canvas, stable top-level navigation and app grid; a side rail may be used if it serves navigation without turning the whole product into a dashboard.
- Keyboard access and visible focus are first-class; hover is enhancement only.
- Respect reduced-motion settings and avoid decorative animation that delays access or harms performance.

Breakpoints are implementation details to be chosen from actual content and tested viewport widths, not copied blindly from Apple. Define tokens and test behavior at the breakpoints, including rotation and narrow desktop windows.

## 6. Navigation and app registry contract

Initial visible destinations:
1. **Overview** — workspace home/app launcher.
2. **Layout Studio** — free create/manage/edit/publish.
3. **Layouts** — browse website designs; selecting one feeds the same Layout Studio create/edit pipeline.
4. **Loom** — independent professional network; until the route is implemented on main, label it unavailable rather than linking it to the catalogue.
5. **LUCIA Store** — unavailable until actual Store implementation exists.
6. **Installed apps** — only actual entitled/installed products; no invented inventory.
7. **Settings** — introduce only when the supported settings route/actions exist.

Layout Studio must remain usable without buying an app, paid Layout, subscription or AI. Layouts may be free or paid only according to actual product policy; the basic creation/publishing path cannot be paywalled.

For each registry item, record:
- stable internal app key;
- customer-facing label and original icon asset;
- route destination or explicit unavailable reason;
- availability status and entitlement rule if applicable;
- required permission/capability;
- whether website/organisation context is required;
- tests proving launch, denial, and unavailable state.

No future item should be shown as enabled merely because its route string exists.

## 7. Data and authorization flow

1. Request reaches the server-rendered workspace route.
2. Resolve current local session via existing LUCIA ID integration.
3. Query only memberships visible to that local user; never accept arbitrary organisation IDs from browser state as authority.
4. Construct app visibility from implemented product availability and server-authorized entitlements/permissions.
5. Render the app launcher without exposing private cross-tenant counts or records.
6. When a user launches an app, the destination route/API independently repeats authentication, permission and tenant-scope checks.
7. If access is revoked between render and click, the destination denies access safely and shows a useful recovery path.
8. Any preferences (icon positions, selected organisation, theme) require an explicit persistence contract and schema/validation before being represented as saved.

Do not add a database migration for cosmetic layout preferences in the first shell slice unless a tested product requirement requires persistence. First deliver a coherent, functional, keyboard/touch accessible shell with deterministic defaults.

## 8. Interaction rules

- Navigation links use semantic links and work with keyboard, touch, browser back and refresh.
- Buttons are reserved for actions; navigation should not be implemented as inert buttons.
- Every actionable control has a real destination or server action, loading/error/success states, and tests.
- Disabled/unavailable apps use disabled semantics and explanatory copy; they must not look like broken active icons.
- Loading states reflect actual asynchronous work. No fake timers, fabricated notifications, simulated counts or premature “saved” messages.
- Motion is brief, purposeful, non-blocking, and respects `prefers-reduced-motion`.
- Color is not the only indicator of active state, verification, availability or errors.
- Focus indicators, screen-reader names, heading hierarchy, contrast and keyboard order must be verified.

## 9. CSS and component strategy

- Keep the current global CSS stable initially; do not append another large, broad redesign block to `src/app/globals.css`.
- Prefer a scoped workspace stylesheet or CSS module and small component styles; use named design tokens for surfaces, spacing, typography, radii, focus, and motion.
- Avoid global selectors that unexpectedly change the public website renderer, editor, Loom, forms or published customer sites.
- Preserve the existing public site and editor styles; shell CSS must not bleed into customer-rendered pages.
- Avoid Unicode glyphs as final app icons. Use a documented original icon set/component abstraction so assets can be swapped without changing routes.
- Do not add dependencies until native CSS/React primitives are insufficient and the need is justified.

## 10. Acceptance gates before visual implementation is considered complete

### Behavior
- Signed-in user sees the workspace, not the public welcome page.
- Signed-out user can reach LUCIA ID login and safely return to the workspace.
- Zero/one/multiple membership states are honest and usable.
- Every enabled icon opens the correct destination and preserves necessary context.
- Layouts never route to Loom; Loom never aliases to the catalogue.
- Store remains unavailable until its real implementation is ready. Portals and Business Admin are future products to be discovered/purchased through LUCIA Store; do not show them as unavailable launcher apps.
- App tabs open one app workspace each; switching does not needlessly discard app state, and closing known dirty work is protected.
- Split view works for two eligible workspaces on desktop/laptop and capable tablets; phone navigation uses an app switcher.
- Assistive Orb opens and closes accessibly, does not obstruct critical controls, and only exposes real permitted actions.
- Layout Studio create/edit/preview/publish remains free and independent of AI/provider uptime.
- Permission revocation, cross-tenant IDs and unauthorized roles fail closed.

### Device/accessibility
- Tested at phone, tablet portrait/landscape, desktop and narrow desktop sizes.
- No horizontal overflow or hidden critical navigation.
- Touch targets, keyboard navigation, visible focus, semantic labels and reduced-motion behavior verified.
- No hover-only controls or animation-blocked navigation.

### Regression/security
- Existing website, draft, domain, team and publish routes continue to work.
- No new client-trusted tenant or permission logic.
- Existing published websites and last-known-good versions remain intact.
- Lint, typecheck, migration consistency, unit tests and production build pass on the exact proposed commit.
- Browser/E2E and tenant-isolation acceptance evidence is recorded separately from build status.

## 11. Delivery boundary

This contract defines architecture and acceptance; it does not approve a visual design or implement the full UI. Phase 2 may implement only narrow, testable foundation seams needed by the approved plan: typed app registry, shared shell/navigation contracts, tab lifecycle/state adapter interfaces, split-view capability declarations, and Assistive Orb action contract. The full visual redesign and device-specific interaction implementation belong to Phases 3–6. Do not include Loom implementation, Store commerce, Portal/Business Admin product implementation, billing redesign, schema migrations, or global CSS redesign in Phase 2.


## 12. Phase ownership and implementation boundary

- **Phase 2:** architecture/contracts and narrow foundation seams for app tabs, app-state preservation, split-view capability, responsive capability detection, and Assistive Orb actions. Do not redesign the visual UI here.
- **Phase 3:** shared visual language and component states for tabs, split view, and orb.
- **Phase 4:** phone workspace and app switcher; no phone split view.
- **Phase 5:** desktop/laptop tabs and split workspace.
- **Phase 6:** capable-tablet composition and split-view fallback across portrait/landscape.
- **Acceptance:** no phase is complete merely because a contract is documented. Record implementation, tests, device evidence, and unresolved limits separately.
