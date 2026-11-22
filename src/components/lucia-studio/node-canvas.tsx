"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  applyStudioAutoLayout,
  computeStudioAutoLayout,
  type SavedStudioCanvasPosition,
} from "@/lib/studio/auto-layout";
import type { GraphDocument, GraphEdge, GraphNode } from "@/lib/graph/contracts";
import { useWorkspaceTab } from "@/components/workspace/workspace-tab-shell";
import styles from "./node-canvas.module.css";

type Position = { x: number; y: number; locked: boolean };
type GraphPayload = {
  graph: null | { document: GraphDocument; canvasPositions: { nodeId: string; x: number; y: number; locked: boolean }[] };
};
type DragState = { nodeId: string; pointerId: number; startX: number; startY: number; originX: number; originY: number; moved: boolean };
type PanState = { pointerId: number; startX: number; startY: number; originX: number; originY: number };

const NODE_SIZE = { width: 232, height: 104 };
const MAX_STUDIO_CANVAS_EDGES = 4_000;
const EDGE_LABELS: Record<GraphEdge["type"], string> = {
  contains_page: "page",
  contains_section: "section",
  contains_component: "component",
  uses_design_token: "uses token",
  binds_shared_data: "binds data",
  references_media: "uses media",
  configures_interaction: "interaction",
  has_responsive_config: "responsive",
};
const NODE_LABELS: Record<GraphNode["type"], string> = {
  website: "Website",
  page: "Page",
  section: "Section",
  component: "Component",
  design_token: "Design token",
  shared_data: "Shared data",
  interaction: "Interaction",
  responsive_config: "Responsive config",
  media_reference: "Media reference",
};

function nodeTitle(node: GraphNode): string {
  const p = node.properties;
  for (const key of ["name", "title", "heading", "label", "category", "key", "assetId", "dataSchemaId"]) {
    const value = p[key];
    if (typeof value === "string" && value.trim()) return value.trim().slice(0, 100);
  }
  return NODE_LABELS[node.type];
}

function nodeSubtitle(node: GraphNode): string {
  if (node.type === "page" && typeof node.properties.path === "string") return node.properties.path;
  if (node.type === "design_token" && typeof node.properties.namespace === "string" && typeof node.properties.key === "string")
    return node.properties.namespace + "." + node.properties.key;
  if (node.type === "shared_data" && typeof node.properties.dataSchemaId === "string") return node.properties.dataSchemaId;
  return node.id.slice(0, 8);
}

function propertyText(value: unknown): string {
  try {
    const serialized = JSON.stringify(value);
    return serialized === undefined ? "—" : serialized.length > 360 ? serialized.slice(0, 357) + "…" : serialized;
  } catch {
    return "Unavailable";
  }
}

function relationColor(type: GraphEdge["type"]): string {
  if (type.startsWith("contains_")) return "#8997b5";
  if (type === "references_media") return "#2e8b83";
  if (type === "uses_design_token") return "#9a70c5";
  if (type === "binds_shared_data") return "#bd8841";
  return "#6477c8";
}

