export const PLATFORM_SCOPE = {
  release: "0.1",
  initialPortal: "website",
  customerSpecificDeployments: false,
  identityAuthority: "lucia-secure-core"
} as const;

export type InitialPortal = typeof PLATFORM_SCOPE.initialPortal;
