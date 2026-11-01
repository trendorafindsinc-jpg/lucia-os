import { describe, expect, it } from "vitest";
import { PLATFORM_SCOPE } from "./platform";

describe("platform scope", () => {
  it("starts with the website portal and avoids per-customer deployments", () => {
    expect(PLATFORM_SCOPE.release).toBe("0.1");
    expect(PLATFORM_SCOPE.initialPortal).toBe("website");
    expect(PLATFORM_SCOPE.customerSpecificDeployments).toBe(false);
    expect(PLATFORM_SCOPE.identityAuthority).toBe("lucia-secure-core");
  });
});