export function LuciaStudioNodeCanvas({
  websiteId,
  organizationId,
}: {
  websiteId: string;
  organizationId: string;
}) {
  const { accountId } = useWorkspaceTab();
  const [document, setDocument] = useState<GraphDocument | null>(null);
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(0.82);
  const [pan, setPan] = useState({ x: 48, y: 42 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const panRef = useRef<PanState | null>(null);
  const positionsRef = useRef(positions);
  const didInitialFit = useRef(false);
  positionsRef.current = positions;
  const headers = useMemo(() => ({
    "Content-Type": "application/json",
    "X-LUCIA-Workspace-Organization": organizationId,
    ...(accountId ? { "X-LUCIA-Workspace-Account": accountId } : {}),
  }), [organizationId, accountId]);

  const loadGraph = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/websites/${encodeURIComponent(websiteId)}/graph`, {
        headers, cache: "no-store", signal,
      });
      const payload = await response.json() as GraphPayload & { error?: string };
      if (!response.ok) throw new Error(payload.error || "The website graph could not be loaded.");
      if (!payload.graph) {
        setDocument(null);
        setPositions({});
        setSelectedId(null);
        setNotice("No website graph exists yet. Initialize a blank graph only when you are ready to begin graph-native authoring.");
        return;
      }
      const graph = payload.graph.document;
      const activeIds = new Set(graph.nodes.filter((node) => node.lifecycleStatus === "active").map((node) => node.id));
      const activeEdgeCount = graph.edges.filter((edge) => activeIds.has(edge.sourceNodeId) && activeIds.has(edge.targetNodeId)).length;
      if (activeEdgeCount > MAX_STUDIO_CANVAS_EDGES) {
        throw new Error(`This canvas currently supports up to ${MAX_STUDIO_CANVAS_EDGES.toLocaleString()} active relationships. The graph itself remains unchanged.`);
      }
      const automatic = computeStudioAutoLayout(graph);
      if (!automatic.ok) throw new Error(automatic.diagnostics[0]?.message || "The graph cannot be laid out.");
      const saved = payload.graph.canvasPositions ?? [];
      const merged: Record<string, Position> = {};
      for (const position of automatic.positions) {
        const existing = saved.find((item) => item.nodeId === position.nodeId);
        merged[position.nodeId] = existing
          ? { x: existing.x, y: existing.y, locked: existing.locked }
          : { x: position.x, y: position.y, locked: false };
      }
      setDocument(graph);
      setPositions(merged);
      setSelectedId((current) => current && graph.nodes.some((node) => node.id === current && node.lifecycleStatus === "active")
        ? current : graph.nodes.find((node) => node.type === "website" && node.lifecycleStatus === "active")?.id ?? null);
      setNotice(`Graph revision ${graph.revision} loaded. Canvas positions are personal workspace state.`);
    } catch (cause) {
      if (cause instanceof Error && cause.name === "AbortError") return;
      setError(cause instanceof Error ? cause.message : "The graph could not be loaded.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [websiteId, headers]);

  useEffect(() => {
    const controller = new AbortController();
    void loadGraph(controller.signal);
    return () => controller.abort();
  }, [loadGraph]);

  const initializeGraph = useCallback(async () => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/websites/${encodeURIComponent(websiteId)}/graph`, {
        method: "POST", headers, body: "{}",
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "The website graph could not be initialized.");
      await loadGraph();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The website graph could not be initialized.");
    } finally {
      setSaving(false);
    }
  }, [websiteId, headers, loadGraph]);

  const savePosition = useCallback(async (nodeId: string, position: Position) => {
    const response = await fetch(`/api/websites/${encodeURIComponent(websiteId)}/graph/canvas`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ nodeId, x: position.x, y: position.y, locked: position.locked }),
    });
    const result = await response.json() as { error?: string; graphRevision?: number };
    if (!response.ok) throw new Error(result.error || "Canvas position could not be saved.");
  }, [websiteId, headers]);

  const savePositionsBatch = useCallback(async (entries: { nodeId: string; x: number; y: number; locked: boolean }[]) => {
    if (!entries.length) return;
    const response = await fetch(`/api/websites/${encodeURIComponent(websiteId)}/graph/canvas`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ positions: entries }),
    });
    const result = await response.json() as { error?: string; saved?: number };
    if (!response.ok) throw new Error(result.error || "Canvas positions could not be saved.");
  }, [websiteId, headers]);

  const activeNodes = useMemo(() => document?.nodes.filter((node) => node.lifecycleStatus === "active") ?? [], [document]);
  const activeNodeIds = useMemo(() => new Set(activeNodes.map((node) => node.id)), [activeNodes]);
  const activeEdges = useMemo(() => document?.edges.filter((edge) =>
    activeNodeIds.has(edge.sourceNodeId) && activeNodeIds.has(edge.targetNodeId),
  ) ?? [], [document, activeNodeIds]);
  const selectedNode = activeNodes.find((node) => node.id === selectedId) ?? null;

  const canvasExtent = useMemo(() => {
    const values = Object.values(positions);
    return {
      width: Math.max(2200, ...values.map((p) => p.x + NODE_SIZE.width + 240)),
      height: Math.max(1500, ...values.map((p) => p.y + NODE_SIZE.height + 240)),
    };
  }, [positions]);

  const fitView = useCallback(() => {
    const viewport = canvasRef.current;
    const values = Object.values(positionsRef.current);
    if (!viewport || !values.length) {
      setZoom(0.82);
      setPan({ x: 48, y: 42 });
      return;
    }
    const minX = Math.min(...values.map((position) => position.x));
    const minY = Math.min(...values.map((position) => position.y));
    const maxX = Math.max(...values.map((position) => position.x + NODE_SIZE.width));
    const maxY = Math.max(...values.map((position) => position.y + NODE_SIZE.height));
    const width = Math.max(1, maxX - minX);
    const height = Math.max(1, maxY - minY);
    const scale = Math.min(1.5, Math.max(0.35, Math.min(
      (viewport.clientWidth - 100) / width,
      (viewport.clientHeight - 100) / height,
    )));
    setZoom(scale);
    setPan({
      x: viewport.clientWidth / 2 - ((minX + maxX) / 2) * scale,
      y: viewport.clientHeight / 2 - ((minY + maxY) / 2) * scale,
    });
  }, []);

  useEffect(() => {
    if (document && Object.keys(positions).length && !didInitialFit.current) {
      didInitialFit.current = true;
      fitView();
    }
  }, [document, positions, fitView]);

  const updateNodePosition = (nodeId: string, x: number, y: number) => {
    setPositions((current) => ({
      ...current,
      [nodeId]: { ...current[nodeId], x, y },
    }));
  };

  const onNodePointerDown = (event: ReactPointerEvent<HTMLButtonElement>, nodeId: string) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedId(nodeId);
    const position = positionsRef.current[nodeId];
    if (!position || position.locked) return;
    dragRef.current = {
      nodeId, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY,
      originX: position.x, originY: position.y, moved: false,
    };
  };

  const onNodePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = (event.clientX - drag.startX) / zoom;
    const dy = (event.clientY - drag.startY) / zoom;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
    if (drag.moved) updateNodePosition(drag.nodeId, drag.originX + dx, drag.originY + dy);
  };

  const onNodePointerUp = async (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (!drag.moved) return;
    const position = positionsRef.current[drag.nodeId];
    if (!position) return;
    setSaving(true);
    setNotice("Saving canvas position…");
    try {
      await savePosition(drag.nodeId, position);
      setNotice("Canvas position saved. Website content revision unchanged.");
    } catch (cause) {
      updateNodePosition(drag.nodeId, drag.originX, drag.originY);
      setError(cause instanceof Error ? cause.message : "Canvas position could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const onCanvasPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target instanceof Element && event.target.closest("button, a"))) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    panRef.current = {
      pointerId: event.pointerId, startX: event.clientX, startY: event.clientY,
      originX: pan.x, originY: pan.y,
    };
  };
  const onCanvasPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = panRef.current;
    if (!current || current.pointerId !== event.pointerId) return;
    setPan({ x: current.originX + event.clientX - current.startX, y: current.originY + event.clientY - current.startY });
  };
  const onCanvasPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (panRef.current?.pointerId === event.pointerId) panRef.current = null;
  };
  const onWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    event.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const nextZoom = Math.min(1.6, Math.max(0.35, zoom * (event.deltaY < 0 ? 1.1 : 0.9)));
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    const worldX = (localX - pan.x) / zoom;
    const worldY = (localY - pan.y) / zoom;
    setPan({ x: localX - worldX * nextZoom, y: localY - worldY * nextZoom });
    setZoom(nextZoom);
  };

  const arrange = async () => {
    if (!document) return;
    const saved: SavedStudioCanvasPosition[] = Object.entries(positionsRef.current).map(([nodeId, p]) => ({ nodeId, ...p }));
    const result = applyStudioAutoLayout(document, saved);
    if (!result.ok) {
      setError(result.diagnostics[0]?.message || "Automatic organization failed.");
      return;
    }
    const next: Record<string, Position> = {};
    for (const position of result.positions) {
      const prior = positionsRef.current[position.nodeId];
      next[position.nodeId] = { ...position, locked: prior?.locked ?? false };
    }
    setPositions(next);
    setSaving(true);
    setError("");
    setNotice("Organizing unlocked nodes and saving canvas positions…");
    try {
      const movable = Object.entries(next)
        .filter(([, position]) => !position.locked)
        .map(([nodeId, position]) => ({ nodeId, ...position }));
      await savePositionsBatch(movable);
      setNotice(`Canvas organized. ${Object.keys(next).length - movable.length} locked nodes stayed in place; website content revision unchanged.`);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Some canvas positions could not be saved. Reload to reconcile.";
      await loadGraph();
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const toggleLock = async () => {
    if (!selectedNode || !positions[selectedNode.id]) return;
    const current = positions[selectedNode.id];
    const next = { ...current, locked: !current.locked };
    setPositions((all) => ({ ...all, [selectedNode.id]: next }));
    setSaving(true);
    try {
      await savePosition(selectedNode.id, next);
      setNotice(next.locked ? "Node position locked." : "Node position unlocked.");
    } catch (cause) {
      setPositions((all) => ({ ...all, [selectedNode.id]: current }));
      setError(cause instanceof Error ? cause.message : "Lock state could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const keyboardMove = async (event: ReactKeyboardEvent<HTMLButtonElement>, nodeId: string) => {
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    const current = positionsRef.current[nodeId];
    if (!current || current.locked) return;
    const step = event.shiftKey ? 40 : 10;
    const next = {
      ...current,
      x: current.x + (event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0),
      y: current.y + (event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0),
    };
    updateNodePosition(nodeId, next.x, next.y);
    setSaving(true);
    try {
      await savePosition(nodeId, next);
      setNotice("Keyboard canvas position saved.");
    } catch (cause) {
      updateNodePosition(nodeId, current.x, current.y);
      setError(cause instanceof Error ? cause.message : "Canvas position could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <main className={styles.loading} aria-live="polite">Opening Lucia Studio graph…</main>;
  if (error && !document) return <main className={styles.failure}><h1>Studio could not open</h1><p role="alert">{error}</p><button type="button" onClick={() => void loadGraph()}>Try again</button></main>;
  if (!document) return <main className={styles.failure}>
    <h1>Start with a website graph</h1>
    <p>{error || notice || "No graph has been created for this website yet."}</p>
    <p>Creating a blank graph adds the website root only. It does not import, overwrite, publish or change your existing website content.</p>
    <button type="button" onClick={() => void initializeGraph()} disabled={saving}>{saving ? "Creating graph…" : "Initialize blank graph"}</button>
    <a href={`/editor?websiteId=${encodeURIComponent(websiteId)}`}>Open the legacy editor instead</a>
  </main>;

  return (
    <main className={styles.studio}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">L</span>
          <div><p className={styles.eyebrow}>LUCIA OS · STUDIO</p><h1>Website graph</h1><p className={styles.revision}>Content revision {document.revision}</p></div>
        </div>
        <div className={styles.actions}>
          <span className={styles.saveState} role="status">{saving ? "Saving canvas…" : "Canvas synced"}</span>
          <button type="button" onClick={() => void arrange()} disabled={saving}>Auto-organize</button>
          <button type="button" onClick={fitView}>Fit to view</button>
          <a href="/workspace/websites">All websites</a>
        </div>
      </header>
      {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      <div className={styles.workspace}>
        <section className={styles.canvasPanel} aria-label="Website node canvas">
          <div className={styles.canvasToolbar}>
            <div><strong>{activeNodes.length} nodes</strong><span>{activeEdges.length} relationships</span></div>
            <div className={styles.zoomControls}>
              <button type="button" aria-label="Zoom out" onClick={() => setZoom((v) => Math.max(0.35, v - 0.1))}>−</button>
              <output aria-label="Zoom level">{Math.round(zoom * 100)}%</output>
              <button type="button" aria-label="Zoom in" onClick={() => setZoom((v) => Math.min(1.6, v + 0.1))}>+</button>
            </div>
          </div>
          <div
            ref={canvasRef}
            className={styles.viewport}
            onPointerDown={onCanvasPointerDown}
            onPointerMove={onCanvasPointerMove}
            onPointerUp={onCanvasPointerUp}
            onPointerCancel={onCanvasPointerUp}
            onWheel={onWheel}
          >
            <div className={styles.world} style={{ width: canvasExtent.width, height: canvasExtent.height, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
              <svg className={styles.edges} width={canvasExtent.width} height={canvasExtent.height} aria-hidden="true">
                {activeEdges.map((edge) => {
                  const source = positions[edge.sourceNodeId], target = positions[edge.targetNodeId];
                  if (!source || !target) return null;
                  const x1 = source.x + NODE_SIZE.width / 2, y1 = source.y + NODE_SIZE.height / 2;
                  const x2 = target.x + NODE_SIZE.width / 2, y2 = target.y + NODE_SIZE.height / 2;
                  const middleX = (x1 + x2) / 2, middleY = (y1 + y2) / 2;
                  return <g key={edge.id}>
                    <path d={`M ${x1} ${y1} C ${middleX} ${y1}, ${middleX} ${y2}, ${x2} ${y2}`} fill="none" stroke={relationColor(edge.type)} strokeWidth="2.2" opacity=".78" />
                    <circle cx={x2} cy={y2} r="4" fill={relationColor(edge.type)} />
                    <text x={middleX} y={middleY - 7} className={styles.edgeLabel}>{EDGE_LABELS[edge.type]}</text>
                  </g>;
                })}
              </svg>
              {activeNodes.map((node) => {
                const position = positions[node.id];
                if (!position) return null;
                const selected = selectedId === node.id;
                return <button
                  type="button"
                  key={node.id}
                  className={`${styles.node} ${styles["node_" + node.type]} ${selected ? styles.nodeSelected : ""} ${position.locked ? styles.nodeLocked : ""}`}
                  style={{ left: position.x, top: position.y } as CSSProperties}
                  aria-pressed={selected}
                  aria-label={`${NODE_LABELS[node.type]}: ${nodeTitle(node)}${position.locked ? ", position locked" : ""}`}
                  onClick={() => setSelectedId(node.id)}
                  onPointerDown={(event) => onNodePointerDown(event, node.id)}
                  onPointerMove={onNodePointerMove}
                  onPointerUp={onNodePointerUp}
                  onPointerCancel={onNodePointerUp}
                  onKeyDown={(event) => void keyboardMove(event, node.id)}
                  title={position.locked ? "Position locked. Unlock in the inspector to move." : "Drag to move; use arrow keys for precise positioning."}
                >
                  <span className={styles.nodeType}>{NODE_LABELS[node.type]}{position.locked ? <span aria-label="Locked"> · Locked</span> : null}</span>
                  <strong>{nodeTitle(node)}</strong>
                  <span className={styles.nodeSubtitle}>{nodeSubtitle(node)}</span>
                  <span className={styles.nodeId}>{node.id.slice(0, 8)}</span>
                </button>;
              })}
            </div>
            <div className={styles.canvasHint}>Drag nodes to arrange · Drag empty space to pan · Scroll to zoom</div>
          </div>
          <div className={styles.nodeOutline}>
            <strong>Node outline</strong>
            <div>{activeNodes.map((node) => <button key={node.id} type="button" aria-current={selectedId === node.id ? "true" : undefined} onClick={() => setSelectedId(node.id)}>{NODE_LABELS[node.type]} · {nodeTitle(node)}</button>)}</div>
          </div>
        </section>
        <aside className={styles.inspector} aria-label="Node inspector">
          {selectedNode ? <>
            <div className={styles.inspectorHeader}><p className={styles.eyebrow}>CONTEXTUAL INSPECTOR</p><h2>{nodeTitle(selectedNode)}</h2><span>{NODE_LABELS[selectedNode.type]}</span></div>
            <div className={styles.inspectorSection}><h3>Node identity</h3><dl><dt>Node ID</dt><dd>{selectedNode.id}</dd><dt>Graph revision</dt><dd>{document.revision}</dd><dt>Schema version</dt><dd>{selectedNode.schemaVersion}</dd><dt>Lifecycle</dt><dd>{selectedNode.lifecycleStatus}</dd></dl></div>
            <div className={styles.inspectorSection}><h3>Relationships</h3>
              {activeEdges.filter((edge) => edge.sourceNodeId === selectedNode.id || edge.targetNodeId === selectedNode.id).length
                ? activeEdges.filter((edge) => edge.sourceNodeId === selectedNode.id || edge.targetNodeId === selectedNode.id).map((edge) => {
                  const otherId = edge.sourceNodeId === selectedNode.id ? edge.targetNodeId : edge.sourceNodeId;
                  const other = activeNodes.find((node) => node.id === otherId);
                  return <button className={styles.relationship} key={edge.id} type="button" onClick={() => setSelectedId(otherId)}>
                    <span>{EDGE_LABELS[edge.type]}</span><strong>{other ? nodeTitle(other) : "Unknown node"}</strong><small>{edge.sourceNodeId === selectedNode.id ? "Outgoing" : "Incoming"}</small>
                  </button>;
                }) : <p className={styles.empty}>No connected relationships.</p>}
            </div>
            <div className={styles.inspectorSection}><h3>Canvas position</h3>
              <dl><dt>Horizontal</dt><dd>{Math.round(positions[selectedNode.id]?.x ?? 0)} px</dd><dt>Vertical</dt><dd>{Math.round(positions[selectedNode.id]?.y ?? 0)} px</dd></dl>
              <button type="button" className={styles.lockButton} onClick={() => void toggleLock()} disabled={saving}>{positions[selectedNode.id]?.locked ? "Unlock position" : "Lock position"}</button>
              <p className={styles.helper}>Canvas positions belong to your workspace and do not change the website content revision.</p>
            </div>
            <div className={styles.inspectorSection}><h3>Registered properties</h3>
              <dl>{Object.entries(selectedNode.properties).map(([key, value]) => <div className={styles.property} key={key}><dt>{key}</dt><dd>{propertyText(value)}</dd></div>)}</dl>
            </div>
          </> : <p>Select a node to inspect it.</p>}
        </aside>
      </div>
    </main>
  );
}
