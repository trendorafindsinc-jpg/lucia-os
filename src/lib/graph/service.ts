import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { and, eq, ne, notInArray, sql } from "drizzle-orm";
import { getCurrentOrganizationAccess } from "@/lib/access/guards";
import { getDb } from "@/lib/db/client";
import {
  websiteCanvasPositions,
  websiteEdges,
  websiteGraphs,
  websiteGraphOperations,
  websiteGraphVersions,
  websiteNodes,
  websites,
} from "@/lib/db/schema";
import { canvasPositionMutationSchema, graphMutationBatchSchema, graphDocumentSchema, GRAPH_SCHEMA_VERSION, type GraphDocument, type GraphEdge, type GraphMutationBatch, type GraphNode, type GraphOperation } from "./contracts";
import { edgeRules } from "./registry";
import { canonicalGraphStringify, validateGraphDocument } from "./validate";

type Transaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

export class GraphServiceError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_FOUND" | "FORBIDDEN" | "CONFLICT" | "VALIDATION" | "IDEMPOTENCY_MISMATCH",
  ) {
    super(message);
    this.name = "GraphServiceError";
  }
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, stableValue(child)]),
    );
  }
  return value;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function inTenantTransaction<T>(
  userId: string,
  organizationId: string,
  work: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return getDb().transaction(async (tx) => {
    await tx.execute(
      // Both settings are transaction-local and are set only after the caller
      // has resolved the verified session and active organization permission.
      sql`select
        set_config('app.current_user_id', ${userId}, true),
        set_config('app.current_organization_id', ${organizationId}, true)`,
    );
    return work(tx);
  });
}

function rowToDocument(
  graph: typeof websiteGraphs.$inferSelect,
  nodes: (typeof websiteNodes.$inferSelect)[],
  edges: (typeof websiteEdges.$inferSelect)[],
): GraphDocument {
  return graphDocumentSchema.parse({
    id: graph.id,
    schemaVersion: graph.schemaVersion,
    revision: graph.draftRevision,
    nodes: nodes.map((node) => ({
      id: node.id,
      graphId: node.graphId,
      type: node.nodeType,
      schemaVersion: node.schemaVersion,
      properties: node.properties,
      lifecycleStatus: node.lifecycleStatus,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      graphId: edge.graphId,
      sourceNodeId: edge.sourceNodeId,
      targetNodeId: edge.targetNodeId,
      type: edge.edgeType,
      schemaVersion: edge.schemaVersion,
      ...(edge.sortOrder === null ? {} : { order: edge.sortOrder }),
      properties: edge.properties,
    })),
  });
}

async function loadDocument(
  tx: Transaction,
  graph: typeof websiteGraphs.$inferSelect,
): Promise<GraphDocument> {
  const nodes = await tx.select().from(websiteNodes).where(eq(websiteNodes.graphId, graph.id));
  const edges = await tx.select().from(websiteEdges).where(eq(websiteEdges.graphId, graph.id));
  return rowToDocument(graph, nodes, edges);
}

function applyOperations(
  initial: GraphDocument,
  operations: GraphOperation[],
  nextRevision: number,
): GraphDocument {
  let nodes = [...initial.nodes];
  let edges = [...initial.edges];

  for (const operation of operations) {
    switch (operation.type) {
      case "CREATE_NODE": {
        if (operation.node.graphId !== initial.id || nodes.some((node) => node.id === operation.node.id)) {
          throw new GraphServiceError("New node has an invalid graph scope or duplicate ID.", "VALIDATION");
        }
        nodes.push(operation.node);
        break;
      }
      case "UPDATE_NODE": {
        const index = nodes.findIndex((node) => node.id === operation.nodeId && node.lifecycleStatus === "active");
        if (index < 0) throw new GraphServiceError("The node to update does not exist.", "NOT_FOUND");
        nodes[index] = { ...nodes[index], properties: operation.properties };
        break;
      }
      case "DELETE_NODE": {
        const index = nodes.findIndex((node) => node.id === operation.nodeId && node.lifecycleStatus === "active");
        if (index < 0) throw new GraphServiceError("The node to delete does not exist.", "NOT_FOUND");
        nodes[index] = { ...nodes[index], lifecycleStatus: "deleted" };
        edges = edges.filter((edge) => edge.sourceNodeId !== operation.nodeId && edge.targetNodeId !== operation.nodeId);
        break;
      }
      case "CONNECT_NODES": {
        if (operation.edge.graphId !== initial.id || edges.some((edge) => edge.id === operation.edge.id)) {
          throw new GraphServiceError("New edge has an invalid graph scope or duplicate ID.", "VALIDATION");
        }
        edges.push(operation.edge);
        break;
      }
      case "DISCONNECT_NODES": {
        const before = edges.length;
        edges = edges.filter((edge) => edge.id !== operation.edgeId);
        if (edges.length === before) throw new GraphServiceError("The edge to disconnect does not exist.", "NOT_FOUND");
        break;
      }
      case "REORDER_CHILDREN": {
        if (!edgeRules[operation.edgeType].ordered) {
          throw new GraphServiceError("Only ordered containment relationships can be reordered.", "VALIDATION");
        }
        const matching = edges.filter((edge) =>
          edge.sourceNodeId === operation.parentNodeId && edge.type === operation.edgeType,
        );
        if (matching.length !== operation.orderedEdgeIds.length ||
            new Set(operation.orderedEdgeIds).size !== operation.orderedEdgeIds.length ||
            matching.some((edge) => !operation.orderedEdgeIds.includes(edge.id))) {
          throw new GraphServiceError("Reordering must include every matching child edge exactly once.", "VALIDATION");
        }
        const order = new Map(operation.orderedEdgeIds.map((id, index) => [id, index]));
        edges = edges.map((edge) =>
          order.has(edge.id) ? { ...edge, order: order.get(edge.id) } : edge,
        );
        break;
      }
      case "RESTORE_VERSION":
        throw new GraphServiceError("Restore operations must be resolved from immutable version storage.", "VALIDATION");
    }
  }

  return { ...initial, revision: nextRevision, nodes, edges };
}

