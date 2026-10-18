import { describe, expect, it } from "vitest";
import { customDomainSchema, getPublishChecks, getPublishReadiness, publishSettingsSchema } from "./publishing";

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

  it("validates a complete set of site settings", () => {
    expect(publishSettingsSchema.safeParse(settings).success).toBe(true);
    expect(publishSettingsSchema.safeParse({ ...settings, siteSlug: "NO SPACES" }).success).toBe(false);
  });
});

describe("publish readiness", () => {
  it("never reports production ready while platform gates are unconfigured", () => {
    const checks = getPublishChecks(settings);
    expect(checks.filter((check) => !check.ready).map((check) => check.id)).toEqual(["storage", "access", "runtime", "dns"]);
    expect(getPublishReadiness(checks).canPublish).toBe(false);
  });

  it("reports invalid custom domain without treating it as verified", () => {
    const checks = getPublishChecks({ ...settings, customDomain: "https://bad.example" });
    expect(checks.find((check) => check.id === "domain")?.ready).toBe(false);
  });
});
