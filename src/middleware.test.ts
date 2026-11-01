import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "./middleware";

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
  it("allows only the read-only public content contract on customer hosts", () => {
    vi.stubEnv("LUCIA_SITE_DOMAIN", "lucia.name.ng");
    const platformSite=middleware(new NextRequest("https://northstar.lucia.name.ng/api/public/v1/content"));
    expect(platformSite.headers.get("x-middleware-rewrite")).toBe("https://northstar.lucia.name.ng/site/northstar/api/public/v1/content");
    const custom=middleware(new NextRequest("https://customer-example.com/api/public/v1/content"));
    expect(custom.headers.get("x-middleware-rewrite")).toBe("https://customer-example.com/tenant-site-internal/api/public/v1/content");
    expect(middleware(new NextRequest("https://customer-example.com/api/websites")).status).toBe(404);
  });
  it("blocks private API paths on customer custom domains", () => {
    expect(middleware(new NextRequest("https://customer-example.com/api/auth/login")).status).toBe(404);
  });
  it("allows only this project's Vercel aliases, including the current preview branch", () => {
    vi.stubEnv("VERCEL_URL", "lucia-preview-123.vercel.app");
    vi.stubEnv("VERCEL_BRANCH_URL", "lucia-os-git-fix-routing-trendoraplc-5738.vercel.app");
    for (const host of ["lucia-os-three.vercel.app", "lucia-os-git-main-trendoraplc-5738.vercel.app", "lucia-preview-123.vercel.app", "lucia-os-git-fix-routing-trendoraplc-5738.vercel.app"]) {
      expect(middleware(new NextRequest(`https://${host}/workspace`)).headers.get("x-middleware-next")).toBe("1");
    }
    expect(middleware(new NextRequest("https://other-project.vercel.app/")).headers.get("x-middleware-rewrite")).toContain("/tenant-site-internal");
  });
  it("does not accept forwarded headers as permission to reach platform routes", () => {
    const response=middleware(new NextRequest("https://northstar.lucia.name.ng/api/auth/me", {headers:{"x-forwarded-host":"os.lucia.name.ng"}}));
    expect(response.status).toBe(404);
  });
  it("keeps every internal entry and staff path off customer hosts", () => {
    for (const path of ["/api/auth/me", "/site/other", "/tenant-site-internal", "/tenant-site-internal/about"]) {
      expect(middleware(new NextRequest(`https://northstar.lucia.name.ng${path}`)).status).toBe(404);
    }
    expect(middleware(new NextRequest("https://northstar.lucia.name.ng/staff")).headers.get("x-middleware-rewrite")).toContain("/site/northstar/staff");
  });

  it("uses the original Host when Next.js supplies an internal request URL", () => {
    const tenant=middleware(new NextRequest("http://127.0.0.1:3000/",{headers:{host:"ores-agric.lucia.name.ng"}}));
    expect(new URL(tenant.headers.get("x-middleware-rewrite")!).pathname).toBe("/site/ores-agric");
    const platform=middleware(new NextRequest("http://127.0.0.1:3000/",{headers:{host:"os.lucia.name.ng"}}));
    expect(platform.headers.get("x-middleware-next")).toBe("1");
  });

});
