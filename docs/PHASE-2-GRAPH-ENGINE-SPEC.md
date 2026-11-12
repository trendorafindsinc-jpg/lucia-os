# Lucia OS — Phase 2 Graph Engine Specification

> **Document ID:** LUCIA-PHASE-2-GRAPH-001  
> **Version:** 0.1  
> **Status:** Phase 2 implementation specification — Graph Engine persistence increment in progress  
> **Date:** 2026-11-12  
> **Branch:** `development`  
> **Parent:** `docs/LUCIA-OS-MASTER-ARCHITECTURE.md`  
> **Phase 1 authority:** Approved Phase 1 architecture baseline

## 1. Purpose and scope

Phase 2 establishes the canonical, persistent website graph used by Lucia OS. The graph is the authoritative model for website structure and composition. Lucia Studio, composition, validation, rendering, publishing and migration must use this model through explicit contracts.

This specification is the first Graph Engine design deliverable. It proposes a concrete logical schema, node/edge registry, mutation contract, revision model, canvas-state boundary and acceptance-test plan. It is not permission to alter production data or to remove existing website persistence.

### In scope

- Graph identity and tenant/site ownership.
- Versioned node and edge type registries.
- Typed relationships and structural invariants.
- Transactional graph mutation batches.
- Optimistic concurrency and idempotency.
- Immutable graph versions and recoverable restore semantics.
- Separate canvas/editor state.
- Read/query contracts and validation diagnostics.
- RLS, authorization and database integrity.
- Tests and safe adoption alongside existing website persistence.

### Out of scope for this first task

- New Lucia Studio UI.
- Composition recipes and industry intelligence (Phase 3).
- Full rendering and preview implementation (Phase 4).
- Blog post, product, order, billing, domain or media binary schemas.
- Importing or cutting over customer websites.
- Deleting or rewriting legacy tables.
- Production migrations or live-site changes.

## 2. Verified current-state constraints

The current repository is a Next.js 15 / React 19 / TypeScript application using PostgreSQL, Drizzle ORM, Zod 4 and Vitest. The current schema already contains `websites`, `website_pages`, `website_structures`, `website_versions`, and other website-scoped records.

The current editor draft path stores a serialized website definition in the root `website_pages.content`. Published content is stored separately in `website_pages.published_content`. `website_structures` stores a separate serialized structure, and `website_versions` stores labeled snapshots. These are distinct persistence concepts, not a canonical typed graph.

The repository already has organization membership, tenant-scope transaction helpers and RLS migrations. Those controls are useful foundations, but every graph operation must still perform session authentication and explicit action authorization before setting/using tenant database context.

No graph-specific tables or graph operation API were identified in the initial focused repository search. This is a discovery result, not proof that no graph-related helper exists anywhere. Before implementation, inspect the complete current tree and search all relevant symbols and migration history again.

## 3. Core invariants

1. One website has one canonical draft graph identity.
2. Every graph, node, edge, version and operation is bound to the same organization and website.
3. Node IDs are stable across edits and versions; updating a node does not replace its identity.
4. Node properties are JSONB only after validation against a registered, versioned schema.
5. Relationships are typed and validated against a versioned edge registry.
6. A graph mutation batch is atomic: all operations commit or none do.
7. Every mutation supplies the revision it expects to change.
8. Replaying the same idempotency key with the same actor and request returns the recorded result; reusing it for a different request is rejected.
9. Published graph versions are immutable and addressable by stable version ID.
10. Restoring an earlier version creates a new draft revision; it never rewrites operation history or mutates an existing immutable version.
11. Canvas positions, viewport and editor arrangement are not website layout properties and cannot affect public rendering.
12. Cross-tenant or cross-website edges are impossible at both application and database levels.
13. Shared domain data such as blog posts, products and media binaries remains owned by its domain module. The graph stores typed references and presentation relationships, not duplicate copies.
14. Unknown legacy node data is preserved during migration/import as an explicit unsupported payload or migration issue; it is never silently dropped.
15. Core graph operations and validation do not require AI or external model calls.

## 4. Graph identity and relational model

### 4.1 Recommended logical tables

| Table | Responsibility |
|---|---|
| `website_graphs` | One graph aggregate per website; owner scope, schema version, draft revision and active published-version pointer |
| `website_nodes` | Stable graph node identities, type, node schema version, validated properties and lifecycle |
| `website_edges` | Typed relationships between nodes within one graph |
| `website_graph_versions` | Immutable graph snapshots/manifests and version metadata |
| `website_graph_operations` | Append-only mutation batches, idempotency and audit/revision linkage |
| `website_canvas_positions` | Editor-only node positions and lock state, separate from graph content |
| `website_graph_validation_runs` (optional) | Persisted validation result sets if asynchronous or historical diagnostics are required |

These are proposed names and logical responsibilities, not existing tables. Reconcile names and migration conventions with the live schema before writing SQL.

### 4.2 Ownership keys and foreign keys

Use UUID primary identifiers unless the full repository's ID conventions reveal a compelling reason to differ.

Every graph-owned child record should carry `organization_id`, `website_id` and `graph_id` where needed for direct scoped queries. Add unique keys that permit composite foreign keys, for example:

