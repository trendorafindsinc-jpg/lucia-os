import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
const currentUser = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: currentUser }));
import CreateWebsitePage from "./page";
beforeEach(() => currentUser.mockResolvedValue(null));
describe("authenticated free website setup entry", () => {
  it("requires the real OS session and retains a safe registered Layout choice", async () => {
    const html = renderToStaticMarkup(
      await CreateWebsitePage({
        searchParams: Promise.resolve({ template: "northstar-consulting" }),
      }),
    );
    expect(html).toContain("Sign in to create your free website");
    expect(html).toContain(
      "returnTo=%2Fcreate%3Ftemplate%3Dnorthstar-consulting",
    );
    expect(html).not.toContain('autoComplete="organization"');
  });
  it("retains a canonical multi-page choice through LUCIA ID sign-in", async () => {
    const html = renderToStaticMarkup(await CreateWebsitePage({ searchParams: Promise.resolve({ template: "lucia.layout.haven" }) }));
    expect(html).toContain("returnTo=%2Fcreate%3Ftemplate%3Dlucia.layout.haven");
  });
  it("does not turn an unknown Layout into an unsafe login return destination", async () => {
    const html = renderToStaticMarkup(
      await CreateWebsitePage({
        searchParams: Promise.resolve({ template: "https://evil.test" }),
      }),
    );
    expect(html).toContain("returnTo=%2Fcreate");
    expect(html).not.toContain("evil.test");
  });
  it("renders setup for the verified account with the supported free address", async () => {
    currentUser.mockResolvedValue({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    const html = renderToStaticMarkup(
      await CreateWebsitePage({ searchParams: Promise.resolve({}) }),
    );
    expect(html).toContain("Organisation name");
    expect(html).not.toContain("Sign in to create");
    expect(html).not.toContain("lucia.site");
  });
});
