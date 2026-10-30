/** Reject executable values, prototype keys and excessive payloads before schema parsing. */
export function isBoundedRecoveryJson(
  value: unknown,
  maxBytes = 262144,
): boolean {
  let nodes = 0;
  function visit(v: unknown, depth: number): boolean {
    if (++nodes > 12000 || depth > 12) return false;
    if (v === null || typeof v === "boolean") return true;
    if (typeof v === "string") return v.length <= 65536;
    if (typeof v === "number") return Number.isFinite(v);
    if (Array.isArray(v))
      return v.length <= 256 && v.every((item) => visit(item, depth + 1));
    if (typeof v !== "object" || Object.getPrototypeOf(v) !== Object.prototype)
      return false;
    return Object.entries(v).every(
      ([key, item]) =>
        !["__proto__", "constructor", "prototype"].includes(key) &&
        key.length <= 512 &&
        visit(item, depth + 1),
    );
  }
  try {
    return (
      visit(value, 0) &&
      new TextEncoder().encode(JSON.stringify(value)).length <= maxBytes
    );
  } catch {
    return false;
  }
}
