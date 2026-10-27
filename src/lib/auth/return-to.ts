const ALLOWED_RETURN_PATHS = new Set([
  "/workspace",
  "/workspace/websites",
  "/workspace/domains",
  "/workspace/team",
  "/create",
  "/staff",
]);

/**
 * Return destinations are intentionally restricted to known local entry points.
 * The staff destination is permitted only when /staff explicitly initiated login.
 */
export function safeAuthReturnPath(value: string | null | undefined): string {
  if (!value) return "/workspace";

  let candidate = value;
  try {
    candidate = decodeURIComponent(value);
  } catch {
    return "/workspace";
  }

  // Exact paths only: no external URLs, protocol-relative paths, backslashes,
  // query strings, fragments, API routes, or arbitrary internal route discovery.
  if (
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    candidate.includes("?") ||
    candidate.includes("#") ||
    !ALLOWED_RETURN_PATHS.has(candidate)
  ) {
    return "/workspace";
  }

  return candidate;
}
