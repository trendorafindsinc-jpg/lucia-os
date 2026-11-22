"use client";

import { useEffect, useRef, useState } from "react";
import type { GraphDocument, GraphNode } from "@/lib/graph/contracts";
import {
  pageInspectorSchema,
  sectionInspectorSchema,
  sectionPropertiesFromInspector,
  websiteInspectorSchema,
} from "@/lib/studio/inspector-contracts";
import styles from "./node-canvas.module.css";

type Draft = {
  name?: string;
  title?: string;
  path?: string;
  recipeId?: string;
  heading?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  items?: Array<{ heading: string; description: string }>;
};
type InspectorRelation = { edgeId: string; label: string; direction: string; otherNodeId: string; otherTitle: string };
type Props = {
  node: GraphNode;
  document: GraphDocument;
  websiteId: string;
  headers: Record<string, string>;
  onDirtyChange: (dirty: boolean) => void;
  onGraphUpdated: (document: GraphDocument) => void;
  relationships: InspectorRelation[];
  position?: { x: number; y: number; locked: boolean };
  onToggleLock?: () => void;
  onSelectNode: (nodeId: string) => void;
};

function initialDraft(node: GraphNode): Draft {
  if (node.type === "website") return { name: String(node.properties.name ?? "") };
  if (node.type === "page") return {
    title: String(node.properties.title ?? ""),
    path: String(node.properties.path ?? "/"),
  };
  if (node.type === "section") {
    const content = node.properties.content && typeof node.properties.content === "object" && !Array.isArray(node.properties.content)
      ? node.properties.content as Record<string, unknown> : {};
    const recipeId = typeof node.properties.recipeId === "string" &&
      ["lucia.design.section.hero", "lucia.design.section.feature-grid", "lucia.design.section.services"].includes(node.properties.recipeId)
      ? node.properties.recipeId : "lucia.design.section.hero";
    const items = Array.isArray(content.items) ? content.items.flatMap((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return [];
      const value = item as Record<string, unknown>;
      if (typeof value.heading !== "string") return [];
      return [{ heading: value.heading, description: typeof value.description === "string" ? value.description : "" }];
    }) : [];
    return {
      recipeId,
      heading: typeof content.heading === "string" ? content.heading : "",
      description: typeof content.description === "string" ? content.description : "",
      actionLabel: typeof content.actionLabel === "string" ? content.actionLabel : "",
      actionHref: typeof content.actionHref === "string" ? content.actionHref : "",
      items,
    };
  }
  return {};
}

