import type { GraphDocument, GraphNode } from "@/lib/graph/contracts";
import type { MediaResolver, ResolvedMediaAsset, ResolvedSharedData, SharedDataResolver } from "./contracts";

export type ReferenceResolution =
  | { ok: true; media: ReadonlyMap<string, ResolvedMediaAsset>; sharedData: ReadonlyMap<string, ResolvedSharedData> }
  | { ok: false; code: "MEDIA_NOT_FOUND" | "MEDIA_FORBIDDEN" | "SHARED_DATA_NOT_FOUND" | "UNSUPPORTED_FEATURE"; nodeId: string; message: string };

function safeMedia(value: ResolvedMediaAsset, assetId: string): boolean {
  if (!value || value.assetId !== assetId || typeof value.decorative !== "boolean") return false;
  if (value.decorative ? value.altText !== null : typeof value.altText !== "string" || !value.altText.trim() || value.altText.length > 500) return false;
  if (typeof value.url !== "string" || value.url.length > 2048 || /[\u0000-\u0020\u007f]/.test(value.url)) return false;
  try {
    if (value.url.startsWith("/") && !value.url.startsWith("//")) {
      if (value.url.includes("\\") || /%(?:2f|5c)/i.test(value.url)) return false;
    } else {
      const url = new URL(value.url);
      if (url.protocol !== "https:" || url.username || url.password) return false;
    }
  } catch { return false; }
  return [value.width, value.height].every((n) => n === undefined || (Number.isInteger(n) && n > 0 && n <= 10000));
}

function safeData(value: unknown, depth = 0, seen = new Set<object>()): value is ResolvedSharedData {
  if (!value || typeof value !== "object" || Array.isArray(value) || depth > 8 || seen.has(value)) return false;
  seen.add(value);
  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return false;
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length > 200) return false;
    for (const [key, child] of entries) {
      if (key.length > 120 || ["__proto__", "prototype", "constructor"].includes(key)) return false;
      if (child === null || typeof child === "boolean") continue;
      if (typeof child === "string") { if (child.length > 4000) return false; continue; }
      if (typeof child === "number") { if (!Number.isFinite(child)) return false; continue; }
      if (Array.isArray(child)) {
        if (child.length > 200 || !child.every((item) => item === null || typeof item === "string" || typeof item === "boolean" || (typeof item === "number" && Number.isFinite(item)))) return false;
        continue;
      }
      if (typeof child !== "object" || !safeData(child, depth + 1, seen)) return false;
    }
    return JSON.stringify(value).length <= 64000;
  } catch { return false; }
  finally { seen.delete(value); }
}

export async function resolveRenderReferences(
  graph: GraphDocument,
  sections: readonly GraphNode[],
  mediaResolver?: MediaResolver,
  sharedDataResolver?: SharedDataResolver,
): Promise<ReferenceResolution> {
  const media = new Map<string, ResolvedMediaAsset>();
  const sharedData = new Map<string, ResolvedSharedData>();
  const sectionIds = new Set(sections.map((node) => node.id));
  for (const edge of graph.edges) {
    if (!sectionIds.has(edge.sourceNodeId)) continue;
    const reference = graph.nodes.find((node) => node.id === edge.targetNodeId);
    if (edge.type === "references_media") {
      if (!reference || reference.type !== "media_reference") return { ok: false, code: "MEDIA_NOT_FOUND", nodeId: edge.sourceNodeId, message: "Media reference node is missing." };
      if (!mediaResolver) return { ok: false, code: "MEDIA_NOT_FOUND", nodeId: reference.id, message: "No authorized media resolver is configured." };
      const assetId = reference.properties.assetId;
      if (typeof assetId !== "string") return { ok: false, code: "MEDIA_NOT_FOUND", nodeId: reference.id, message: "Media reference has no valid asset identifier." };
      let asset: ResolvedMediaAsset | null;
      try { asset = await mediaResolver.resolve(assetId, graph.id); }
      catch { return { ok: false, code: "MEDIA_FORBIDDEN", nodeId: reference.id, message: "Media access was denied or could not be verified." }; }
      if (!asset) return { ok: false, code: "MEDIA_NOT_FOUND", nodeId: reference.id, message: "Referenced media asset is unavailable." };
      if (!safeMedia(asset, assetId)) return { ok: false, code: "MEDIA_FORBIDDEN", nodeId: reference.id, message: "Media resolver returned invalid or unsafe metadata." };
      media.set(asset.assetId, asset);
    }
    if (edge.type === "binds_shared_data") {
      if (!reference || reference.type !== "shared_data") return { ok: false, code: "SHARED_DATA_NOT_FOUND", nodeId: edge.sourceNodeId, message: "Shared-data reference node is missing." };
      if (!sharedDataResolver) return { ok: false, code: "SHARED_DATA_NOT_FOUND", nodeId: reference.id, message: "No authorized shared-data resolver is configured." };
      let value: ResolvedSharedData | null;
      try { value = await sharedDataResolver.resolve(reference.id, graph.id); }
      catch { return { ok: false, code: "MEDIA_FORBIDDEN", nodeId: reference.id, message: "Shared-data access was denied or could not be verified." }; }
      if (!value) return { ok: false, code: "SHARED_DATA_NOT_FOUND", nodeId: reference.id, message: "Referenced shared data is unavailable." };
      if (!safeData(value)) return { ok: false, code: "UNSUPPORTED_FEATURE", nodeId: reference.id, message: "Shared-data resolver returned unsafe or unsupported structured data." };
      sharedData.set(reference.id, value);
    }
  }
  return { ok: true, media, sharedData };
}
