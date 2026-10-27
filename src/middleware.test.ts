import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../middleware";

afterEach(() => vi.unstubAllEnvs());

describe("root host routing middleware", () => {
  it("leaves the platform workspace host on the normal OS routes", () => {
    const response = middleware(new NextRequest("https://os.lucia.name.ng/staff"));
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("rewrites a valid wildcard customer subdomain to its published site route", () => {
    vi.stubEnv("LUCIA_SITE_DOMAIN", "lucia.name.ng");
    const response = middleware(new NextRequest("https://northstar.lucia.name.ng/about"));
    expect(response.headers.get("x-middleware-rewrite")).toBe("https://northstar.lucia.name.ng/site/northstar/about");
  });

  it("rewrites the wildcard root to the customer's home page", () => {
    vi.stubEnv("LUCIA_SITE_DOMAIN", "lucia.name.ng");
    const response = middleware(new NextRequest("https://northstar.lucia.name.ng/"));
    expect(response.headers.get("x-middleware-rewrite")).toBe("https://northstar.lucia.name.ng/site/northstar");
  });

  it("denies reserved subdomains instead of treating them as customer custom domains", () => {
    vi.stubEnv("LUCIA_SITE_DOMAIN", "lucia.name.ng");
    const response = middleware(new NextRequest("https://staff.lucia.name.ng/"));
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("blocks private API paths on wildcard customer subdomains", () => {
    vi.stubEnv("LUCIA_SITE_DOMAIN", "lucia.name.ng");
    const response = middleware(new NextRequest("https://northstar.lucia.name.ng/api/auth/login"));
    expect(response.status).toBe(404);
  });

  it("keeps the existing custom-domain rewrite behavior", () => {
    const response = middleware(new NextRequest("https://customer-example.com/about"));
    expect(response.headers.get("x-middleware-rewrite")).toBe("https://customer-example.com/tenant-site-internal/about");
  });

  it("blocks private API paths on customer custom domains", () => {
    const response = middleware(new NextRequest("https://customer-example.com/api/auth/login"));
    expect(response.status).toBe(404);
  });
});