async function persistDocument(tx: Transaction, organizationId: string, websiteId: string, graphId: string, document: GraphDocument) {
  // Reconcile the full node set when restoring an older immutable snapshot.
  await tx.delete(websiteEdges).where(eq(websiteEdges.graphId, graphId));
  await tx.delete(websiteNodes).where(and(
    eq(websiteNodes.graphId, graphId),
    notInArray(websiteNodes.id, document.nodes.map((node) => node.id)),
  ));
  for (const node of document.nodes) {
    await tx.insert(websiteNodes).values({
      id: node.id,
      organizationId,
      websiteId,
      graphId,
      nodeType: node.type,
      schemaVersion: node.schemaVersion,
      properties: node.properties,
      lifecycleStatus: node.lifecycleStatus,
    }).onConflictDoUpdate({
      target: [websiteNodes.graphId, websiteNodes.id],
      set: {
        nodeType: node.type,
        schemaVersion: node.schemaVersion,
        properties: node.properties,
        lifecycleStatus: node.lifecycleStatus,
        updatedAt: new Date(),
      },
    });
  }

  // Edge IDs and ordering are part of the graph snapshot.
  if (document.edges.length) {
    await tx.insert(websiteEdges).values(document.edges.map((edge) => ({
      id: edge.id,
      organizationId,
      websiteId,
      graphId,
      sourceNodeId: edge.sourceNodeId,
      targetNodeId: edge.targetNodeId,
      edgeType: edge.type,
      schemaVersion: edge.schemaVersion,
      sortOrder: edge.order ?? null,
      properties: edge.properties,
    })));
  }
}

export async function getWebsiteGraph(organizationId: string, websiteId: string) {
  const access = await getCurrentOrganizationAccess(organizationId, "website.read");
  if (!access) throw new GraphServiceError("Organization access denied.", "FORBIDDEN");

  return inTenantTransaction(access.user.id, organizationId, async (tx) => {
    const [website] = await tx.select({ id: websites.id }).from(websites)
      .where(and(eq(websites.id, websiteId), eq(websites.organizationId, organizationId), ne(websites.status, "deleted"))).limit(1);
    if (!website) throw new GraphServiceError("Website not found.", "NOT_FOUND");
    const [graph] = await tx.select().from(websiteGraphs)
      .where(and(eq(websiteGraphs.websiteId, websiteId), eq(websiteGraphs.organizationId, organizationId))).limit(1);
    if (!graph) return null;
    const document = await loadDocument(tx, graph);
    const positions = await tx.select({
      nodeId: websiteCanvasPositions.nodeId,
      x: websiteCanvasPositions.x,
      y: websiteCanvasPositions.y,
      locked: websiteCanvasPositions.locked,
    }).from(websiteCanvasPositions).where(and(
      eq(websiteCanvasPositions.graphId, graph.id),
      eq(websiteCanvasPositions.userId, access.user.id),
    ));
    return { document, canvasPositions: positions };
  });
}

