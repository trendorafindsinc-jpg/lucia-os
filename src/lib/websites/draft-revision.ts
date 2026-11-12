import { createHash } from "node:crypto";

/** A strong, resource-bound token for the exact durable draft; never a permission. */
export function draftRevision(
  websiteId: string,
  content: string | null | undefined,
) {
  return `"draft-${createHash("sha256")
    .update(websiteId)
    .update("\0")
    .update(content ?? "")
    .digest("hex")}"`;
}
export function isDraftRevision(value: unknown): value is string {
  return typeof value === "string" && /^"draft-[a-f0-9]{64}"$/.test(value);
}

/** Preserve existing same-origin JSON clients and reject browser cross-site writes. */
export function websiteMutationAllowed(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true; // Non-browser clients still require the authoritative session.
  try {
    const source = new URL(origin),
      target = new URL(request.url);
    return (
      source.origin === origin &&
      source.host === (request.headers.get("host") ?? target.host) &&
      source.protocol === target.protocol
    );
  } catch {
    return false;
  }
}

/** Drizzle wraps PostgreSQL errors; inspect bounded causes without exposing SQL or parameters. */
export function isUniqueWebsiteWrite(error: unknown): boolean {
  let current: unknown = error;
  for (
    let depth = 0;
    depth < 4 && current && typeof current === "object";
    depth++
  ) {
    const entry = current as {
      code?: unknown;
      message?: unknown;
      cause?: unknown;
    };
    if (
      entry.code === "23505" ||
      (typeof entry.message === "string" &&
        /unique constraint|duplicate key/i.test(entry.message))
    )
      return true;
    current = entry.cause;
  }
  return false;
}