- `website_graphs(organization_id, website_id, id)`
- `website_nodes(organization_id, website_id, graph_id, id)`
- `website_edges(organization_id, website_id, graph_id, id)`

Then enforce:
- Graph → website composite ownership FK.
- Node → graph composite ownership FK.
- Edge → graph composite ownership FK.
- Edge source node → node composite ownership FK.
- Edge target node → node composite ownership FK.
- Version → graph composite ownership FK.
- Operation → graph composite ownership FK.
- Canvas position → graph and node composite ownership FKs.

Use restrictive deletion for graph records where it prevents accidental loss. Website deletion semantics must follow the existing website lifecycle and explicit product policy; do not introduce cascades that erase recoverable graph history without approval.

A graph should be unique per `(organization_id, website_id)` for the initial single-graph-per-website model. If future multi-branch editing is required, introduce explicit branch identity rather than silently creating multiple canonical graphs.

### 4.3 Field-level proposal

**website_graphs**
- `id uuid primary key`
- `organization_id uuid not null`
- `website_id uuid not null`
- `graph_schema_version integer not null`
- `draft_revision bigint not null default 0`
- `published_version_id uuid null`
- `created_at`, `updated_at`
- unique `(organization_id, website_id)`
- unique composite key for child FKs

**website_nodes**
- `id uuid primary key`
- `organization_id`, `website_id`, `graph_id` not null
- `node_type text not null`
- `schema_version integer not null`
- `properties jsonb not null`
- `lifecycle_status text not null` (initially active; soft-delete/tombstone semantics to be defined)
- `created_by_user_id`, `updated_by_user_id`
- `created_at`, `updated_at`
- unique composite key for edge references
- indexes on graph/type and graph/update time; avoid speculative JSONB indexes until query patterns are measured

**website_edges**
- `id uuid primary key`
- `organization_id`, `website_id`, `graph_id` not null
- `source_node_id uuid not null`
- `target_node_id uuid not null`
- `edge_type text not null`
- `schema_version integer not null`
- `properties jsonb not null default '{}'`
- `created_by_user_id`, `created_at`
- unique composite key for edge identity
- indexes for outgoing and incoming traversal
- unique constraint for duplicate relationships only where edge registry declares uniqueness

**website_graph_versions**
- `id uuid primary key`
- `organization_id`, `website_id`, `graph_id` not null
- `version_number bigint not null`
- `graph_schema_version integer not null`
- `snapshot jsonb not null` or a content-addressed immutable snapshot reference if size warrants it
- `checksum text not null`
- `label text`, `notes text`
- `created_by_user_id`, `created_at`
- unique `(graph_id, version_number)`
- immutable after insert; enforce through service permissions and, where practical, database grants/triggers

**website_graph_operations**
- `id uuid primary key`
- `organization_id`, `website_id`, `graph_id` not null
- `actor_user_id uuid not null`
- `idempotency_key text not null`
- `request_hash text not null`
- `base_revision bigint not null`
- `result_revision bigint not null`
- `operation_schema_version integer not null`
- `operations jsonb not null`
- `result jsonb not null`
- `created_at`
- unique `(graph_id, actor_user_id, idempotency_key)`
- indexes for graph/revision and actor/time
- append-only; no ordinary update/delete path

**website_canvas_positions**
- `id uuid primary key`
- `organization_id`, `website_id`, `graph_id`, `node_id` not null
- `editor_user_id uuid not null` if canvas state is per-user
- `x numeric not null`, `y numeric not null`
- `locked boolean not null default false`
- optional `width`, `height`, `group_key`, `updated_at`
- unique `(graph_id, editor_user_id, node_id)` for per-user canvas state

The exact representation of canvas state is an unresolved product decision: per-user positions provide personal workspaces; shared positions provide a common team canvas. The recommended initial approach is per-user state to prevent one editor unexpectedly rearranging another editor's workspace, unless Lucia intends a shared collaborative canvas from day one.

### 4.4 Snapshot policy

Normalized graph rows are the canonical editable representation. A graph version is a complete, deterministic, immutable snapshot used for preview/publish pinning, recovery, diffing and migration verification. Snapshot encoding must be canonicalized before checksum calculation: stable key ordering, stable node/edge ordering, explicit schema versions and no volatile timestamps inside content payloads.

Do not rely on an unbounded snapshot table as the only persistence model. Define snapshot size thresholds and retention after measuring realistic websites. Published versions must not be pruned while referenced by a live deployment.

## 5. Initial node type registry

Node schemas must be discriminated by `type` and `schemaVersion`. The following is the proposed initial registry. Keep the registry extensible, but require a reviewed schema and compatibility policy for each new type.

| Node type | Purpose | Example properties (illustrative) |
|---|---|---|
| `website` | Graph root/site-level configuration | name reference, locale, site settings |
| `page` | A routable page | title, slug/path, SEO reference, visibility |
| `section` | Major page composition region | section recipe ID/version, semantic role |
| `component` | Reusable visual/functional element | component recipe ID/version, content props |
| `design_token` | A design value or token-set reference | token namespace, token key, value/reference |
| `shared_data` | Shared website-level structured content | data schema ID/version, validated value |
| `interaction` | User-triggered behaviour | trigger, action, target, parameters |
| `responsive_config` | Responsive overrides/configuration | breakpoint-keyed validated settings |
| `media_reference` | Reference to a Media Engine asset | asset ID, usage role, crop/focal-point metadata |

