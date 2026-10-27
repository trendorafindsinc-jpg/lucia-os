/**
 * Only allow the two intentional post-login destinations.
 * Keep this allowlist narrow so OAuth redirects cannot reveal internal routes
 * or become an open redirect. Staff still need server-side authorization.
 */
export type LoginReturnTo = "/workspace" | "/staff";

export function resolveSafeReturnTo(value: string | null | undefined): LoginReturnTo {
  if (value === "/staff" || value === "/workspace") return value;
  return "/workspace";
}
