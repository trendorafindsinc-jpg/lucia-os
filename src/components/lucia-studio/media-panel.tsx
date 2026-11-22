"use client";

import { useCallback, useMemo, useState } from "react";
import type { GraphDocument, GraphNode } from "@/lib/graph/contracts";
import { MediaLibrary, type MediaLibraryItem } from "@/components/editor/media-library";
import styles from "./media-panel.module.css";

type Props = {
  websiteId: string;
  accountId: string;
  document: GraphDocument;
  selectedNode: GraphNode | null;
  headers: Record<string, string>;
  onReloadGraph: () => Promise<void>;
};

export function LuciaStudioMediaPanel({ websiteId, accountId, document, selectedNode, headers, onReloadGraph }: Props) {
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const protectedIds = useMemo(() => document.nodes
    .filter((node) => node.type === "media_reference" && node.lifecycleStatus === "active")
    .map((node) => node.properties.assetId)
    .filter((value): value is string => typeof value === "string"), [document]);
  const canAttach = selectedNode?.type === "section" || selectedNode?.type === "component";
  const onLibraryChange = useCallback((_items: { ref: string; label: string }[]) => {}, []);

  const attachAsset = useCallback(async (asset: MediaLibraryItem) => {
    if (asset.kind !== "image") {
      setNotice("Video and PDF uploads are stored safely and will be available to the blogging workflow. The current website section renderer accepts image attachments only.");
      return;
    }
    if (!selectedNode || (selectedNode.type !== "section" && selectedNode.type !== "component")) {
      setNotice("Select a section or component on the canvas before attaching an image.");
      return;
    }
    const existingReference = document.nodes.find((node) =>
      node.type === "media_reference" && node.lifecycleStatus === "active" && node.properties.assetId === asset.id,
    );
    const referenceNodeId = existingReference?.id ?? crypto.randomUUID();
    const alreadyConnected = document.edges.some((edge) =>
      edge.type === "references_media" && edge.sourceNodeId === selectedNode.id && edge.targetNodeId === referenceNodeId,
    );
    if (alreadyConnected) {
      setNotice("This image is already attached to the selected graph node.");
      return;
    }

    const operations: Array<Record<string, unknown>> = [];
    if (!existingReference) {
      operations.push({
        type: "CREATE_NODE",
        node: {
          id: referenceNodeId,
          graphId: document.id,
          type: "media_reference",
          schemaVersion: 1,
          properties: { assetId: asset.id },
          lifecycleStatus: "active",
        },
      });
    }
    operations.push({
      type: "CONNECT_NODES",
      edge: {
        id: crypto.randomUUID(),
        graphId: document.id,
        sourceNodeId: selectedNode.id,
        targetNodeId: referenceNodeId,
        type: "references_media",
        schemaVersion: 1,
        properties: {},
      },
    });

    setSaving(true);
    setNotice("Attaching the image to the website graph…");
    try {
      const response = await fetch(`/api/websites/${encodeURIComponent(websiteId)}/graph/mutations`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          websiteId,
          expectedRevision: document.revision,
          idempotencyKey: crypto.randomUUID(),
          operationSchemaVersion: 1,
          operations,
        }),
      });
      const result = await response.json() as { error?: string; code?: string };
      if (!response.ok) {
        if (response.status === 409) {
          await onReloadGraph();
          throw new Error("The graph changed in another session. The latest graph has been loaded; select the image again to retry.");
        }
        throw new Error(result.error || "The image could not be attached.");
      }
      await onReloadGraph();
      setNotice("Image attached. The graph now contains a secure media reference; the stored object key remains private.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The image could not be attached.");
    } finally {
      setSaving(false);
    }
  }, [selectedNode, document, websiteId, headers, onReloadGraph]);

  return (
    <section className={styles.panel} aria-label="Lucia Studio media library">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>LUCIA OS · ASSET LIBRARY</p>
          <h2>Media Library</h2>
          <p>Upload once, then reuse owned assets across this website's graph and blogging tools.</p>
        </div>
        <div className={styles.selection}>
          <strong>{canAttach ? "Ready to attach" : "Choose a section or component"}</strong>
          <span>{canAttach ? String(selectedNode?.properties.heading ?? selectedNode?.properties.title ?? selectedNode?.type) : "Image attachment needs a section or component node."}</span>
        </div>
      </header>
      {notice ? <p className={styles.notice} role="status" aria-live="polite">{notice}</p> : null}
      {saving ? <p className={styles.progress} role="status">Saving graph reference…</p> : null}
      <div className={styles.library}>
        <MediaLibrary
          websiteId={websiteId}
          accountId={accountId}
          onChange={onLibraryChange}
          protectedIds={protectedIds}
          onInsert={(item) => { void attachAsset(item); }}
          insertLabel={canAttach ? "Attach to selected node" : "Select a section first"}
          defaultOpen
        />
      </div>
      <p className={styles.footer}>Assets remain private until referenced by an authorized published page or article. Removing an asset is blocked while drafts, published content, graph history or article revisions still reference it.</p>
    </section>
  );
}