Design tokens may ultimately be better represented as a separate versioned registry with graph references rather than one node per token. Keep the initial `design_token` node family provisional until Phase 3 Design Intelligence defines token ownership and inheritance. Likewise, responsive settings may be embedded in a node's schema if they do not need independent identity or relationships. The registry should not create nodes merely for conceptual neatness.

### Node schema requirements

Every node schema declares:
- Stable type identifier and schema version.
- Required and optional properties.
- Defaults and normalization rules.
- Allowed parent/child edge types.
- Data-reference semantics.
- Validation rules and user-facing diagnostic codes.
- Migration function from prior supported versions.
- Renderer capability or explicit non-rendering status.
- Whether node is user-editable, system-generated or both.

Schema changes are forward-versioned. A node's stored schema version is never silently reinterpreted. Migrations must be deterministic, tested and reversible at the graph-version level.

## 6. Typed edge registry and graph rules

Initial edge types:

| Edge type | Source → target | Meaning |
|---|---|---|
| `contains_page` | website → page | Site page membership |
| `contains_section` | page → section | Ordered page section |
| `contains_component` | section/component → component | Component composition |
| `uses_design_token` | renderable node → design_token | Design dependency |
| `binds_shared_data` | renderable node → shared_data | Data binding |
| `references_media` | renderable node → media_reference | Asset usage |
| `configures_interaction` | renderable node → interaction | Behaviour attachment |
| `has_responsive_config` | node → responsive_config | Responsive overrides |

The edge registry must define source and target type allowlists, minimum/maximum cardinality, ordering rules, duplicate semantics, deletion behaviour, whether cycles are allowed, and whether the edge is structural containment or a non-containment reference.

### Structural rules

- Containment relationships form a directed acyclic graph.
- A page belongs to exactly one website graph.
- A section belongs to exactly one page unless a later explicit reusable-section model is approved.
- Component composition must be acyclic and bounded by a configured depth limit.
- Reference edges may point to shared data/media/token/interaction nodes according to their type rules.
- No edge may cross organization, website or graph boundaries.
- Ordered children use an explicit stable ordering property (for example an integer position) with transactional reordering; array order in an unrelated JSON blob is not the relationship authority.
- Deleting a node with dependants must follow edge-specific policy: reject, detach, cascade within the same transaction, or replace with an explicit unresolved reference. No implicit cascade by default.
- A graph must contain exactly one active website root.
- A publishable graph must have at least one valid page and a valid route for every published page.

Cycles in non-containment references require per-edge policy. The validator must detect cycles where they can cause recursive rendering or dependency resolution.

## 7. Mutation and query contracts

These are application-service contracts, not a commitment to REST, RPC or a particular route layout. Inspect existing API conventions before selecting transport.

### 7.1 Read contracts

- `getGraph(websiteId)` → graph identity, draft revision and root metadata.
- `getGraphNodes(websiteId, filters, cursor)` → paginated nodes, optionally filtered by type.
- `getGraphEdges(websiteId, nodeId, direction, edgeTypes)` → typed relationships.
- `getGraphVersion(websiteId, versionId)` → immutable snapshot/manifest.
- `validateGraph(websiteId, revision, scope)` → diagnostics for an exact revision.

Every read must authenticate, authorize `website.read`, establish tenant scope, and return only the requested website's records. Pagination must be deterministic and bounded.

### 7.2 Mutation envelope

Every mutation batch includes:
- `websiteId`
- `expectedRevision`
- `idempotencyKey`
- `operationSchemaVersion`
- `operations[]`
- optional client request/correlation ID

Each operation includes a stable operation type and a typed payload. The server derives actor and organization from the verified session and membership; never trust client-supplied actor or organization IDs.

### 7.3 Operation catalogue

| Operation | Required behaviour |
|---|---|
| `CREATE_NODE` | Validate type/schema, ownership and required parent relationships |
| `UPDATE_NODE` | Validate patch/full replacement semantics, preserve node ID, report changed fields |
| `DELETE_NODE` | Apply explicit dependant policy; prevent orphaned structural graph |
| `CONNECT_NODES` | Validate endpoint existence, same graph, edge type, cardinality and cycle rules |
| `DISCONNECT_NODES` | Remove exact edge; preserve unrelated references |
| `REORDER_CHILDREN` | Atomically update ordering for one declared parent/edge type |
| `MOVE_CANVAS_NODE` | Update editor-only coordinates; never increment website content revision |
| `RESTORE_VERSION` | Create a new draft revision from an immutable prior version |

The initial candidate operation list from the master blueprint did not include `REORDER_CHILDREN`; it is added here because page/section/component ordering is a first-class graph concern. Decide whether reordering is an explicit operation or a constrained `UPDATE_NODE`/edge metadata mutation before API implementation.

### 7.4 Atomicity and concurrency

