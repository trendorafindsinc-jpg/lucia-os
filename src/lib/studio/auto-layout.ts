import {
  graphDocumentSchema,
  type GraphDocument,
  type GraphEdge,
  type GraphNode,
} from "@/lib/graph/contracts";
import { validateGraphDocument } from "@/lib/graph/validate";

export const MAX_STUDIO_LAYOUT_NODES = 2_000;
const MAX_CANVAS_COORDINATE = 1_000_000;
const PAGE_START_X = 160;
const PAGE_Y = 280;
const SECTION_START_Y = 520;
const SECTION_GAP_Y = 360;
const COMPONENT_START_X = 340;
const COMPONENT_GAP_X = 220;
const COMPONENT_GAP_Y = 180;
const REFERENCE_START_GAP_X = 420;
const REFERENCE_START_Y = 160;
const REFERENCE_GAP_Y = 220;

export type StudioCanvasPosition = {
  nodeId: string;
  x: number;
  y: number;
};

export type StudioAutoLayoutResult =
  | { ok: true; positions: StudioCanvasPosition[]; diagnostics: [] }
  | { ok: false; positions: []; diagnostics: { code: string; message: string; nodeId?: string }[] };


function failure(code: string, message: string, nodeId?: string): StudioAutoLayoutResult {
  return { ok: false, positions: [], diagnostics: [{ code, message, ...(nodeId ? { nodeId } : {}) }] };
}

function compareOrderedEdges(left: GraphEdge, right: GraphEdge): number {
  return (left.order ?? 0) - (right.order ?? 0) ||
    left.targetNodeId.localeCompare(right.targetNodeId) ||
    left.id.localeCompare(right.id);
}

/**
 * Compute stable canvas coordinates from real graph containment and reference
 * relationships. This function never mutates the graph or reads saved positions.
 */
