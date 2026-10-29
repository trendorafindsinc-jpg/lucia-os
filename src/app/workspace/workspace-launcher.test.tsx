import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import WorkspaceLauncher from "./workspace-launcher";

describe("workspace launcher acceptance", () => {
  const markup = renderToStaticMarkup(
    <WorkspaceLauncher userId="test-user" displayName="Afolabi Oluwaseyi" organizationCount={2} websiteCount={3} />,
  );

  it("renders the signed-in workspace summary and app sections accessibly", () => {
    expect(markup).toContain("Welcome back, ");
    expect(markup).toContain("Afolabi.");
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
  });

  it("does not render unavailable apps as clickable links", () => {
    expect(markup).toContain("Loom is not available in this release.");
    expect(markup).toContain("The Store is not available in this release.");
    expect(markup).toContain('aria-disabled="true"');
    expect(markup).toContain("Unavailable");
    expect(markup).not.toContain('href="/loom"');
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
  it("renders one collapsed Orb with the shared loomifyAI destination", () => {
    expect(markup).toContain('aria-label="LUCIA assistive controls"');
    expect(markup).toContain('aria-label="Expand LUCIA Assistive Orb"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain("Voice and automated actions are not available yet.");
    expect(markup).toContain("Open loomifyAI");
    expect(markup.match(/aria-label="LUCIA assistive controls"/g)).toHaveLength(1);
  });

  it("keeps mobile launcher controls touch-friendly and clears the floating Orb", () => {
    const css = readFileSync(new URL("./workspace-launcher.module.css", import.meta.url), "utf8");
    expect(css).toContain("min-height: 100dvh");
    expect(css).toContain("padding-bottom: calc(112px + env(safe-area-inset-bottom))");
    expect(css).toContain(".appTile[href] { touch-action: manipulation; }");
    expect(css).toContain(".toolLink { min-height: 52px;");
  });

  it("provides a stable accessible Orb panel target even while collapsed", () => {
    expect(markup).toMatch(/id="[^"]+" aria-label="LUCIA assistant information"/);
    expect(markup).toMatch(/aria-controls="[^"]+"/);
    expect(markup).toContain('hidden=""');
  });

  it("gives each available app a distinct vector identity within Blue Glass", () => {
    const css = readFileSync(new URL("./workspace-launcher.module.css", import.meta.url), "utf8");
    for (const icon of ["overview", "website", "layouts", "loomify-ai", "loom", "store"]) {
      expect(css).toContain(`.icon_${icon} { --app-glow:`);
    }
    expect(css).toContain(".iconSurface::before");
    expect(markup).toContain('aria-label="Layout Studio"');
    expect(markup).toContain('aria-label="loomifyAI"');
  });

  it("renders the approved mobile workspace with real navigation and Orb docking", () => {
    expect(markup).toContain('aria-label="Workspace at a glance"');
    expect(markup).toContain('aria-label="Mobile workspace navigation"');
    expect(markup).toContain("lucia-mobile-workspace-dock");
    expect(markup).toContain('href="/workspace/domains"');
    expect(markup).not.toContain('href="#apps-title"');
    expect(markup).toContain('aria-label="Open App Library"');
    const css = readFileSync(new URL("./workspace-launcher.module.css", import.meta.url), "utf8");
    expect(css).toContain(".mobileStats { display:grid");
    expect(css).toContain(".mobileDock {");
    expect(css).toContain("grid-template-columns:repeat(5,minmax(0,1fr))");
    const sharedCss = readFileSync(new URL("../../styles/phase-3-blue-glass.css", import.meta.url), "utf8");
    expect(sharedCss).toContain("body:has(.lucia-mobile-workspace-dock) .lucia-mobile-switcher { display:none; }");
  });

  it("activates the scoped Blue Glass workspace theme", () => {
    expect(markup).toContain("lucia-workspace-theme");
    const css = readFileSync(new URL("./workspace-launcher.module.css", import.meta.url), "utf8");
    expect(css).toContain(".workspace:global(.lucia-workspace-theme)");
  });

});