For a content mutation batch:
1. Authenticate actor and resolve active organization membership.
2. Authorize the required website action.
3. Start a database transaction and set transaction-local tenant context.
4. Lock or compare-and-swap the graph revision.
5. Verify `expectedRevision`; if stale, return a conflict with current revision and no partial writes.
6. Check idempotency key and request hash.
7. Validate all operations against the same candidate graph state, including interactions between operations in the batch.
8. Apply node/edge changes and append the operation record.
9. Increment draft revision exactly once for the batch.
10. Commit and return resulting revision plus affected node/edge IDs.

The database transaction is the atomic boundary. Do not call external storage, payment, DNS, renderer network services or other remote systems while holding the graph transaction open.

Canvas-only operations update canvas state and do not increment content revision or create a publishable website version. Whether canvas changes have their own revision/operation stream is a separate editor-collaboration decision.

### 7.5 Idempotency

- Scope idempotency to graph + actor + key (or a documented tenant-wide key strategy).
- Persist a canonical request hash.
- Same key + same hash returns the stored result.
- Same key + different hash returns a conflict.
- Concurrent identical submissions must converge on one committed operation.
- Idempotency retention must be at least as long as supported client retry/recovery windows; final retention policy is operationally configurable.

### 7.6 Error contract

Use stable machine-readable codes, with safe user-facing messages:
- `GRAPH_NOT_FOUND`
- `GRAPH_ACCESS_DENIED`
- `GRAPH_REVISION_CONFLICT`
- `GRAPH_SCHEMA_INVALID`
- `GRAPH_EDGE_INVALID`
- `GRAPH_CARDINALITY_VIOLATION`
- `GRAPH_CYCLE_DETECTED`
- `GRAPH_DEPENDENCY_EXISTS`
- `GRAPH_IDEMPOTENCY_CONFLICT`
- `GRAPH_VERSION_NOT_FOUND`
- `GRAPH_VERSION_IMMUTABLE`
- `GRAPH_VALIDATION_FAILED`

Do not expose cross-tenant record existence through error detail. Return field paths and diagnostic IDs only after access to the target graph has been authorized.

## 8. Versioning, undo/redo and publishing boundary

- Each successful content mutation batch creates one monotonically increasing draft revision.
- Operation records are append-only and linked to base/result revisions.
- Snapshots are immutable and include schema version, deterministic content, checksum, creator, timestamp and optional label.
- Snapshot creation can be periodic, manual, pre-publish or triggered by meaningful milestones; cadence and retention require measured storage data.
- Undo should create a new inverse operation against the current revision, not erase history.
- Redo should reapply the recorded intent only if its preconditions still hold; otherwise return a conflict requiring user resolution.
- Restore creates a new revision whose graph content matches the selected snapshot; prior operations and versions remain intact.
- Published output pins an immutable graph version ID. Editing the draft cannot mutate a live published version.
- Graph Engine owns graph revisions and snapshots. Publishing Engine owns deployment/release records and runtime rollout/rollback. Do not conflate graph version restore with deployment rollback.
- Published graph versions must remain available while referenced by active or retained deployments.

## 9. Canvas state boundary

Canvas state is editor presentation state, not website content:
- x/y coordinates, optional node dimensions, lock state, grouping/collapse state and viewport.
- Canvas changes never mutate node properties, content revision, published snapshot or renderer output.
- Canvas persistence must be isolated from graph-content mutations and content permission checks.
- The server still authorizes access to the graph and validates node membership before accepting position updates.
- Bound coordinates and dimensions to finite, safe numeric ranges; reject NaN/infinity and unreasonable values.
- Bulk auto-layout should update canvas records only.
- The first implementation should not require real-time collaboration; design the storage boundary so collaboration can be added later without merging canvas state into graph content.

**Decision requiring product-owner confirmation:** whether canvas positions are private per user or shared across all editors in an organization. Recommended initial default: per-user positions.

## 10. Security and tenant isolation

- Reuse the existing verified session, membership and permission services only after rechecking their current contracts.
- Authorization occurs before database access that could reveal whether another tenant's graph exists.
- Every graph table receives organization/website ownership constraints and RLS policies consistent with current migration conventions.
- Runtime database role must not be a superuser, table owner with RLS bypass, or BYPASSRLS role. Verify actual role/ownership in a controlled environment before claiming RLS isolation.
- RLS context is not authentication. Tenant context is set transaction-locally only after session and permission checks.
- Composite foreign keys prevent cross-site edges even if an application bug bypasses a query filter.
- Validate JSONB payloads server-side using the versioned registry. Client validation is convenience only.
- Rate-limit graph mutation batches and cap payload size, operation count, graph traversal depth and validation work.
- Audit actor, organization, website, request ID, operation type, revision and outcome. Avoid logging full private content or secrets.
- Read-only public rendering must resolve an exact active domain/site and immutable published graph version; a host header is not authorization.
- Platform staff access requires a current, scoped grant and audit event, independent of tenant membership.

## 11. Validation model

Validation is deterministic and produces structured diagnostics:
- `code`
- `severity` (error, warning, info)
- `nodeId` and optional `edgeId`
- `propertyPath`
- `message` and remediation guidance
- `validatorId` and `validatorVersion`
- `graphRevision`

Validation layers:
1. Schema validity — known node/edge type and valid property schema.
2. Referential integrity — all referenced nodes/assets/data exist in permitted scope.
3. Structural validity — root, containment, cardinality, ordering, cycles and depth.
4. Composition validity — required recipe/component dependencies and compatible token references.
5. Publishability — routes, required page metadata, supported interactions and no blocking unresolved references.
6. Security/accessibility — safe links/content, semantic structure, required alternative text and supported accessibility checks.

