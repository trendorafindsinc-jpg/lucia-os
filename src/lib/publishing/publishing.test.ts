import { describe, expect, it } from "vitest";
import { customDomainSchema, getPublishChecks, getPublishReadiness, publishActionSchema, publishSettingsSchema } from "./publishing";

const settings = {
  siteName: "Northstar Studio",
  headline: "Thoughtful work for growing teams",
  description: "We help ambitious organisations bring their next idea to life with clarity and confidence.",
  siteSlug: "northstar-studio",
  customDomain: "",
};

describe("custom domain validation", () => {
  it("normalises valid hostnames", () => {
    expect(customDomainSchema.parse("WWW.Example.co.uk.")).toBe("www.example.co.uk");
  });
  it.each(["https://example.com", "example.com/path", "example.com:3000", "localhost", "127.0.0.1", "site.example", "bad domain.com", "-bad.com", "bad-.com"])(
    "rejects invalid or unsafe hostname %s",
    (domain) => expect(customDomainSchema.safeParse(domain).success).toBe(false),
  );
  it("validates complete site settings and reserves platform labels", () => {
    expect(publishSettingsSchema.safeParse(settings).success).toBe(true);
    expect(publishSettingsSchema.safeParse({ ...settings, siteSlug: "NO SPACES" }).success).toBe(false);
    expect(publishSettingsSchema.safeParse({ ...settings, siteSlug: "os" }).success).toBe(false);
    expect(publishSettingsSchema.safeParse({ ...settings, customDomain: "https://example.com" }).success).toBe(false);
  });
});
describe("publish readiness", () => {
  it("allows free LUCIA subdomain publishing when custom domain activation is not requested", () => {
    const checks = getPublishChecks(settings);
    expect(getPublishReadiness(checks).canPublish).toBe(true);
  });
  it("does not block LUCIA subdomain publishing when a valid paid custom domain is pending", () => {
    const checks = getPublishChecks({ ...settings, customDomain: "www.example.com" });
    expect(getPublishReadiness(checks).canPublish).toBe(true);
    expect(checks.find((check) => check.id === "domain")?.detail).toContain("one-time activation payment");
  });
  it("reports invalid custom domains without claiming they are connected", () => {
    const checks = getPublishChecks({ ...settings, customDomain: "https://bad.example" });
    expect(checks.find((check) => check.id === "domain")?.ready).toBe(false);
  });
});


describe("explicit publishing actions", () => {
  it.each(["save", "publish"])("accepts the explicit action %s", (action) => {
    expect(publishActionSchema.safeParse(action).success).toBe(true);
  });
  it.each([undefined, null, "", "preview", "delete", true])("rejects unknown action %s", (action) => {
    expect(publishActionSchema.safeParse(action).success).toBe(false);
  });
});
