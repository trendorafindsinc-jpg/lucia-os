import { describe, expect, it } from "vitest";
import {
  assertDomainClaimAllowed,
  canActivateDomain,
  classifyWebsiteHostname,
  isRoutableWebsiteDomain,
  normalizeHostname,
} from "./hostname";

describe("website hostname policy", () => {
  it("normalizes casing, a trailing dot, and IDN hostnames", () => {
    expect(normalizeHostname("Example.COM.")).toBe("example.com");
    expect(normalizeHostname("münich.example")).toBe("xn--mnich-kva.example");
  });

  it("accepts a single non-reserved LUCIA subdomain", () => {
    expect(classifyWebsiteHostname("My-School.lucia.name.ng")).toEqual({
      hostname: "my-school.lucia.name.ng",
      type: "lucia_subdomain",
      subdomain: "my-school",
    });
  });

  it.each(["os.lucia.name.ng", "admin.lucia.name.ng", "www.lucia.name.ng", "nested.school.lucia.name.ng"])(
    "rejects reserved or nested LUCIA hostnames: %s",
    (hostname) => expect(() => classifyWebsiteHostname(hostname)).toThrow(),
  );

  it("requires Premium entitlement for custom domains", () => {
    expect(() => assertDomainClaimAllowed({ hostname: "myschool.com", premiumEntitled: false })).toThrow(/Premium/);
    expect(assertDomainClaimAllowed({ hostname: "myschool.com", premiumEntitled: true }).type).toBe("custom");
  });

  it("does not activate a domain without all verification gates", () => {
    const base = { status: "verified" as const, type: "custom" as const, premiumEntitled: true,
      ownershipVerified: true, pointsToExpectedDeployment: true, httpsReady: true };
    expect(canActivateDomain(base)).toBe(true);
    expect(canActivateDomain({ ...base, httpsReady: false })).toBe(false);
    expect(canActivateDomain({ ...base, ownershipVerified: false })).toBe(false);
    expect(canActivateDomain({ ...base, premiumEntitled: false })).toBe(false);
    expect(canActivateDomain({ ...base, status: "suspended" })).toBe(false);
  });

  it("routes only exact, active domains attached to published sites", () => {
    expect(isRoutableWebsiteDomain({ hostname: "school.lucia.name.ng", status: "active", websiteStatus: "published" })).toBe(true);
    expect(isRoutableWebsiteDomain({ hostname: "unknown.lucia.name.ng", status: "pending", websiteStatus: "published" })).toBe(false);
    expect(isRoutableWebsiteDomain({ hostname: "school.lucia.name.ng", status: "active", websiteStatus: "draft" })).toBe(false);
    expect(isRoutableWebsiteDomain({ hostname: "https://school.lucia.name.ng/path", status: "active", websiteStatus: "published" })).toBe(false);
  });
});
