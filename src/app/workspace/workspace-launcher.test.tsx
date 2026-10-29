import { readFileSync } from "node:fs";
import React from "react";
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
    expect(markup).toContain('aria-label="Overview" href="/workspace"');
    expect(markup).toContain('aria-label="Layout Studio" href="/workspace/websites"');
    expect(markup).toContain('aria-label="Layouts" href="/templates"');
    expect(markup).toContain('aria-label="loomifyAI" href="/loomify-ai"');
    expect(markup).toContain('aria-label="Loom" href="/loom"');
  });

  it("does not render unavailable apps as clickable links", () => {
    expect(markup).toContain("The Store is not available in this release.");
    expect(markup).toContain('aria-disabled="true"');
    expect(markup).toContain("Unavailable");
    expect(markup).not.toContain('href="/store"');
  });

  it("defines desktop, tablet, mobile, focus-visible and reduced-motion styles", () => {
    const css = readFileSync(new URL("./workspace-launcher.module.css", import.meta.url), "utf8");
    expect(css).toContain("@media (min-width: 681px) and (max-width: 960px)");
    expect(css).toContain("@media (max-width: 680px)");
    expect(css).toContain("@media (max-width: 350px)");
    expect(css).toContain(":focus-visible");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("keeps workspace tools as real navigation links", () => {
    expect(markup).toContain('href="/workspace/websites"');
    expect(markup).toContain('href="/workspace/domains"');
    expect(markup).toContain('href="/workspace/team"');
    expect(markup).toContain('href="/support"');
  });
});
