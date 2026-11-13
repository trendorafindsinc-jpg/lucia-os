import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import postgres from "postgres";

const auth = vi.hoisted(() => ({ userId: "10000000-0000-4000-8000-000000000001" }));
vi.mock("@/lib/access/guards", () => ({
  getCurrentOrganizationAccess: vi.fn(async () => ({
    user: { id: auth.userId },
    membership: { role: "editor", status: "active" },
  })),
}));

import {
  getWebsiteGraph,
  mutateWebsiteGraph,
  saveCanvasPosition,
  listWebsiteGraphVersions,
} from "./service";
import { GraphServiceError } from "./service";

const ids = {
  userA: "10000000-0000-4000-8000-000000000001",
  userB: "10000000-0000-4000-8000-000000000002",
  userOther: "20000000-0000-4000-8000-000000000001",
  orgA: "30000000-0000-4000-8000-000000000001",
  orgB: "30000000-0000-4000-8000-000000000002",
  siteA: "50000000-0000-4000-8000-000000000001",
  siteB: "50000000-0000-4000-8000-000000000002",
};
const ownerUrl = process.env.GRAPH_TEST_OWNER_DATABASE_URL;
if (!ownerUrl) throw new Error("GRAPH_TEST_OWNER_DATABASE_URL is required for graph persistence integration tests.");
const owner = postgres(ownerUrl, { max: 1, prepare: false });
const runtimeUrl = process.env.DATABASE_URL_RUNTIME;
if (!runtimeUrl) throw new Error("DATABASE_URL_RUNTIME is required for graph RLS integration tests.");
const runtime = postgres(runtimeUrl, { max: 1, prepare: false });

let rootId = "";
let pageId = "";
let graphId = "";
let currentRevision = 0;

function batch(expectedRevision: number, idempotencyKey: string, operations: unknown[]) {
  return {
    websiteId: ids.siteA,
    expectedRevision,
    idempotencyKey,
    operationSchemaVersion: 1,
    operations,
  };
}

function pageCreateOperations() {
  pageId = "70000000-0000-4000-8000-000000000011";
  return [
    {
      type: "CREATE_NODE",
      node: {
        id: pageId, graphId, type: "page", schemaVersion: 1,
        properties: { title: "Home", path: "/" }, lifecycleStatus: "active",
      },
    },
    {
      type: "CONNECT_NODES",
      edge: {
        id: "71000000-0000-4000-8000-000000000010",
        graphId, sourceNodeId: rootId, targetNodeId: pageId,
        type: "contains_page", schemaVersion: 1, order: 0, properties: {},
      },
    },
  ];
}