export function LuciaStudioNodeInspector({
  node, document, websiteId, headers, onDirtyChange, onGraphUpdated, relationships, position, onToggleLock, onSelectNode,
}: Props) {
  const [draft, setDraft] = useState<Draft>(() => initialDraft(node));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [conflictRevision, setConflictRevision] = useState<number | null>(null);
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);
  const [savedRevision, setSavedRevision] = useState<number | null>(null);\n  const preserveDraftRef = useRef(false);

  useEffect(() => {\n    if (preserveDraftRef.current) { preserveDraftRef.current = false; return; }\n    setDraft(initialDraft(node));
    setDirty(false);
    setError("");
    setFieldErrors([]);
    setConflictRevision(null);
    setSavedRevision(null);
    onDirtyChange(false);
  }, [node.id, node.properties, onDirtyChange, preserveDraftRef]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const editable = node.type === "website" || node.type === "page" || node.type === "section";
  const setValue = (key: keyof Draft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setDirty(true);
    onDirtyChange(true);
    setError("");
    setFieldErrors([]);
  };
  const setItem = (index: number, key: "heading" | "description", value: string) => {
    setDraft((current) => ({
      ...current,
      items: (current.items ?? []).map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item),
    }));
    setDirty(true);
    onDirtyChange(true);
    setError("");
  };
  const addItem = () => {
    if ((draft.items?.length ?? 0) >= 24) return;
    setDraft((current) => ({ ...current, items: [...(current.items ?? []), { heading: "", description: "" }] }));
    setDirty(true);
    onDirtyChange(true);
  };
  const removeItem = (index: number) => {
    setDraft((current) => ({ ...current, items: (current.items ?? []).filter((_, itemIndex) => itemIndex !== index) }));
    setDirty(true);
    onDirtyChange(true);
  };

  const makeProperties = (): Record<string, unknown> | null => {
    if (node.type === "website") {
      const parsed = websiteInspectorSchema.safeParse({ name: draft.name });
      if (!parsed.success) { setFieldErrors(parsed.error.issues.map((issue) => issue.message)); return null; }
      return { ...node.properties, ...parsed.data };
    }
    if (node.type === "page") {
      const parsed = pageInspectorSchema.safeParse({ title: draft.title, path: draft.path });
      if (!parsed.success) { setFieldErrors(parsed.error.issues.map((issue) => issue.message)); return null; }
      return { ...node.properties, ...parsed.data };
    }
    if (node.type === "section") {
      const parsed = sectionInspectorSchema.safeParse({
        recipeId: draft.recipeId,
        heading: draft.heading,
        description: draft.description ?? "",
        actionLabel: draft.actionLabel ?? "",
        actionHref: draft.actionHref ?? "",
        ...(draft.items?.length ? { items: draft.items } : {}),
      });
      if (!parsed.success) { setFieldErrors(parsed.error.issues.map((issue) => issue.message)); return null; }
      return sectionPropertiesFromInspector(parsed.data, node.properties);
    }
    return null;
  };

  const fetchLatest = async (): Promise<GraphDocument> => {
    const response = await fetch(`/api/websites/${encodeURIComponent(websiteId)}/graph`, { headers, cache: "no-store" });
    const payload = await response.json() as { graph?: { document: GraphDocument } | null; error?: string };
    if (!response.ok || !payload.graph) throw new Error(payload.error || "The latest graph revision could not be loaded.");
    return payload.graph.document;
  };

  const submit = async (expectedRevision: number) => {
    const properties = makeProperties();
    if (!properties) return;
    setSaving(true);
    setError("");
    setFieldErrors([]);
    try {
      const response = await fetch(`/api/websites/${encodeURIComponent(websiteId)}/graph/mutations`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          websiteId,
          expectedRevision,
          idempotencyKey: crypto.randomUUID(),
          operationSchemaVersion: 1,
          operations: [{ type: "UPDATE_NODE", nodeId: node.id, properties }],
        }),
      });
      const result = await response.json() as { error?: string; code?: string; revision?: number };
      if (response.status === 409 && result.code === "CONFLICT") {
        const latest = await fetchLatest();
        onGraphUpdated(latest);
        setConflictRevision(latest.revision);
        setError("Another editor saved a newer graph revision. Your local draft is preserved; choose whether to reapply it or reload the latest values.");
        return;
      }
      if (!response.ok) throw new Error(result.error || "The graph mutation could not be saved.");
      const latest = await fetchLatest();
      onGraphUpdated(latest);
      setDraft(initialDraft(latest.nodes.find((candidate) => candidate.id === node.id) ?? node));
      setDirty(false);
      onDirtyChange(false);
      setConflictRevision(null);
      setSavedRevision(latest.revision);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The graph mutation could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const reloadLatest = async () => {
    setSaving(true);
    try {
      const latest = await fetchLatest();
      onGraphUpdated(latest);
      const latestNode = latest.nodes.find((candidate) => candidate.id === node.id);
      if (latestNode) setDraft(initialDraft(latestNode));
      setDirty(false);
      onDirtyChange(false);
      setConflictRevision(null);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The latest graph could not be loaded.");
    } finally {
      setSaving(false);
    }
  };

  const cardEditor = node.type === "section" && draft.recipeId !== "lucia.design.section.hero";

  return (
    <aside className={styles.inspector} aria-label="Node inspector">
      <div className={styles.inspectorHeader}>
        <p className={styles.eyebrow}>CONTEXTUAL INSPECTOR</p>
        <h2>{node.type === "website" ? draft.name || "Website" : node.type === "page" ? draft.title || "Page" : node.type === "section" ? draft.heading || "Section" : node.type.replaceAll("_", " ")}</h2>
        <span>{node.type.replaceAll("_", " ")}</span>
      </div>
      <div className={styles.inspectorSection}>
        <h3>Node identity</h3>
        <dl>
          <dt>Node ID</dt><dd>{node.id}</dd>
          <dt>Graph revision</dt><dd>{document.revision}</dd>
          <dt>Schema version</dt><dd>{node.schemaVersion}</dd>
          <dt>Lifecycle</dt><dd>{node.lifecycleStatus}</dd>
        </dl>
      </div>

      {editable ? (
        <form className={styles.inspectorForm} onSubmit={(event) => { event.preventDefault(); void submit(conflictRevision ?? document.revision); }}>
          <div className={styles.inspectorSection}>
            <h3>Website content</h3>
            {node.type === "website" ? (
              <label className={styles.field}>Website name
                <input value={draft.name ?? ""} maxLength={120} onChange={(event) => setValue("name", event.target.value)} />
              </label>
            ) : null}
            {node.type === "page" ? (
              <>
                <label className={styles.field}>Page title
                  <input value={draft.title ?? ""} maxLength={120} onChange={(event) => setValue("title", event.target.value)} />
                </label>
                <label className={styles.field}>Local route
                  <input value={draft.path ?? ""} maxLength={240} spellCheck={false} onChange={(event) => setValue("path", event.target.value)} />
                </label>
                <p className={styles.helper}>Use a local path such as /, /about or /services. External destinations are not accepted.</p>
              </>
            ) : null}
            {node.type === "section" ? (
              <>
                <label className={styles.field}>Section type
                  <select value={draft.recipeId ?? "lucia.design.section.hero"} onChange={(event) => setValue("recipeId", event.target.value)}>
                    <option value="lucia.design.section.hero">Hero</option>
                    <option value="lucia.design.section.feature-grid">Feature cards</option>
                    <option value="lucia.design.section.services">Service cards</option>
                  </select>
                </label>
                <label className={styles.field}>Heading
                  <input value={draft.heading ?? ""} maxLength={240} onChange={(event) => setValue("heading", event.target.value)} />
                </label>
                <label className={styles.field}>Description
                  <textarea value={draft.description ?? ""} maxLength={4000} rows={4} onChange={(event) => setValue("description", event.target.value)} />
                </label>
                {draft.recipeId === "lucia.design.section.hero" ? (
                  <>
                    <label className={styles.field}>Button label (optional)
                      <input value={draft.actionLabel ?? ""} maxLength={100} onChange={(event) => setValue("actionLabel", event.target.value)} />
                    </label>
                    <label className={styles.field}>Button destination (optional)
                      <input value={draft.actionHref ?? ""} maxLength={240} onChange={(event) => setValue("actionHref", event.target.value)} />
                    </label>
                  </>
                ) : null}
                {cardEditor ? (
                  <div className={styles.cardEditor}>
                    <div className={styles.cardEditorHeader}><strong>{draft.recipeId === "lucia.design.section.services" ? "Service cards" : "Feature cards"}</strong><span>{draft.items?.length ?? 0}/24</span></div>
                    {(draft.items ?? []).map((item, index) => (
                      <fieldset className={styles.cardFieldset} key={index}>
                        <legend>Card {index + 1}</legend>
                        <label className={styles.field}>Card title
                          <input value={item.heading} maxLength={160} onChange={(event) => setItem(index, "heading", event.target.value)} />
                        </label>
                        <label className={styles.field}>Card description
                          <textarea value={item.description} maxLength={1000} rows={3} onChange={(event) => setItem(index, "description", event.target.value)} />
                        </label>
                        <button type="button" className={styles.removeCard} onClick={() => removeItem(index)}>Remove card</button>
                      </fieldset>
                    ))}
                    <button type="button" className={styles.secondaryAction} onClick={addItem} disabled={(draft.items?.length ?? 0) >= 24}>Add card</button>
                  </div>
                ) : null}
              </>
            ) : null}
            {fieldErrors.length ? <ul className={styles.fieldErrors} role="alert">{fieldErrors.map((message, index) => <li key={index}>{message}</li>)}</ul> : null}
            {error ? <p className={styles.inspectorError} role="alert">{error}</p> : null}
            {conflictRevision !== null ? (
              <div className={styles.conflictPanel}>
                <strong>Revision conflict · latest is {conflictRevision}</strong>
                <p>Your unsaved values are still here. Reapply submits them against the latest revision and creates a new revision; reload discards this local draft.</p>
                <div className={styles.formActions}>
                  <button type="submit" disabled={saving}>{saving ? "Saving…" : "Reapply my draft"}</button>
                  <button type="button" className={styles.secondaryAction} onClick={() => void reloadLatest()} disabled={saving}>Reload latest</button>
                </div>
              </div>
            ) : (
              <div className={styles.formActions}>
                <button type="submit" disabled={!dirty || saving}>{saving ? "Saving…" : "Save changes"}</button>
                <button type="button" className={styles.secondaryAction} disabled={!dirty || saving} onClick={() => { setDraft(initialDraft(node)); setDirty(false); onDirtyChange(false); setFieldErrors([]); setError(""); }}>Discard</button>
              </div>
            )}
            {savedRevision !== null ? <p className={styles.savedRevision} role="status">Saved as graph revision {savedRevision}.</p> : null}
            {dirty ? <p className={styles.dirtyNotice} role="status">Unsaved inspector changes · save or discard before leaving this node.</p> : null}
          </div>
        </form>
      ) : (
        <div className={styles.inspectorSection}>
          <h3>Registered properties</h3>
          <dl>{Object.entries(node.properties).map(([key, value]) => <div className={styles.property} key={key}><dt>{key}</dt><dd>{JSON.stringify(value)}</dd></div>)}</dl>
          <p className={styles.helper}>This node type is currently read-only in the inspector.</p>
        </div>
      )}
      <div className={styles.inspectorSection}>
        <h3>Relationships</h3>
        {relationships.length ? relationships.map((relation) => (
          <button className={styles.relationship} key={relation.edgeId} type="button" onClick={() => onSelectNode(relation.otherNodeId)}>
            <span>{relation.label}</span><strong>{relation.otherTitle}</strong><small>{relation.direction}</small>
          </button>
        )) : <p className={styles.helper}>No connected relationships.</p>}
      </div>
      {position ? <div className={styles.inspectorSection}>
        <h3>Canvas position</h3>
        <dl><dt>Horizontal</dt><dd>{Math.round(position.x)} px</dd><dt>Vertical</dt><dd>{Math.round(position.y)} px</dd></dl>
        <button type="button" className={styles.lockButton} onClick={onToggleLock} disabled={!onToggleLock || saving}>{position.locked ? "Unlock position" : "Lock position"}</button>
        <p className={styles.helper}>Canvas positions remain personal workspace state and do not change the content revision.</p>
      </div> : null}
    </aside>
  );
}
