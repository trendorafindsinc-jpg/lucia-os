import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../middleware";

afterEach(() => vi.unstubAllEnvs());

describe("root host routing middleware", () => {
  it("leaves the platform workspace host on normal OS routes", () => {
    const response = middleware(new NextRequest("https://os.lucia.name.ng/staff"));
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });
  it("rewrites valid wildcard customer subdomains to published site routes", () => {
    vi.stubEnv("LUCIA_SITE_DOMAIN", "lucia.name.ng");
    const response = middleware(new NextRequest("https://northstar.lucia.name.ng/about"));
    expect(response.headers.get("x-middleware-rewrite")).toBe("https://northstar.lucia.name.ng/site/northstar/about");
  });
  it("rewrites wildcard root to the customer home page", () => {
    vi.stubEnv("LUCIA_SITE_DOMAIN", "lucia.name.ng");
    const response = middleware(new NextRequest("https://northstar.lucia.name.ng/"));
    expect(response.headers.get("x-middleware-rewrite")).toBe("https://northstar.lucia.name.ng/site/northstar");
  });
  it("denies reserved subdomains instead of treating them as custom domains", () => {
    vi.stubEnv("LUCIA_SITE_DOMAIN", "lucia.name.ng");
    const response = middleware(new NextRequest("https://staff.lucia.name.ng/"));
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("blocks private API paths on wildcard customer subdomains", () => {
    vi.stubEnv("LUCIA_SITE_DOMAIN", "lucia.name.ng");
    expect(middleware(new NextRequest("https://northstar.lucia.name.ng/api/auth/login")).status).toBe(404);
  });
  it("preserves custom-domain rewrite behavior", () => {
    const response = middleware(new NextRequest("https://customer-example.com/about"));
    expect(response.headers.get("x-middleware-rewrite")).toBe("https://customer-example.com/tenant-site-internal/about");
  });
  it("blocks private API paths on customer custom domains", () => {
    expect(middleware(new NextRequest("https://customer-example.com/api/auth/login")).status).toBe(404);
  });
});