export async function createWebsiteGraph(organizationId: string, websiteId: string) {
  const access = await getCurrentOrganizationAccess(organizationId, "website.edit");
  if (!access) throw new GraphServiceError("Organization edit access denied.", "FORBIDDEN");

  return inTenantTransaction(access.user.id, organizationId, async (tx) => {
    const [website] = await tx.select({ id: websites.id, name: websites.name }).from(websites)
      .where(and(eq(websites.id, websiteId), eq(websites.organizationId, organizationId), ne(websites.status, "deleted"))).for("update").limit(1);
    if (!website) throw new GraphServiceError("Website not found.", "NOT_FOUND");

    const [existing] = await tx.select().from(websiteGraphs)
      .where(and(eq(websiteGraphs.websiteId, websiteId), eq(websiteGraphs.organizationId, organizationId))).limit(1);
    if (existing) return loadDocument(tx, existing);

    const [graph] = await tx.insert(websiteGraphs).values({
      organizationId, websiteId, schemaVersion: GRAPH_SCHEMA_VERSION, draftRevision: 0,
    }).returning();
    const root: GraphNode = {
      id: randomUUID(), graphId: graph.id, type: "website", schemaVersion: 1,
      properties: { name: website.name }, lifecycleStatus: "active",
    };
    await tx.insert(websiteNodes).values({
      id: root.id, organizationId, websiteId, graphId: graph.id,
      nodeType: root.type, schemaVersion: root.schemaVersion, properties: root.properties,
      lifecycleStatus: root.lifecycleStatus,
    });
    const document: GraphDocument = {
      id: graph.id, schemaVersion: GRAPH_SCHEMA_VERSION, revision: 0, nodes: [root], edges: [],
    };
    const canonical = canonicalGraphStringify(document);
    await tx.insert(websiteGraphVersions).values({
      organizationId, websiteId, graphId: graph.id, revision: 0,
      schemaVersion: GRAPH_SCHEMA_VERSION, snapshot: JSON.parse(canonical),
      contentHash: sha256(canonical), createdByUserId: access.user.id,
    });
    return document;
  });
}

export async function mutateWebsiteGraph(organizationId: string, input: unknown) {
  const batch = graphMutationBatchSchema.parse(input) as GraphMutationBatch;
  const access = await getCurrentOrganizationAccess(organizationId, "website.edit");
  if (!access) throw new GraphServiceError("Organization edit access denied.", "FORBIDDEN");
  const requestHash = sha256(JSON.stringify(stableValue(batch)));

  return inTenantTransaction(access.user.id, organizationId, async (tx) => {
    const [website] = await tx.select({ id: websites.id }).from(websites)
      .where(and(eq(websites.id, batch.websiteId), eq(websites.organizationId, organizationId))).limit(1);
    if (!website) throw new GraphServiceError("Website not found.", "NOT_FOUND");

    const [graph] = await tx.select().from(websiteGraphs)
      .where(and(eq(websiteGraphs.websiteId, batch.websiteId), eq(websiteGraphs.organizationId, organizationId)))
      .for("update").limit(1);
    if (!graph) throw new GraphServiceError("Website graph has not been created.", "NOT_FOUND");

    const [replay] = await tx.select().from(websiteGraphOperations).where(and(
      eq(websiteGraphOperations.graphId, graph.id),
      eq(websiteGraphOperations.actorUserId, access.user.id),
      eq(websiteGraphOperations.idempotencyKey, batch.idempotencyKey),
    )).limit(1);
    if (replay) {
      if (replay.requestHash !== requestHash) {
        throw new GraphServiceError("Idempotency key was already used with a different request.", "IDEMPOTENCY_MISMATCH");
      }
      return replay.result;
    }

    if (graph.draftRevision !== batch.expectedRevision) {
      throw new GraphServiceError("Graph revision has changed. Reload before retrying.", "CONFLICT");
    }

    let current = await loadDocument(tx, graph);
    const restore = batch.operations.filter((op) => op.type === "RESTORE_VERSION");
    if (restore.length) {
      if (restore.length !== 1 || batch.operations.length !== 1) {
        throw new GraphServiceError("A restore must be submitted as its own operation batch.", "VALIDATION");
      }
      const [version] = await tx.select().from(websiteGraphVersions).where(and(
        eq(websiteGraphVersions.graphId, graph.id),
        eq(websiteGraphVersions.id, restore[0].versionId),
      )).limit(1);
      if (!version) throw new GraphServiceError("Graph version not found.", "NOT_FOUND");
      const restored = graphDocumentSchema.parse(version.snapshot);
      current = { ...restored, revision: graph.draftRevision + 1 };
    } else {
      current = applyOperations(current, batch.operations, graph.draftRevision + 1);
    }

    const diagnostics = validateGraphDocument(current);
    if (diagnostics.length) {
      throw new GraphServiceError("Graph mutation failed validation: " + diagnostics.map((item) => item.code).join(", "), "VALIDATION");
    }

    const canonical = canonicalGraphStringify(current);
    const contentHash = sha256(canonical);
    await persistDocument(tx, organizationId, batch.websiteId, graph.id, current);
    await tx.update(websiteGraphs).set({
      draftRevision: current.revision, updatedAt: new Date(),
    }).where(eq(websiteGraphs.id, graph.id));
    const result = { graphId: graph.id, revision: current.revision, contentHash };
    await tx.insert(websiteGraphVersions).values({
      organizationId, websiteId: batch.websiteId, graphId: graph.id,
      revision: current.revision, schemaVersion: current.schemaVersion,
      snapshot: JSON.parse(canonical), contentHash, createdByUserId: access.user.id,
    });
    await tx.insert(websiteGraphOperations).values({
      organizationId, websiteId: batch.websiteId, graphId: graph.id,
      actorUserId: access.user.id, idempotencyKey: batch.idempotencyKey,
      requestHash, baseRevision: graph.draftRevision, resultRevision: current.revision,
      operations: batch.operations, result,
    });
    return result;
  });
}