describe.sequential("Graph Persistence Service (PostgreSQL)", () => {
  beforeAll(async () => {
    await owner`INSERT INTO app_users (id, core_subject_id, display_name) VALUES
      (${ids.userA}, 'graph-service-user-a', 'Graph Service A'),
      (${ids.userB}, 'graph-service-user-b', 'Graph Service B'),
      (${ids.userOther}, 'graph-service-user-other', 'Graph Service Other')
      ON CONFLICT (id) DO NOTHING`;
    await owner`INSERT INTO organizations (id, name, slug, status) VALUES
      (${ids.orgA}, 'Graph Service Tenant A', 'graph-service-tenant-a', 'active'),
      (${ids.orgB}, 'Graph Service Tenant B', 'graph-service-tenant-b', 'active')
      ON CONFLICT (id) DO NOTHING`;
    await owner`INSERT INTO organization_memberships (organization_id, user_id, role, status) VALUES
      (${ids.orgA}, ${ids.userA}, 'editor', 'active'),
      (${ids.orgA}, ${ids.userB}, 'viewer', 'active'),
      (${ids.orgB}, ${ids.userOther}, 'editor', 'active')
      ON CONFLICT (organization_id, user_id) DO NOTHING`;
    await owner`INSERT INTO websites (id, organization_id, name, slug, status) VALUES
      (${ids.siteA}, ${ids.orgA}, 'Graph Service Site A', 'graph-service-site-a', 'draft'),
      (${ids.siteB}, ${ids.orgB}, 'Graph Service Site B', 'graph-service-site-b', 'draft')
      ON CONFLICT (id) DO NOTHING`;
    await owner`INSERT INTO website_graphs (id, organization_id, website_id, schema_version, draft_revision)
      VALUES ('60000000-0000-4000-8000-000000000020', ${ids.orgB}, ${ids.siteB}, 1, 0)
      ON CONFLICT (id) DO NOTHING`;
    auth.userId = ids.userA;
    graphId = "60000000-0000-4000-8000-000000000010";
    rootId = "70000000-0000-4000-8000-000000000010";
    const snapshot = {
      id: graphId, schemaVersion: 1, revision: 0,
      nodes: [{
        id: rootId, graphId, type: "website", schemaVersion: 1,
        properties: { name: "Graph Service Site A" }, lifecycleStatus: "active",
      }],
      edges: [],
    };
    await owner`INSERT INTO website_graphs (id, organization_id, website_id, schema_version, draft_revision)
      VALUES (${graphId}, ${ids.orgA}, ${ids.siteA}, 1, 0)`;
    await owner`INSERT INTO website_nodes (id, organization_id, website_id, graph_id, node_type, schema_version, properties, lifecycle_status)
      VALUES (${rootId}, ${ids.orgA}, ${ids.siteA}, ${graphId}, 'website', 1, '{"name":"Graph Service Site A"}'::jsonb, 'active')`;
    await owner`INSERT INTO website_graph_versions
      (organization_id, website_id, graph_id, revision, schema_version, snapshot, content_hash, created_by_user_id)
      VALUES (${ids.orgA}, ${ids.siteA}, ${graphId}, 0, 1, ${owner.json(snapshot)}::jsonb, ${"a".repeat(64)}, ${ids.userA})`;
    currentRevision = 0;
  });

  afterAll(async () => {
    await owner`DELETE FROM websites WHERE id IN (${ids.siteA}, ${ids.siteB})`;
    await owner`DELETE FROM organizations WHERE id IN (${ids.orgA}, ${ids.orgB})`;
    await owner.end();
    await runtime.end();
  });

  it("enforces tenant and editor write boundaries in PostgreSQL RLS", async () => {
    await runtime.begin(async (tx) => {
      await tx`select
        set_config('app.current_user_id', ${ids.userA}, true),
        set_config('app.current_organization_id', ${ids.orgA}, true)`;
      const visibleRows = await tx`SELECT id FROM website_graphs`;
      expect(visibleRows).toHaveLength(1);
      expect(visibleRows[0].id).toBe(graphId);
    });

    await expect(runtime.begin(async (tx) => {
      await tx`select
        set_config('app.current_user_id', ${ids.userB}, true),
        set_config('app.current_organization_id', ${ids.orgA}, true)`;
      await tx`INSERT INTO website_nodes
        (id, organization_id, website_id, graph_id, node_type, schema_version, properties, lifecycle_status)
        VALUES
        ('70000000-0000-4000-8000-000000000099', ${ids.orgA}, ${ids.siteA}, ${graphId},
         'component', 1, ${tx.json({})}::jsonb, 'active')`;
    })).rejects.toBeDefined();
  });

  it("creates the initial graph and rejects cross-tenant service reads", async () => {
    expect(currentRevision).toBe(0);
    expect(rootId).toBeTruthy();
    auth.userId = ids.userA;
    await expect(getWebsiteGraph(ids.orgB, ids.siteA)).rejects.toMatchObject({ code: "NOT_FOUND" });
    const own = await getWebsiteGraph(ids.orgA, ids.siteA);
    expect(own?.document.revision).toBe(0);
  });

  it("commits a mutation once and returns the stored result on exact idempotent replay", async () => {
    const request = batch(0, "graph-service-create-page-0001", pageCreateOperations());
    const first = await mutateWebsiteGraph(ids.orgA, request);
    const replay = await mutateWebsiteGraph(ids.orgA, request);
    expect(first).toEqual(replay);
    expect(first.revision).toBe(1);
    currentRevision = 1;
    await expect(mutateWebsiteGraph(ids.orgA, {
      ...request,
      operations: [{ type: "UPDATE_NODE", nodeId: pageId, properties: { title: "Different", path: "/" } }],
    })).rejects.toMatchObject({ code: "IDEMPOTENCY_MISMATCH" });
    const versions = await owner`SELECT revision FROM website_graph_versions WHERE graph_id = ${graphId} ORDER BY revision`;
    expect(versions.map((row) => Number(row.revision))).toEqual([0, 1]);
  });

  it("serializes concurrent writes and rejects the stale expected revision", async () => {
    const requests = ["Concurrent A", "Concurrent B"].map((title, index) =>
      mutateWebsiteGraph(ids.orgA, batch(1, `graph-service-concurrent-000${index + 1}`, [
        { type: "UPDATE_NODE", nodeId: pageId, properties: { title, path: "/" } },
      ])),
    );
    const results = await Promise.allSettled(requests);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason).toBeInstanceOf(GraphServiceError);
    expect(rejected.reason.code).toBe("CONFLICT");
    currentRevision = 2;
    const graph = await getWebsiteGraph(ids.orgA, ids.siteA);
    expect(graph?.document.revision).toBe(2);
  });

  it("rolls back all graph writes when a later version insert fails", async () => {
    await owner`CREATE OR REPLACE FUNCTION graph_test_reject_revision_three() RETURNS trigger
      LANGUAGE plpgsql AS $$ BEGIN
        IF NEW.revision = 3 THEN RAISE EXCEPTION 'intentional integration-test failure'; END IF;
        RETURN NEW;
      END $$`;
    await owner`CREATE TRIGGER graph_test_reject_revision_three
      BEFORE INSERT ON website_graph_versions FOR EACH ROW
      EXECUTE FUNCTION graph_test_reject_revision_three()`;
    try {
      await expect(mutateWebsiteGraph(ids.orgA, batch(2, "graph-service-rollback-0001", [
        { type: "UPDATE_NODE", nodeId: pageId, properties: { title: "Must roll back", path: "/" } },
      ]))).rejects.toBeDefined();
    } finally {
      await owner`DROP TRIGGER IF EXISTS graph_test_reject_revision_three ON website_graph_versions`;
      await owner`DROP FUNCTION IF EXISTS graph_test_reject_revision_three()`;
    }
    const graph = await getWebsiteGraph(ids.orgA, ids.siteA);
    expect(graph?.document.revision).toBe(2);
    expect(graph?.document.nodes.find((node) => node.id === pageId)?.properties.title).not.toBe("Must roll back");
    currentRevision = 2;
  });

  it("restores an immutable snapshot and reconciles nodes added after that snapshot", async () => {
    const sectionId = "70000000-0000-4000-8000-000000000020";
    const sectionEdgeId = "71000000-0000-4000-8000-000000000020";
    await mutateWebsiteGraph(ids.orgA, batch(2, "graph-service-add-section-0001", [
      { type: "CREATE_NODE", node: { id: sectionId, graphId, type: "section", schemaVersion: 1, properties: {}, lifecycleStatus: "active" } },
      { type: "CONNECT_NODES", edge: { id: sectionEdgeId, graphId, sourceNodeId: pageId, targetNodeId: sectionId, type: "contains_section", schemaVersion: 1, order: 0, properties: {} } },
    ]));
    const versionTwo = await owner`SELECT id FROM website_graph_versions WHERE graph_id = ${graphId} AND revision = 2`;
    await mutateWebsiteGraph(ids.orgA, batch(3, "graph-service-restore-v2-0001", [
      { type: "RESTORE_VERSION", versionId: versionTwo[0].id },
    ]));
    currentRevision = 4;
    const graph = await getWebsiteGraph(ids.orgA, ids.siteA);
    expect(graph?.document.revision).toBe(4);
    expect(graph?.document.nodes.some((node) => node.id === sectionId)).toBe(false);
    expect(graph?.document.edges.some((edge) => edge.id === sectionEdgeId)).toBe(false);
    const history = await owner`SELECT revision FROM website_graph_versions WHERE graph_id = ${graphId} ORDER BY revision`;
    expect(history.map((row) => Number(row.revision))).toEqual([0, 1, 2, 3, 4]);
  });


  it("only creates active nodes and reserves tombstones for DELETE_NODE", async () => {
    auth.userId = ids.userA;
    await expect(mutateWebsiteGraph(ids.orgA, batch(currentRevision, "graph-service-create-tombstone-0001", [
      { type: "CREATE_NODE", node: { id: "70000000-0000-4000-8000-000000000099", graphId, type: "component", schemaVersion: 1, properties: {}, lifecycleStatus: "deleted" } },
    ]))).rejects.toMatchObject({ code: "VALIDATION" });
    const graph = await getWebsiteGraph(ids.orgA, ids.siteA);
    expect(graph?.document.revision).toBe(currentRevision);
  });

  it("keeps canvas positions user-scoped, lock-aware, and outside content revisions", async () => {
    auth.userId = ids.userA;
    const saved = await saveCanvasPosition(ids.orgA, ids.siteA, { nodeId: rootId, x: 100, y: 200, locked: true });
    expect(saved.graphRevision).toBe(currentRevision);
    await expect(saveCanvasPosition(ids.orgA, ids.siteA, { nodeId: rootId, x: 101, y: 201 }))
      .rejects.toMatchObject({ code: "CONFLICT" });
    await saveCanvasPosition(ids.orgA, ids.siteA, { nodeId: rootId, x: 101, y: 201, locked: false });
    const own = await getWebsiteGraph(ids.orgA, ids.siteA);
    expect(own?.document.revision).toBe(currentRevision);
    expect(own?.canvasPositions).toHaveLength(1);
    expect(own?.canvasPositions[0]).toMatchObject({ x: 101, y: 201, locked: false });

    auth.userId = ids.userB;
    const other = await getWebsiteGraph(ids.orgA, ids.siteA);
    expect(other?.document.revision).toBe(currentRevision);
    expect(other?.canvasPositions).toHaveLength(0);
    await saveCanvasPosition(ids.orgA, ids.siteA, { nodeId: rootId, x: -20, y: 30 });
    const viewer = await getWebsiteGraph(ids.orgA, ids.siteA);
    expect(viewer?.canvasPositions).toHaveLength(1);
    expect(viewer?.canvasPositions[0]).toMatchObject({ x: -20, y: 30 });
  });
  it("rejects graph and canvas writes after a website is soft-deleted", async () => {
    auth.userId = ids.userA;
    await owner`UPDATE websites SET status = 'deleted' WHERE id = ${ids.siteA}`;
    try {
      await expect(mutateWebsiteGraph(ids.orgA, batch(currentRevision, "graph-service-deleted-site-0001", [
        { type: "UPDATE_NODE", nodeId: pageId, properties: { title: "Must not write", path: "/" } },
      ]))).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(saveCanvasPosition(ids.orgA, ids.siteA, { nodeId: rootId, x: 1, y: 1 }))
        .rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(listWebsiteGraphVersions(ids.orgA, ids.siteA))
        .rejects.toMatchObject({ code: "NOT_FOUND" });
    } finally {
      await owner`UPDATE websites SET status = 'draft' WHERE id = ${ids.siteA}`;
    }
  });
  it("refuses to restore a snapshot whose immutable content hash no longer matches", async () => {
    auth.userId = ids.userA;
    const versions = await owner`SELECT id FROM website_graph_versions WHERE graph_id = ${graphId} AND revision = 1`;
    await owner`UPDATE website_graph_versions SET snapshot = jsonb_set(snapshot, '{nodes,0,properties,name}', '"tampered"'::jsonb, false) WHERE id = ${versions[0].id}`;
    await expect(mutateWebsiteGraph(ids.orgA, batch(currentRevision, "graph-service-corrupt-snapshot-0001", [
      { type: "RESTORE_VERSION", versionId: versions[0].id },
    ]))).rejects.toMatchObject({ code: "VALIDATION" });
    const graph = await getWebsiteGraph(ids.orgA, ids.siteA);
    expect(graph?.document.revision).toBe(currentRevision);
  });
});