# Workspace Architecture Contract (pre-UI)

**Status:** Proposed implementation contract for Phase 1/Phase 2 planning; no UI implementation approved by this document alone.  
**Authority:** Subordinate only to [LUCIA OS Product Vision](lucia-os-product-vision.md) and the [30-phase roadmap](implementation-roadmap-30-phases.md).  
**Purpose:** Define the architecture and behavioral contract before replacing the current signed-in organisation dashboard.  
**Design constraint:** Do not copy the rejected workspace redesign in PR #86. Use original LUCIA visual language; Apple products are interaction references only, not branding or screen templates.

## 1. Core concept

The signed-in workspace is a **device-adaptive app-launch environment**, not a marketing page and not a dashboard-first admin panel. It gives the customer one coherent place to launch Website Engine, Layouts, Loom, available installed apps, and Settings.

The workspace shell is presentation and navigation. It is not an authorization boundary. Every protected route and data operation keeps its current server-side authentication, local membership/permission checks and tenant scoping. LUCIA Core/LUCIA ID authenticates the identity; LUCIA OS decides what the user may access.

## 2. Route and module boundaries

### Proposed route responsibilities

- `/workspace`: authenticated workspace home/app launcher; signed-out users are sent through the existing LUCIA ID login flow with a safe return-to path.
- `/workspace/websites`: existing website projects and drafts.
- `/create`: standard free Website Engine create flow. The entry must work without AI/provider configuration.
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

Use a typed, centralized route/app registry for labels, icons, status and destinations. The registry is not a permissions source; the server remains authoritative.

## 4. Device-specific compositions

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

## 5. Navigation and app registry contract

Initial visible destinations:
1. **Overview** — workspace home/app launcher.
2. **Website Engine** — free create/manage/edit/publish.
3. **Layouts** — browse website designs; selecting one feeds the same Website Engine create/edit pipeline.
4. **Loom** — independent professional network; until the route is implemented on main, label it unavailable rather than linking it to the catalogue.
5. **LUCIA Store** — unavailable until actual Store implementation exists.
6. **Installed apps** — only actual entitled/installed products; no invented inventory.
7. **Settings** — introduce only when the supported settings route/actions exist.

Website Engine must remain usable without buying an app, paid Layout, subscription or AI. Layouts may be free or paid only according to actual product policy; the basic creation/publishing path cannot be paywalled.

For each registry item, record:
- stable internal app key;
- customer-facing label and original icon asset;
- route destination or explicit unavailable reason;
- availability status and entitlement rule if applicable;
- required permission/capability;
- whether website/organisation context is required;
- tests proving launch, denial, and unavailable state.

No future item should be shown as enabled merely because its route string exists.

## 6. Data and authorization flow

1. Request reaches the server-rendered workspace route.
2. Resolve current local session via existing LUCIA ID integration.
3. Query only memberships visible to that local user; never accept arbitrary organisation IDs from browser state as authority.
4. Construct app visibility from implemented product availability and server-authorized entitlements/permissions.
5. Render the app launcher without exposing private cross-tenant counts or records.
6. When a user launches an app, the destination route/API independently repeats authentication, permission and tenant-scope checks.
7. If access is revoked between render and click, the destination denies access safely and shows a useful recovery path.
8. Any preferences (icon positions, selected organisation, theme) require an explicit persistence contract and schema/validation before being represented as saved.

Do not add a database migration for cosmetic layout preferences in the first shell slice unless a tested product requirement requires persistence. First deliver a coherent, functional, keyboard/touch accessible shell with deterministic defaults.

## 7. Interaction rules

- Navigation links use semantic links and work with keyboard, touch, browser back and refresh.
- Buttons are reserved for actions; navigation should not be implemented as inert buttons.
- Every actionable control has a real destination or server action, loading/error/success states, and tests.
- Disabled/unavailable apps use disabled semantics and explanatory copy; they must not look like broken active icons.
- Loading states reflect actual asynchronous work. No fake timers, fabricated notifications, simulated counts or premature “saved” messages.
- Motion is brief, purposeful, non-blocking, and respects `prefers-reduced-motion`.
- Color is not the only indicator of active state, verification, availability or errors.
- Focus indicators, screen-reader names, heading hierarchy, contrast and keyboard order must be verified.

## 8. CSS and component strategy

- Keep the current global CSS stable initially; do not append another large, broad redesign block to `src/app/globals.css`.
- Prefer a scoped workspace stylesheet or CSS module and small component styles; use named design tokens for surfaces, spacing, typography, radii, focus, and motion.
- Avoid global selectors that unexpectedly change the public website renderer, editor, Loom, forms or published customer sites.
- Preserve the existing public site and editor styles; shell CSS must not bleed into customer-rendered pages.
- Avoid Unicode glyphs as final app icons. Use a documented original icon set/component abstraction so assets can be swapped without changing routes.
- Do not add dependencies until native CSS/React primitives are insufficient and the need is justified.

## 9. Acceptance gates before visual implementation is considered complete

### Behavior
- Signed-in user sees the workspace, not the public welcome page.
- Signed-out user can reach LUCIA ID login and safely return to the workspace.
- Zero/one/multiple membership states are honest and usable.
- Every enabled icon opens the correct destination and preserves necessary context.
- Layouts never route to Loom; Loom never aliases to the catalogue.
- Store, Portals and Business Admin remain unavailable in v1.
- Website Engine create/edit/preview/publish remains free and independent of AI/provider uptime.
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

## 10. Delivery boundary

This contract defines architecture and acceptance; it does not approve a visual design or implement UI. The next code change should be a narrow workspace foundation slice: typed app registry + shared shell + responsive layout, backed by route/component tests. Do not include Loom implementation, Store commerce, Portals, Business Admin, billing redesign, schema migrations, or global CSS redesign in that slice.