export async function saveCanvasPosition(organizationId: string, websiteId: string, input: unknown) {
  const position = canvasPositionMutationSchema.parse(input);
  const access = await getCurrentOrganizationAccess(organizationId, "website.read");
  if (!access) throw new GraphServiceError("Organization access denied.", "FORBIDDEN");

  return inTenantTransaction(access.user.id, organizationId, async (tx) => {
    const [website] = await tx.select({ id: websites.id }).from(websites)
      .where(and(eq(websites.id, websiteId), eq(websites.organizationId, organizationId))).limit(1);
    if (!website) throw new GraphServiceError("Website not found.", "NOT_FOUND");
    const [graph] = await tx.select().from(websiteGraphs).where(and(
      eq(websiteGraphs.websiteId, websiteId), eq(websiteGraphs.organizationId, organizationId),
    )).limit(1);
    if (!graph) throw new GraphServiceError("Website graph has not been created.", "NOT_FOUND");
    const [node] = await tx.select({ id: websiteNodes.id }).from(websiteNodes).where(and(
      eq(websiteNodes.id, position.nodeId), eq(websiteNodes.graphId, graph.id),
      eq(websiteNodes.lifecycleStatus, "active"),
    )).limit(1);
    if (!node) throw new GraphServiceError("Canvas node not found.", "NOT_FOUND");
    const [existingPosition] = await tx.select().from(websiteCanvasPositions).where(and(
      eq(websiteCanvasPositions.graphId, graph.id),
      eq(websiteCanvasPositions.userId, access.user.id),
      eq(websiteCanvasPositions.nodeId, position.nodeId),
    )).limit(1);
    if (existingPosition?.locked &&
        (existingPosition.x !== position.x || existingPosition.y !== position.y) &&
        position.locked !== false) {
      throw new GraphServiceError("Unlock this canvas node before moving it.", "CONFLICT");
    }

    await tx.insert(websiteCanvasPositions).values({
      organizationId, websiteId, graphId: graph.id, userId: access.user.id,
      nodeId: position.nodeId, x: position.x, y: position.y, locked: position.locked ?? existingPosition?.locked ?? false,
    }).onConflictDoUpdate({
      target: [websiteCanvasPositions.graphId, websiteCanvasPositions.userId, websiteCanvasPositions.nodeId],
      set: { x: position.x, y: position.y, locked: position.locked ?? existingPosition?.locked ?? false, updatedAt: new Date() },
    });
    return { saved: true, graphRevision: graph.draftRevision };
  });
}


export async function listWebsiteGraphVersions(organizationId: string, websiteId: string) {
  const access = await getCurrentOrganizationAccess(organizationId, "website.read");
  if (!access) throw new GraphServiceError("Organization access denied.", "FORBIDDEN");
  return inTenantTransaction(access.user.id, organizationId, async (tx) => {
    const [graph] = await tx.select({ id: websiteGraphs.id }).from(websiteGraphs).where(and(
      eq(websiteGraphs.websiteId, websiteId),
      eq(websiteGraphs.organizationId, organizationId),
    )).limit(1);
    if (!graph) throw new GraphServiceError("Website graph has not been created.", "NOT_FOUND");
    return tx.select({
      id: websiteGraphVersions.id,
      revision: websiteGraphVersions.revision,
      contentHash: websiteGraphVersions.contentHash,
      createdByUserId: websiteGraphVersions.createdByUserId,
      createdAt: websiteGraphVersions.createdAt,
    }).from(websiteGraphVersions).where(eq(websiteGraphVersions.graphId, graph.id))
      .orderBy(websiteGraphVersions.revision);
  });
}
