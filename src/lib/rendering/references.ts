import type { GraphDocument, GraphNode } from "@/lib/graph/contracts";
import type { MediaResolver, ResolvedMediaAsset, ResolvedSharedData, SharedDataResolver } from "./contracts";

export const MAX_RENDER_REFERENCES = 64;
const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);

export type ReferenceResolution =
  | { ok: true; media: ReadonlyMap<string, ResolvedMediaAsset>; sharedData: ReadonlyMap<string, ResolvedSharedData> }
  | { ok: false; code: "MEDIA_NOT_FOUND" | "MEDIA_FORBIDDEN" | "SHARED_DATA_NOT_FOUND" | "SHARED_DATA_FORBIDDEN" | "UNSUPPORTED_FEATURE" | "RENDER_LIMIT_EXCEEDED"; nodeId: string; message: string };

function safeMedia(value: ResolvedMediaAsset, assetId: string): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return false;
    if (Object.getOwnPropertySymbols(value).length) return false;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (!descriptor.enumerable || !("value" in descriptor) || FORBIDDEN_KEYS.has(key)) return false;
    }
    const item = value as unknown as Record<string, unknown>;
    if (item.assetId !== assetId || typeof item.decorative !== "boolean") return false;
    if (item.decorative ? item.altText !== null : typeof item.altText !== "string" || !item.altText.trim() || item.altText.length > 500) return false;
    if (typeof item.url !== "string" || item.url.length > 2048 || /[\u0000-\u0020\u007f]/.test(item.url)) return false;
    if (item.url.startsWith("/")) {
      if (item.url.startsWith("//") || item.url.includes("\\") || /%(?:2f|5c)/i.test(item.url) || /%25(?:25)*(?:2e|2f|5c)/i.test(item.url)) return false;
      const pathname = item.url.split(/[?#]/, 1)[0];
      let decoded: string;
      try { decoded = decodeURIComponent(pathname); } catch { return false; }
      if (decoded.split("/").some((part) => part === "." || part === "..")) return false;
    } else {
      const url = new URL(item.url);
      if (url.protocol !== "https:" || url.username || url.password || !url.hostname) return false;
    }
    return [item.width, item.height].every((n) => n === undefined || (Number.isInteger(n) && Number(n) > 0 && Number(n) <= 10000));
  } catch { return false; }
}

