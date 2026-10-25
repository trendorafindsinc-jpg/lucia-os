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

**Current phase: Phase 2 — working community features and trust. Phase 2 is in progress, not complete.**

### Implemented on the current feature branch
- Responsive Loom feed with public search, publishing composer, replies, reporting controls, and post reactions backed by database APIs.
- Business verification request/status flow plus a staff-only verification queue. Approval/rejection requires a database-backed staff grant, creates an audit event, and notifies the requesting member.
- Report review queue with staff permission checks, audited report resolution/dismissal, explicit content hiding for posts/replies/groups/messages, and member restriction records.
- Server-side access checks for verified participation and member restrictions across post creation, replies, reactions, group creation/joining, connection requests, and private messaging.
- Profile editing, verified-member discovery, connection request/accept/decline, saved-post management, notifications/read state, group creation plus join/leave controls, and a private messages interface for accepted connections.
- Private messages are scoped to the two participants; messages are marked read when the recipient opens the conversation.
- Migration-backed tables for community posts/replies, verification, profiles, groups/memberships, connections, reactions, saved posts, reports, messages, notifications, moderation visibility, and member restrictions.
- `/loom/discussions` routes to the live feed rather than remaining a dead navigation destination; `/loom/staff` provides the staff review interface.

### Remaining Phase 2 work
- Complete member-to-member blocking across public feed, search, connections, and messaging; staff moderation now has restrict, remove-access, and lift controls.
- Add complete group discussion content workflows, group detail pages, profile reporting controls, message notifications, connection-accept notifications, and stronger abuse/rate limiting.
- Add automated route-level tests for unauthorised writes, private-message isolation, staff queue permissions, report actions, and restrictions.
- Review verification evidence handling and ensure the staff queue workflow is operational with real authorised staff grants; evidence references are manually reviewed and do not automatically grant access.

### Phase 3 — stabilisation and delivery
- Re-run lint, TypeScript, Drizzle migration consistency, unit tests, and the production build against the final PR head. The earlier successful CI run predates the latest implementation commits and does not certify this head.
- Vercel currently reports a build-rate-limit failure; this is an external deployment blocker, not a passing deployment. No production migration or deployment has been run.
- Fix every current-head check failure before merging. The PR remains open and unmerged.

### Known limitations
- No automated or beta-user acceptance test has been performed against the latest UI.
- Content moderation currently supports hiding posts, replies, groups, and messages. Profile hiding is deliberately rejected because the current profile model has no moderation-visibility field.
- Staff access removal is implemented for Loom APIs; member-to-member blocking and additional abuse/rate limiting remain outstanding.
- Do not call Loom complete until all three phases meet their exit criteria and the final report separates implemented behavior, verified behavior, and deployment state.
