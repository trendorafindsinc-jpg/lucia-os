import { describe, expect, it } from "vitest";
import { compositionRequestSchema } from "./contracts";
import { normalizeCompositionRequest, normalizePagePath } from "./normalize";

const websiteId = "00000000-0000-4000-8000-000000000001";

function request(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    website: { id: websiteId, name: " Example Studio ", industryCategory: "professional-services" },
    foundation: { id: "lucia.foundation.core", version: 1 },
    pages: [{
      key: "home",
      title: " Home ",
      path: "/",
      sections: [{ key: "hero", category: "introduction", content: { heading: "Welcome" } }],
    }],
    ...overrides,
  };
}

describe("Composition request contracts", () => {
  it("accepts strict, versioned requests and normalizes bounded text fields", () => {
    const parsed = compositionRequestSchema.parse(request());
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.website.name).toBe("Example Studio");
    expect(parsed.pages[0].title).toBe("Home");
  });

  it("rejects unknown fields and invalid identifiers", () => {
    expect(compositionRequestSchema.safeParse(request({
      unexpectedExecutableField: "not allowed",
    })).success).toBe(false);
    expect(compositionRequestSchema.safeParse(request({
      website: { id: "not-a-uuid", name: "Site", industryCategory: "professional-services" },
    })).success).toBe(false);
  });

  it("normalizes a trailing slash without changing the root path", () => {
    expect(normalizePagePath("/services/")).toBe("/services");
    expect(normalizePagePath("/")).toBe("/");
    expect(normalizePagePath("/services/team")).toBe("/services/team");
  });

  it("rejects non-local, ambiguous and traversal paths", () => {
    for (const path of [
      "https://example.com",
      "services",
      "//example.com/path",
      "/services//team",
      "/services/../admin",
      "/%2e%2e/admin",
      "/services%2fadmin",
      "/services?preview=1",
      "/services#section",
      "/services\\admin",
      "/bad%zz",
    ]) {
      expect(normalizePagePath(path)).toBeNull();
    }
  });

  it("returns normalized page paths and preserves explicit customer content", () => {
    const result = normalizeCompositionRequest(request({
      pages: [{
        key: "home",
        title: "Home",
        path: "/home/",
        sections: [{ key: "hero", category: "introduction", content: { heading: "Our actual headline" } }],
      }],
    }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.request.pages[0].path).toBe("/home");
    expect(result.request.pages[0].sections[0].content.heading).toBe("Our actual headline");
  });

  it("rejects duplicate paths after canonical normalization", () => {
    const result = normalizeCompositionRequest(request({
      pages: [
        { key: "home", title: "Home", path: "/services/", sections: [{ key: "hero", category: "introduction" }] },
        { key: "services", title: "Services", path: "/Services", sections: [{ key: "services-section", category: "services" }] },
      ],
    }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostics.map((item) => item.code)).toContain("DUPLICATE_PAGE_PATH");
  });

  it("requires request keys to be unique across pages and sections", () => {
    const result = normalizeCompositionRequest(request({
      pages: [{
        key: "home",
        title: "Home",
        path: "/",
        sections: [{ key: "home", category: "introduction" }],
      }],
    }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostics.map((item) => item.code)).toContain("DUPLICATE_REQUEST_KEY");
  });

  it("fails closed with structured diagnostics for malformed requests", () => {
    const result = normalizeCompositionRequest({ schemaVersion: 99 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.request).toBeNull();
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.diagnostics.every((item) => item.code === "INVALID_REQUEST")).toBe(true);
  });
});