export function computeStudioAutoLayout(input: unknown): StudioAutoLayoutResult {
  const parsed = graphDocumentSchema.safeParse(input);
  if (!parsed.success) {
    return failure("STUDIO_GRAPH_INVALID", "The graph document is not valid for canvas layout.");
  }
  const graph: GraphDocument = parsed.data;
  const graphIssues = validateGraphDocument(graph);
  if (graphIssues.length) {
    return {
      ok: false,
      positions: [],
      diagnostics: graphIssues.map((item) => ({
        code: item.code,
        message: item.message,
        ...(item.nodeId ? { nodeId: item.nodeId } : {}),
      })),
    };
  }

  const activeNodes = graph.nodes.filter((node) => node.lifecycleStatus === "active");
  if (activeNodes.length > MAX_STUDIO_LAYOUT_NODES) {
    return failure(
      "STUDIO_LAYOUT_LIMIT_EXCEEDED",
      "Automatic layout supports at most 2,000 active graph nodes at a time.",
    );
  }

  const nodesById = new Map(activeNodes.map((node) => [node.id, node]));
  const outgoing = new Map<string, GraphEdge[]>();
  for (const edge of graph.edges) {
    if (!nodesById.has(edge.sourceNodeId) || !nodesById.has(edge.targetNodeId)) continue;
    const key = edge.sourceNodeId + ":" + edge.type;
    const group = outgoing.get(key) ?? [];
    group.push(edge);
    outgoing.set(key, group);
  }
  for (const edges of outgoing.values()) edges.sort(compareOrderedEdges);

  const children = (parentId: string, edgeType: GraphEdge["type"]): GraphNode[] =>
    (outgoing.get(parentId + ":" + edgeType) ?? [])
      .map((edge) => nodesById.get(edge.targetNodeId))
      .filter((node): node is GraphNode => Boolean(node));

  const root = activeNodes.find((node) => node.type === "website");
  if (!root) return failure("STUDIO_GRAPH_INVALID", "The graph has no active website root.");

  const pages = children(root.id, "contains_page");
  const positions = new Map<string, StudioCanvasPosition>();
  let pageColumnX = PAGE_START_X;

  // First pass reserves enough horizontal space for each page's deepest
  // component tree, so adjacent page groups do not collide.
  const pagePlans = pages.map((page) => {
    const sections = children(page.id, "contains_section");
    let maxDepth = 0;
    const sectionPlans = sections.map((section) => {
      const levels = new Map<number, string[]>();
      const queue: { parentId: string; depth: number }[] = [{ parentId: section.id, depth: 0 }];
      let cursor = 0;
      while (cursor < queue.length) {
        const current = queue[cursor++];
        const descendants = children(current.parentId, "contains_component");
        const nextDepth = current.depth + 1;
        if (descendants.length) {
          const level = levels.get(nextDepth) ?? [];
          for (const descendant of descendants) {
            level.push(descendant.id);
            queue.push({ parentId: descendant.id, depth: nextDepth });
          }
          levels.set(nextDepth, level);
          maxDepth = Math.max(maxDepth, nextDepth);
        }
      }
      const maxRows = Math.max(0, ...[...levels.values()].map((items) => items.length));
      return {
        section,
        levels,
        height: Math.max(SECTION_GAP_Y, 180 + maxRows * COMPONENT_GAP_Y),
      };
    });
    const width = Math.max(1_000, 780 + maxDepth * COMPONENT_GAP_X);
    const plan = { page, sections: sectionPlans, width, x: pageColumnX };
    pageColumnX += width;
    return plan;
  });

  const contentWidth = pageColumnX || PAGE_START_X + 500;
  positions.set(root.id, {
    nodeId: root.id,
    x: Math.max(0, Math.round((contentWidth - 240) / 2)),
    y: 60,
  });

  for (const plan of pagePlans) {
    positions.set(plan.page.id, { nodeId: plan.page.id, x: plan.x, y: PAGE_Y });
    let sectionY = SECTION_START_Y;
    for (const sectionPlan of plan.sections) {
      const section = sectionPlan.section;
      positions.set(section.id, { nodeId: section.id, x: plan.x, y: sectionY });
      for (const [depth, componentIds] of [...sectionPlan.levels.entries()].sort(([a], [b]) => a - b)) {
        componentIds.forEach((nodeId, row) => {
          positions.set(nodeId, {
            nodeId,
            x: plan.x + COMPONENT_START_X + (depth - 1) * COMPONENT_GAP_X,
            y: sectionY + 80 + row * COMPONENT_GAP_Y,
          });
        });
      }
      sectionY += sectionPlan.height;
    }
  }

  const referenceNodes = activeNodes
    .filter((node) => !["website", "page", "section", "component"].includes(node.type))
    .sort((left, right) => left.type.localeCompare(right.type) || left.id.localeCompare(right.id));
  const referenceX = contentWidth + REFERENCE_START_GAP_X;
  referenceNodes.forEach((node, index) => {
    positions.set(node.id, {
      nodeId: node.id,
      x: referenceX,
      y: REFERENCE_START_Y + index * REFERENCE_GAP_Y,
    });
  });

  const result = [...positions.values()].sort((left, right) => left.nodeId.localeCompare(right.nodeId));
  const outOfBounds = result.find((position) =>
    Math.abs(position.x) > MAX_CANVAS_COORDINATE ||
    Math.abs(position.y) > MAX_CANVAS_COORDINATE,
  );
  if (outOfBounds) {
    return failure(
      "STUDIO_LAYOUT_LIMIT_EXCEEDED",
      "The graph is too deep or wide for the supported canvas coordinate range.",
      outOfBounds.nodeId,
    );
  }

  if (result.length !== activeNodes.length) {
    const unplaced = activeNodes.find((node) => !positions.has(node.id));
    return failure(
      "STUDIO_LAYOUT_UNPLACED_NODE",
      "An active graph node could not be assigned a canvas position.",
      unplaced?.id,
    );
  }

  return { ok: true, positions: result, diagnostics: [] };
}
