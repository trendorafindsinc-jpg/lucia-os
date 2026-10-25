import { describe, expect, it } from "vitest";
import { buildPageMetadata, defaultSeoSettings, getSeoChecks, seoSettingsSchema } from "./seo-settings";

describe("SEO and social sharing settings", () => {
  it("accepts the default settings and generates safe metadata", () => {
    expect(seoSettingsSchema.safeParse(defaultSeoSettings).success).toBe(true);
    const metadata = buildPageMetadata({ ...defaultSeoSettings, canonicalUrl: "https://example.com/about", socialImageUrl: "https://example.com/social.jpg" });
    expect(metadata.alternates).toEqual({ canonical: "https://example.com/about" });
    expect(metadata.robots).toEqual({ index: true, follow: true });
    expect(metadata.openGraph.images).toEqual([{ url: "https://example.com/social.jpg" }]);
    expect(metadata.twitter.card).toBe("summary_large_image");
  });
  it("rejects insecure canonical and social image URLs", () => {
    expect(seoSettingsSchema.safeParse({ ...defaultSeoSettings, canonicalUrl: "http://example.com" }).success).toBe(false);
    expect(seoSettingsSchema.safeParse({ ...defaultSeoSettings, socialImageUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(seoSettingsSchema.safeParse({ ...defaultSeoSettings, canonicalUrl: "https://user:pass@example.com/page" }).success).toBe(false);
    expect(seoSettingsSchema.safeParse({ ...defaultSeoSettings, socialImageUrl: "https://example.com/image.png#fragment" }).success).toBe(false);
  });
  it("supports noindex settings for private or unfinished pages", () => {
    expect(buildPageMetadata({ ...defaultSeoSettings, indexable: false, followLinks: false }).robots).toEqual({ index: false, follow: false });
  });
  it("flags missing or overlong copy with practical checks", () => {
    const checks = getSeoChecks({ ...defaultSeoSettings, title: "", description: "Short" });
    expect(checks.find((check) => check.label === "Search title")?.status).toBe("error");
    expect(checks.find((check) => check.label === "Search description")?.status).toBe("warning");
  });
  it("prefers social-specific copy when supplied", () => {
    const metadata = buildPageMetadata({ ...defaultSeoSettings, socialTitle: "Share this page", socialDescription: "A social-specific summary." });
    expect(metadata.openGraph.title).toBe("Share this page");
    expect(metadata.twitter.description).toBe("A social-specific summary.");
  });
});
