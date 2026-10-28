import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import WorkspaceLauncher from "./workspace-launcher";

describe("workspace launcher acceptance", () => {
  const markup = renderToStaticMarkup(
    <WorkspaceLauncher displayName="Afolabi Oluwaseyi" organizationCount={2} websiteCount={3} />,
  );

  it("renders the signed-in workspace summary and app sections accessibly", () => {
    expect(markup).toContain("Welcome back, Afolabi.");
    expect(markup).toContain('aria-label="Workspace summary"');
    expect(markup).toContain("2</strong> organisations");
    expect(markup).toContain("3</strong> websites");
    expect(markup).toContain('aria-labelledby="apps-title"');
    expect(markup).toContain('aria-label="Workspace tools"');
  });

  it("keeps every available app linked to its registered destination", () => {
    expect(markup).toContain('href="/workspace" aria-label="Overview"');
    expect(markup).toContain('href="/workspace/websites" aria-label="Layout Studio"');
    expect(markup).toContain('href="/templates" aria-label="Layouts"');
    expect(markup).toContain('href="/loomify-ai" aria-label="loomifyAI"');
  });

  it("does not render unavailable apps as clickable links", () => {
    expect(markup).toContain("Loom is not available in this release.");
    expect(markup).toContain("The Store is not available in this release.");
    expect(markup).toContain('aria-disabled="true"');
    expect(markup).toContain("Unavailable");
    expect(markup).not.toContain('href="/loom"');
    expect(markup).not.toContain('href="/store"');
  });

  it("keeps workspace tools as real navigation links", () => {
    expect(markup).toContain('href="/workspace/websites"');
    expect(markup).toContain('href="/workspace/domains"');
    expect(markup).toContain('href="/workspace/team"');
    expect(markup).toContain('href="/support"');
  });
});