The Graph Engine owns graph-structural validation. Design, rendering, content, accessibility and publishing modules contribute validators through explicit interfaces; do not make the graph persistence layer depend directly on their UI.

## 12. Testing and acceptance criteria

### Unit tests
- Node schemas accept valid properties and reject invalid/unknown versions.
- Edge registry rejects unsupported source/target combinations.
- Cardinality, containment cycles, component cycles and maximum depth are enforced.
- Canonical snapshot serialization is deterministic.
- Restore/undo/redo semantics preserve immutable history.
- Canvas validation rejects invalid coordinates and does not change graph content revision.

### Database/integration tests
- Tenant A cannot read, mutate, connect to, version or restore Tenant B's graph.
- A node cannot be attached to another website's edge.
- Cross-graph edge insertion fails at the database FK level.
- Concurrent writes using the same expected revision result in one success and one conflict, with no partial writes.
- Duplicate idempotent retries return one result; key reuse with different payload fails.
- Failed multi-operation batch leaves no partial node/edge changes and does not advance revision.
- Immutable version rows cannot be modified through normal runtime paths.
- RLS works with the actual non-owner, non-BYPASSRLS runtime role.
- Unauthorized users cannot infer existence of another tenant's graph.

### Contract/workflow tests
- Create a website root, page, section and component; connect and order them; validate and snapshot.
- Update shared data and verify all intended references resolve to the same source.
- Delete a referenced node and verify the configured dependency policy.
- Move and lock canvas nodes; assert graph revision, snapshot checksum and rendered content are unchanged.
- Restore a prior version and verify a new revision is created while earlier history remains.
- Pin a published version and prove later draft mutations cannot alter it.
- Validate paginated reads are stable and scoped.

### Exit gate for Phase 2
Phase 2 is complete only when:
- Node and edge registries are approved and implemented.
- Database schema, constraints, indexes and RLS are implemented and migration-tested.
- Graph service contracts and operation semantics are implemented.
- Revision, idempotency, history and restore are tested.
- Canvas state is demonstrably isolated from website content.
- Tenant isolation and database-level cross-graph protection pass integration tests.
- Existing website persistence remains intact and no cutover occurs without a separately approved migration plan.
- Relevant unit, integration, typecheck and lint commands are run and their outcomes recorded.

## 13. Decisions to confirm before final schema migration

| Decision | Recommendation | Status |
|---|---|---|
| One graph per website initially | Yes; explicit branch model only if later needed | Proposed |
| Canvas positions | Per-user initially | Product approval required |
| Snapshot storage | JSONB initially, benchmark size before alternative | Proposed |
| Reordering | Dedicated `REORDER_CHILDREN` operation | Contract decision required |
| Node tombstones | Soft-delete with explicit restore/retention policy | Contract decision required |
| Design tokens as nodes | Keep provisional pending Phase 3 registry | Deferred |
| Responsive configuration as nodes | Keep provisional; embed if no independent identity needed | Deferred |
| Graph collaboration | No real-time collaboration in first implementation | Proposed |
| Version retention | Preserve all published references; define draft retention after usage measurement | Operational decision required |

Do not block repository discovery on decisions that can safely remain configurable. Do not silently turn proposed choices into irreversible schema constraints.

## 14. Immediate next task

Before implementing migrations, complete a Graph Engine repository compatibility pass:
1. Inspect the complete repository tree on the current target branch and verify branch head/working-tree state.
2. Search all code for website definition schemas, structure adapters, draft/publish APIs, version snapshots, editor recovery and tenant-scope helpers.
3. Confirm Drizzle migration generation workflow and missing snapshot implications.
4. Map exact existing permission names and RLS policies needed for graph routes.
5. Produce a reviewed schema-to-existing-schema mapping and a forward-only migration proposal.
6. Add focused Graph Engine tests for any reusable primitives without changing production persistence.

After that review, propose the first additive migration and service implementation as a separately reviewable task. Do not execute a production migration or switch any website read/write path during this initial design task.

---

**Phase 2 status: IN PROGRESS — Graph Engine contract draft created.**  
**No application code, database schema, production infrastructure, customer content or live websites were changed by this document task.**


## 15. Repository compatibility pass — initial findings

This addendum records the first focused compatibility pass on the `development` branch. It supplements the contract above; it does not certify the entire repository tree or live database state.

### 15.1 Reusable technology and repository conventions

Verified from `package.json` and `drizzle.config.ts`:
- PostgreSQL + Drizzle ORM are the existing persistence stack.
- Zod 4 is already available for runtime request and node-schema validation.
- Vitest is the existing unit/integration test runner.
- Scripts include `db:generate`, `db:migrate`, `db:check`, `test`, `typecheck`, and `lint`.
- Drizzle Kit reads `src/lib/db/schema.ts`, writes to `drizzle/`, and uses `DATABASE_URL` only for migration application; schema generation has a local development URL fallback.

