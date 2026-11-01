/** Opaque identifiers only; never accept URLs, object keys or executable data. */
export const mediaReferencePattern = /^media:([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/;
export function mediaIds(value: unknown): string[] {
  const found = new Set<string>();
  function visit(node: unknown, depth: number) {
    if (depth > 24) throw Error("Media definition too deep");
    if (typeof node === "string") { const match = mediaReferencePattern.exec(node); if (match) found.add(match[1]); }
    else if (Array.isArray(node)) node.forEach((item) => visit(item, depth + 1));
    else if (node && typeof node === "object") Object.values(node).forEach((item) => visit(item, depth + 1));
  }
  visit(value, 0);
  return [...found];
}
