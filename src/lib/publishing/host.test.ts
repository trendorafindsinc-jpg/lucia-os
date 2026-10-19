import { describe, expect, it } from "vitest";
import { isReservedSiteSlug, resolveLuciaSubdomain } from "./host";

describe("LUCIA wildcard subdomain routing", () => {
  it("resolves customer hostnames under the configured apex", () => {
    expect(resolveLuciaSubdomain("northstar.lucia.name.ng", "lucia.name.ng")).toBe("northstar");
    expect(resolveLuciaSubdomain("northstar.lucia.name.ng:443", "lucia.name.ng")).toBe("northstar");
  });

  it.each([
    ["lucia.name.ng", "lucia.name.ng"],
    ["os.lucia.name.ng", "lucia.name.ng"],
    ["api.lucia.name.ng", "lucia.name.ng"],
    ["nested.northstar.lucia.name.ng", "lucia.name.ng"],
    ["northstar.lucia.name.ng.attacker.test", "lucia.name.ng"],
    ["northstar.vercel.app", "lucia.name.ng"],
    ["bad_label.lucia.name.ng", "lucia.name.ng"],
  ])("does not resolve reserved or unrelated host %s", (host, domain) => {
    expect(resolveLuciaSubdomain(host, domain)).toBeNull();
  });

  it("reserves platform-owned labels", () => {
    expect(isReservedSiteSlug("OS")).toBe(true);
    expect(isReservedSiteSlug("northstar")).toBe(false);
  });
});