**Implementation implication:** keep Graph Engine schema definitions in the existing Drizzle schema module unless a reviewed repository refactor establishes a different convention. Use Zod schemas as the runtime validation boundary and Vitest for tests. Never run `db:migrate` against a production URL as part of local implementation or test generation.

### 15.2 Current authorization and tenant context

Verified from:
- `src/lib/db/tenant-scope.ts`
- `src/lib/access/guards.ts`
- `src/lib/access/policy.ts`
- `src/app/api/websites/[websiteId]/draft/route.ts`

Existing organization permissions include:
- `website.read`
- `website.edit`
- `website.publish`

The current roles map owner/admin/editor to website edit, while viewer has read-only access. Platform staff privileges are separate and are not implied by organization membership.

The tenant helper exposes transaction-local `app.current_user_id` and `app.current_organization_id` contexts. Its comments explicitly require callers to authenticate the session, verify active membership and action permission before using organization scope. Context setting itself is not authorization.

The draft route currently resolves the current session, loads active organization memberships, checks the requested permission, rechecks membership in a transaction, sets user and organization context, verifies the organization and website, and returns a non-cacheable draft with an ETag/revision. The mutation path uses origin validation, bounded request size, Zod validation and optimistic revision checks.

**Graph service requirement:** preserve this order of operations. Do not accept actor or organization IDs as trusted request fields. A Graph Engine transaction helper may need to set both user and organization context together after authorization, rather than nesting separate helpers that each create their own transaction. Keep every graph query on the authorized transaction handle.

**Permission proposal:** use existing `website.read`, `website.edit` and `website.publish` permissions for the first Graph Engine release. Introduce narrower permissions only if a real role/use case requires them; do not invent an incompatible permission vocabulary prematurely.

### 15.3 Existing draft contract and coexistence boundary

The existing draft route:
- Reads the root page's serialized `content`.
- Parses and validates it with `websiteDefinitionSchema`.
- Computes a draft revision and returns it as both a response field and ETag.
- Uses an optimistic revision check for mutations.
- Validates media ownership as part of draft updates.

This is a useful reference for HTTP safeguards, but it is not the graph contract. The Graph Engine must not mutate the existing page JSON as a hidden side effect. During the additive phase:
- Existing editor routes continue using their current draft contract.
- New graph tables/services are isolated behind new contracts.
- No dual-write is introduced without an explicit consistency design.
- No website is switched to graph reads until importer, parity checks, rollback and a separate cutover approval are complete.

### 15.4 Drizzle migration metadata caution

The migration journal contains ordered entries 0000 through 0031. The inspected `drizzle/meta` directory previously exposed `0016_snapshot.json` and `_journal.json`, but no later snapshot files. The current `drizzle.config.ts` points generation at the existing `drizzle/` directory.

Before generating the first Graph Engine migration:
1. Inspect the full current `drizzle/meta` directory and Git history.
2. Confirm the exact installed Drizzle Kit version's snapshot requirements and repository workflow.
3. Run `db:check` and a non-production schema-generation experiment in an isolated working copy/branch.
4. Confirm the generated SQL is additive and does not rewrite or reorder migration history.
5. Review generated snapshot/journal diffs and the SQL manually.
6. Do not apply any migration to a shared or production database without explicit approval.

Do not create a fabricated snapshot or regenerate migration history merely to satisfy the tool. If metadata needs repair, document the safe recovery procedure first.

### 15.5 First implementation boundary

The first code increment, after this specification is reviewed, should be limited to:
- Versioned Graph Engine Zod contracts and registries.
- Pure graph validation primitives that do not require database changes.
- Unit tests for node schemas, edge compatibility, containment cycles, ordering and deterministic snapshot serialization.
- A focused service/API contract design using the current session and permission conventions.

Only after those tests and the schema review should an additive migration be proposed. Do not add production routes or switch any existing editor/publication flow in the same change.

### 15.6 Findings not yet verified

The following still require a full tree/history pass before schema implementation:
- Complete repository-wide search for graph-like types or services.
- Full list of existing RLS policies and their exact predicates for all graph-adjacent tables.
- Current database role ownership, attributes and grants in a controlled database environment.
- Drizzle snapshot/generation behavior against the exact installed toolchain.
- Full draft mutation transaction and every caller's compatibility requirements.
- Whether current tests provide an isolated PostgreSQL instance suitable for graph/RLS integration tests.

**Status:** initial compatibility pass completed; Graph Engine remains in design/review. No application code, schema, migration, database or customer data was changed.


## 16. Implementation task 1 — foundational contracts and pure validation

**Status: source files committed; execution tests not yet run in a checked-out environment.**

The first additive code increment now exists under `src/lib/graph/`:

- `contracts.ts` — schema version constants; node and edge type identifiers; Zod contracts for graph nodes, edges, graph documents, operation batches, diagnostics and a separate canvas-position mutation contract.
- `registry.ts` — initial node property validators and typed edge compatibility rules.
- `validate.ts` — pure graph document validation, endpoint/type checks, duplicate checks, structural parent checks, containment cycle detection and deterministic canonical JSON serialization.
- `graph.test.ts` — Vitest coverage for valid graph documents, invalid node properties, invalid edge endpoints, containment cycles, deterministic serialization, duplicate node IDs, detached reusable reference nodes and canvas/content-operation separation.

### Design corrections made during implementation

