/**
 * Restrict OAuth return destinations to routes that intentionally initiate
 * sign-in. A destination never grants permissions; every staff route authorizes
 * the current session independently on the server.
 */
export type LoginReturnTo =
  "/workspace" | "/staff" | "/staff/support" | "/workspace/settings";

export function resolveSafeReturnTo(
  value: string | null | undefined,
): LoginReturnTo {
  if (value === "/workspace/settings") return value;
  if (
    value === "/staff" ||
    value === "/staff/support" ||
    value === "/workspace"
  )
    return value;
  return "/workspace";
}
