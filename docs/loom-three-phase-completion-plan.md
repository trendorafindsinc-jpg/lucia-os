# Loom Community — Three-Phase Completion Plan

**Product:** LUCIA OS / Loom  
**Scope:** Complete the Loom business community experience. This plan contains exactly three delivery phases. Implementation must be judged by working product behavior, not phase labels or documentation alone.

## Product direction

Loom is a first-class LUCIA OS community destination, distinct from the website **Layouts** gallery, LUCIA Store, Portals, and Business Administration. Its experience should combine the structured collaboration and discoverability of GitHub with the social feed, groups, profiles, connections, reactions, comments, and notifications people expect from a mature community product.

The UI should use a premium, polished visual language, with a three-column desktop layout that adapts cleanly to mobile.

### Binding access and trust rules

- Any eligible LUCIA ID user may join Loom.
- Users whose business identity is not yet verified may read public discussions, but cannot publish or use privileges reserved for verified businesses.
- Business verification must rely on formal registration or qualifying domain evidence.
- Automated checks may assist verification; authorised humans decide disputes.
- LUCIA staff have authority to restrict or ban users.
- Enforce permissions and access control on the server, not only in the UI.
- Protect privacy and tenant/data isolation. Do not expose private messages or restricted business information in public feeds, search, or notifications.

## Phase 1 — Foundation and complete interface

### Deliver
- A coherent, premium Loom workspace with responsive three-column desktop layout and mobile adaptation.
- First-class navigation for Home/feed, Discover/Search, Discussions, Groups, Connections, Messages, Notifications, Saved content, and Profile.
- Real page states for loading, empty results, errors, and populated content.
- Community feed and post composer connected to persistent database-backed APIs.
- Core data models and API contracts for profiles, posts, replies, groups, connections, messaging, notifications, saved content, reports, and verification state, with safe migrations.
- LUCIA ID session integration and initial server-enforced read-only access for unverified users.

### Exit criteria
- Main feed loads real persisted posts and the composer creates a post only for an authorised user.
- Navigation destinations are real routes with useful states, not dead links or decorative controls.
- Unverified users can read public discussions but cannot publish through direct API calls.
- Schema changes are migration-backed and preserve existing production data.

## Phase 2 — Working community features and trust

### Deliver
- End-to-end create, edit/delete where authorised, comment, threaded reply, react, and share workflows.
- User/business profiles and business identity verification with registration/domain evidence.
- Discover/search, groups and discussions, connections, messaging, notifications, and saved posts.
- Reporting and blocking/restriction workflows, moderation queue/actions, and staff controls to restrict or ban accounts.
- Consistent access checks for public, member-only, verified-business, private-message, and staff-only data.
- Abuse-resistant input validation, rate limiting where appropriate, safe rendering, and privacy-preserving API responses.

### Exit criteria
- Each delivered feature completes its real user workflow and persists changes.
- Server-side tests prove unauthorised users cannot bypass verification or access restrictions.
- Reports and moderation actions change access/visibility as intended and are auditable.
- Search and notifications never leak content the recipient is not allowed to see.

## Phase 3 — Stabilise, document, and deliver

### Deliver
- Resolve integration bugs and polish desktop/mobile layouts, accessibility, loading/error/empty states, and interaction feedback.
- Add and run automated tests for critical user journeys, authorisation, verification, moderation, and data isolation.
- Review migration safety, session handling, privacy boundaries, and production configuration without performing unapproved destructive migrations or production changes.
- Update Loom documentation with implemented capabilities, exact test commands/results, known limitations, and any external blockers.
- Prepare the completed change for merge to `main` only after available checks pass; do not report a build, deployment, or merge as successful without evidence.

### Exit criteria
- Available automated checks pass, or remaining external blockers are explicitly evidenced and reported.
- No known critical access-control, privacy, or data-isolation defect remains unaddressed.
- Documentation matches the code and observed test results.
- Delivery report separates completed functionality, tested functionality, deployment status, and anything still blocked.

## Delivery rules

1. There are exactly three phases; do not split the work into additional phases.
2. Do not ask the user to repeat requirements already captured here or in the project conversation.
3. Prioritise implementation and end-to-end working behavior over repeated planning, status-only reports, or unnecessary manual verification requests.
4. Do not claim a feature works merely because a UI element, schema, route, or document exists.
5. Do not bypass security, access-control, migration-safety, or data-integrity requirements to make a phase appear complete.
6. Keep LUCIA OS Loom work within the existing repository and submit changes through the established branch/PR workflow.

## Implementation status (live tracking)

**Current phase: Phase 1 — Foundation and complete interface. Phase 1 is in progress, not complete.**

### Implemented on the current feature branch
- Responsive Loom feed and navigation, with separate destinations for discovery, groups, profile, saved posts, notifications, and other community areas.
- Database-backed public post feed, post creation, text search, and threaded replies.
- Business verification request/status API; post publishing and replies are denied by the server unless the member has verified status.
- Migration-backed tables for business verification, profiles, groups/memberships, connections, reactions, saved posts, reports, private messages, and notifications.
- Working public group listing/creation, verified-member discovery, connection request/accept/decline APIs, private-message APIs gated to verified members with accepted connections, saved-post APIs, notification read state, profile editing, and post reporting.
- Notifications are emitted for post replies and connection requests.
- Public group listing excludes private groups; private message reads are scoped to the two conversation participants.

### Still required before Phase 1 can be closed
- Run the latest CI checks through lint, type checking, Drizzle migration consistency, unit tests, and production build; fix every failure.
- Complete the remaining navigation surfaces so every advertised destination has a real workflow or a clearly stated limitation.
- Review schema/migration alignment and add focused automated coverage for Loom permissions and key API behavior.

### Remaining Phase 2 work
- Reactions UI/API and group membership/join workflows.
- Complete messaging UI, connection management UI, and notification delivery for all relevant community events.
- Authorised staff verification review queue and moderation actions; blocking/restrictions and report resolution.
- Additional privacy/access-control hardening and automated permission tests.

### Delivery status
No production migration or deployment has been run. Do not call Loom complete until the current branch passes the available checks and the remaining Phase 2 workflows are implemented. The existing PR remains open and unmerged.