1. Canvas movement was removed from the graph-content operation union and given its own schema. It must not increment the website graph content revision.
2. Structural containment-parent requirements apply to page, section and component nodes. Reusable references such as media, design tokens, shared data, interactions and responsive configuration are allowed to exist without a containment parent.
3. Containment cycle detection traverses all active nodes, not only the website root, so disconnected cycles cannot escape detection.
4. The initial edge registry is deliberately narrow and version 1. Recipe-specific composition and richer node properties remain Phase 3/4 work.

### Current limitations

- These are pure contracts and validation helpers only. There is no database persistence, graph service, API route, mutation transaction, idempotency store, snapshot persistence, RLS policy or UI yet.
- The current test file has been authored but has not been executed in this remote documentation/code-editing workflow. Do not report tests, typecheck or lint as passing until run in a real checkout.
- The registry is an initial baseline and needs review against final Phase 3 recipe ownership and Phase 4 renderer contracts.
- The validator is not yet a complete publishability/accessibility validator and does not replace database foreign keys or server authorization.
- A production or shared-database migration has not been created or applied.

### Verification record

The files were committed individually on `development`:
- `contracts.ts`
- `registry.ts`
- `validate.ts`
- `graph.test.ts`

A follow-up source review separated canvas state from graph operations and corrected reference-node and cycle validation behavior. The next task is to check out the latest branch in an executable environment, run the focused Vitest file, full typecheck and lint, fix any failures, and then design the additive relational schema migration after the Drizzle metadata workflow is verified.

**No existing website draft, publishing route, legacy table, production database, customer website or live infrastructure was modified.**


## 17. Additive database migration — implementation increment 1

**Status: six-table Drizzle schema and forward-only SQL migration committed on `development`; verified against a fresh PostgreSQL 16 CI database. No shared or production database was touched. The existing website data model remains intact.**

The first persistence increment should add six Graph Engine tables and leave all existing website tables and data intact. The graph is introduced alongside the existing draft and publishing model; it is not populated from legacy content and is not made authoritative until a later import/parity/cutover task is separately approved.

### 17.1 Table set and responsibilities

| Table | Key fields | Rules |
|---|---|---|
| `website_graphs` | `id`, `organization_id`, `website_id`, `schema_version`, `draft_revision`, `published_version_id`, timestamps | One graph per website; unique (organization_id, website_id); composite FK to websites(organization_id,id); revision starts at 0 |
| `website_nodes` | `id`, `organization_id`, `website_id`, `graph_id`, `node_type`, `schema_version`, `properties jsonb`, `lifecycle_status`, timestamps | Stable node IDs; composite graph FK; unique (graph_id,id); JSONB must be an object; registered property validation remains in the application |
| `website_edges` | `id`, tenant/site/graph IDs, `source_node_id`, `target_node_id`, `edge_type`, `schema_version`, nullable `sort_order`, `properties jsonb`, timestamps | Both endpoint FKs include graph_id, preventing cross-graph edges; unique (graph_id,id); indexes for source and target traversal |
| `website_graph_versions` | `id`, tenant/site/graph IDs, `revision`, `schema_version`, `snapshot jsonb`, `content_hash`, `created_by_user_id`, `created_at` | Immutable snapshots; unique (graph_id,revision) and (graph_id,id); creator FK to app_users |
| `website_graph_operations` | `id`, tenant/site/graph IDs, `actor_user_id`, `idempotency_key`, `request_hash`, `base_revision`, `result_revision`, `operations jsonb`, `result jsonb`, `created_at` | Append-only audit/replay record; unique (graph_id,actor_user_id,idempotency_key); actor FK; request hash detects key reuse with different payload |
| `website_canvas_positions` | tenant/site/graph IDs, `user_id`, `node_id`, `x`, `y`, `locked`, `updated_at` | Editor-only state; primary/unique key (graph_id,user_id,node_id); node and user FKs; never increments graph draft_revision |

The graph aggregate is unique per website, not per user. Nodes and edges are shared website content. Canvas positions are per user so each collaborator can arrange their own workspace without changing another user's canvas or the website itself.

### 17.2 Referential integrity and indexes

- Every child table carries `organization_id`, `website_id` and `graph_id`; do not rely on a bare UUID to establish tenant ownership.
- `website_graphs(organization_id, website_id)` references `websites(organization_id, id)` with the existing website deletion semantics.
- Each child references `website_graphs(organization_id, website_id, id)` through a composite unique key.
- Each node exposes `UNIQUE(graph_id,id)`. Each edge's source and target use composite `(graph_id,node_id)` foreign keys to nodes, so an edge cannot cross graphs even if an application check is missed.
- Graph-owned records cascade only with deletion of their graph/website aggregate. User/actor references use RESTRICT where preserving audit history matters. Node endpoint deletion should cascade its live edges; the operation/version history remains.
- Add indexes for graph node type, graph edge source/type/order, graph edge target, versions by graph/revision, operations by graph/created_at, and canvas positions by graph/user.
- Use CHECK constraints for supported lifecycle values, positive schema versions, nonnegative revisions/order/coordinates bounds, JSONB object/array shape, and nonblank idempotency/hash fields. Do not encode the full node/edge compatibility matrix as SQL; the versioned registry and transaction validator own that rule.