/** Accept only bounded, inert JSON objects; descriptors are inspected before values are read. */
function safeData(value: unknown, depth = 0, ancestors = new WeakSet<object>()): value is ResolvedSharedData {
  if (!value || typeof value !== "object" || Array.isArray(value) || depth > 8 || ancestors.has(value)) return false;
  ancestors.add(value);
  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return false;
    if (Object.getOwnPropertySymbols(value).length) return false;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Object.keys(descriptors);
    if (keys.length > 200) return false;
    const normalized: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (key.length > 120 || FORBIDDEN_KEYS.has(key) || !descriptor.enumerable || !("value" in descriptor)) return false;
      const child: unknown = descriptor.value;
      if (child === null || typeof child === "boolean") { normalized[key] = child; continue; }
      if (typeof child === "string") { if (child.length > 4000) return false; normalized[key] = child; continue; }
      if (typeof child === "number") { if (!Number.isFinite(child)) return false; normalized[key] = child; continue; }
      if (Array.isArray(child)) {
        if (child.length > 200 || Object.getOwnPropertySymbols(child).length) return false;
        const arrayDescriptors = Object.getOwnPropertyDescriptors(child);
        const indices = Object.keys(arrayDescriptors).filter((name) => name !== "length");
        if (indices.length !== child.length) return false;
        const safeItems: unknown[] = [];
        for (let index = 0; index < child.length; index += 1) {
          const itemDescriptor = arrayDescriptors[String(index)];
          if (!itemDescriptor || !itemDescriptor.enumerable || !("value" in itemDescriptor)) return false;
          const item: unknown = itemDescriptor.value;
          if (!(item === null || typeof item === "boolean" || (typeof item === "number" && Number.isFinite(item)) || typeof item === "string")) return false;
          if (typeof item === "string" && item.length > 4000) return false;
          safeItems.push(item);
        }
        normalized[key] = safeItems;
        continue;
      }
      if (typeof child !== "object" || !safeData(child, depth + 1, ancestors)) return false;
      normalized[key] = child;
    }
    return JSON.stringify(normalized).length <= 64000;
  } catch { return false; }
  finally { ancestors.delete(value); }
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
  const relevantEdges = graph.edges.filter((edge) => sectionIds.has(edge.sourceNodeId) &&
    (edge.type === "references_media" || edge.type === "binds_shared_data"));
  const pending = new Map<string, { kind: "media" | "shared"; reference: GraphNode; key: string }>();
  for (const edge of relevantEdges) {
    const reference = graph.nodes.find((node) => node.id === edge.targetNodeId);
    const expectedType = edge.type === "references_media" ? "media_reference" : "shared_data";
    if (!reference || reference.type !== expectedType) {
      return { ok: false, code: edge.type === "references_media" ? "MEDIA_NOT_FOUND" : "SHARED_DATA_NOT_FOUND",
        nodeId: edge.sourceNodeId, message: "The referenced node is missing or has an incompatible type." };
    }
    const key = edge.type === "references_media"
      ? (typeof reference.properties.assetId === "string" ? reference.properties.assetId : "")
      : reference.id;
    if (!key) return { ok: false, code: edge.type === "references_media" ? "MEDIA_NOT_FOUND" : "SHARED_DATA_NOT_FOUND",
      nodeId: reference.id, message: "The reference does not contain a valid stable identifier." };
    pending.set(edge.type + ":" + key, { kind: edge.type === "references_media" ? "media" : "shared", reference, key });
  }
  if (pending.size > MAX_RENDER_REFERENCES) {
    return { ok: false, code: "RENDER_LIMIT_EXCEEDED", nodeId: sections[0]?.id ?? graph.id,
      message: "A page may resolve at most 64 unique media and shared-data references per render." };
  }
  for (const entry of pending.values()) {
    if (entry.kind === "media") {
      if (!mediaResolver) return { ok: false, code: "MEDIA_NOT_FOUND", nodeId: entry.reference.id, message: "No authorized media resolver is configured." };
      let asset: ResolvedMediaAsset | null;
      try { asset = await mediaResolver.resolve(entry.key, graph.id); }
      catch { return { ok: false, code: "MEDIA_FORBIDDEN", nodeId: entry.reference.id, message: "Media access was denied or could not be verified." }; }
      if (!asset) return { ok: false, code: "MEDIA_NOT_FOUND", nodeId: entry.reference.id, message: "Referenced media asset is unavailable." };
      if (!safeMedia(asset, entry.key)) return { ok: false, code: "MEDIA_FORBIDDEN", nodeId: entry.reference.id, message: "Media resolver returned invalid or unsafe metadata." };
      media.set(asset.assetId, asset);
    } else {
      if (!sharedDataResolver) return { ok: false, code: "SHARED_DATA_NOT_FOUND", nodeId: entry.reference.id, message: "No authorized shared-data resolver is configured." };
      let value: ResolvedSharedData | null;
      try { value = await sharedDataResolver.resolve(entry.key, graph.id); }
      catch { return { ok: false, code: "SHARED_DATA_FORBIDDEN", nodeId: entry.reference.id, message: "Shared-data access was denied or could not be verified." }; }
      if (!value) return { ok: false, code: "SHARED_DATA_NOT_FOUND", nodeId: entry.reference.id, message: "Referenced shared data is unavailable." };
      if (!safeData(value)) return { ok: false, code: "UNSUPPORTED_FEATURE", nodeId: entry.reference.id, message: "Shared-data resolver returned unsafe or unsupported structured data." };
      sharedData.set(entry.key, value);
    }
  }
  return { ok: true, media, sharedData };
}
