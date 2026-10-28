/**
 * Restrict OAuth return destinations to routes that intentionally initiate
 * sign-in. A destination never grants permissions; every staff route authorizes
 * the current session independently on the server.
 */
export type LoginReturnTo = "/workspace" | "/staff" | "/staff/support";

export function resolveSafeReturnTo(value: string | null | undefined): LoginReturnTo {
  if (value === "/staff" || value === "/staff/support" || value === "/workspace") return value;
  return "/workspace";
}