### 17.3 RLS and authorization

Enable and FORCE row-level security on all six tables. Policies must use the existing transaction-local `app.current_user_id` and `app.current_organization_id` settings and verify active organization membership. A tenant setting by itself is not authorization.

- Read policies: active organization membership with an allowed role (owner, admin, editor, viewer) and matching organization context.
- Write policies: active organization membership with owner/admin/editor role and matching organization context.
- Canvas policies: additionally require `user_id = app.current_user_id`; a user may only read or change their own canvas arrangement.
- Operation/version insertion: actor_user_id must equal the authenticated transaction user. Existing operation/version rows are immutable to application roles; no UPDATE/DELETE policy should be granted for append-only history.
- Graph mutation API still checks the session and `website.read` / `website.edit` permission before opening the tenant-scoped transaction. RLS is defence in depth, not a substitute for server authorization.
- Grant the least-privilege runtime role only the required SELECT/INSERT/UPDATE privileges. Do not grant broad table mutation on append-only history tables.

### 17.4 Transaction boundary

A single graph mutation transaction should: lock/read the graph row; compare expected revision; verify request idempotency; load the required graph state; apply the complete operation batch in memory; validate the resulting graph; write node/edge changes; insert the immutable version snapshot and operation record; increment draft_revision exactly once; then commit. Any failed step rolls back the entire batch.

A repeated idempotency key with the same actor and request hash returns the stored result. The same key with a different hash is a conflict. Canvas position writes use a separate transaction and do not touch graph revisions, versions or operation history.

### 17.5 Rollout and migration sequence

1. The full `drizzle/meta` directory and Git history were inspected. It contains `0016_snapshot.json` and `_journal.json`; migrations `0017`–`0031` are SQL-first journal entries without later snapshots. Preserve this established sparse-snapshot history: do not fabricate `0031_snapshot.json` or regenerate historical migrations.
2. Append the forward-only `0032_website_graph_engine` SQL migration and journal entry. The Drizzle schema is updated in parallel; the existing `0016_snapshot.json` remains untouched.
3. Run the migration workflow against a fresh PostgreSQL 16 service, creating `lucia_os_runtime` as a non-owner `NOBYPASSRLS` role before applying migrations so conditional grants are actually exercised.
4. Run `npm run db:check` after migration application and execute `scripts/test-graph-rls.sql` under the least-privilege runtime role. Cover tenant A/B isolation, viewer/editor permissions, cross-graph endpoint FK rejection, append-only history and per-user canvas isolation.
5. The disposable-database workflow passed: all migrations applied, `db:check` passed, the updated Drizzle schema typechecked, and the runtime-role RLS smoke tests passed. No customer site backfill, dual-write, draft-read change, publishing change or legacy-table removal is part of this migration.

### 17.6 Migration acceptance criteria

- Migration is forward-only and additive; no existing table, column, row, draft, published snapshot or legacy data is deleted or rewritten.
- All graph-owned records are tenant/site/graph constrained by composite foreign keys.
- Cross-graph and cross-tenant node references are rejected by PostgreSQL.
- RLS is enabled and forced for every graph table and verified using the least-privilege runtime role.
- Operation and version history is append-only for the runtime role.
- Canvas positions are user-scoped and independent of graph revision.
- Migration applies cleanly to a disposable database and Drizzle consistency checks pass.
- No production/shared database migration or website cutover is part of this task.

## 18. Verification and code-review gate before persistence implementation

The GitHub repository's existing `.github/workflows/quality.yml` runs lint, TypeScript typecheck, Drizzle consistency check, all Vitest tests, production build and routing HTTP checks. It currently has `pull_request` and `workflow_dispatch` triggers. At the time of this review, the Actions API returned zero workflow runs for `development`; therefore no passing CI evidence exists for the Graph Engine commit.

The current execution environment did not provide a repository checkout or a way to dispatch the workflow. A network clone attempt failed because GitHub DNS/network access is unavailable. Accordingly, the following remain **not executed**: focused Graph Engine Vitest file, full `npm test`, `npm run typecheck`, `npm run lint`, `npm run db:check`, and build. Do not infer success from source inspection.

A source review also identified pre-persistence hardening items:
- Compare graph, node and edge schema versions against named supported-version constants/registry entries rather than hardcoding a node-only literal.
- Reject edges whose source or target node is lifecycle-deleted, or define and test an explicit tombstone edge policy.
- Add tests for deleted-node references, unsupported graph/edge schema versions, duplicate edge IDs/relationships, multiple roots, disconnected cycles and root/parent invariants.
- Review the Zod 4 registry type annotations under the actual TypeScript compiler; source inspection cannot establish type correctness.

**Verification record:** the Graph Engine hardening increment passed the focused Graph Engine test file, the full unit suite (90 files / 1,138 tests), and TypeScript typecheck in GitHub Actions run `43280383040` (attempt 2). The additive persistence increment then passed GitHub Actions run `43281830233`: PostgreSQL 16 migration apply, Drizzle `db:check`, TypeScript typecheck, and tenant/RLS/append-only/canvas smoke tests as the non-owner `NOBYPASSRLS` runtime role. These checks ran only against a disposable CI database; no shared or production database was migrated.
