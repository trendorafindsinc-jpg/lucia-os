import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HomePage, { metadata } from "./page";

const html = renderToStaticMarkup(<HomePage />);

describe("signed-out LUCIA OS entrepreneurship welcome", () => {
  it("presents the entrepreneurial platform rather than the legacy website-only positioning", () => {
    expect(html).toContain("Build the business.");
    expect(html).toContain("Own the future.");
    expect(html).toContain("THE OPERATING SYSTEM FOR AMBITIOUS BUILDERS");
    expect(html).toContain("LUCIA IS LIGHT");
    expect(html).not.toContain("not yet open for customer use");
    expect(html).not.toContain("THE UNIVERSAL WEBSITE ENGINE");
  });

  it("has working existing-route CTAs and an accessible header, navigation and main landmark", () => {
    expect(html).toContain('href="/api/auth/login?returnTo=%2Fworkspace"');
    expect(html).toContain('href="/create"');
    expect(html).toContain('href="/templates"');
    expect(html).toContain('href="#platform"');
    expect(html).toContain('href="#opportunity"');
    expect(html).toContain('href="#layouts"');
    expect(html).toContain("Skip to main content");
    expect(html).toContain('id="venture-main"');
    expect(html).toContain('aria-label="Welcome page navigation"');
  });

  it("communicates the free current product and future commercial opportunity without fabricated earnings", () => {
    expect(html).toContain("Standard website creation and publishing are free.");
    expect(html).toContain("48");
    expect(html).toContain("premium Layouts");
    expect(html).toContain("LUCIA Store commerce");
    expect(html).toContain("No earnings are guaranteed");
    expect(html).toContain("all available today");
    expect(html).not.toContain("Guaranteed income");
    expect(html).not.toContain("Start earning today");
  });

  it("renders genuine catalogue artwork and suitable public search metadata", () => {
    expect(html).toContain("/layouts/premium/flagships/meridian.svg");
    expect(html).toContain("/layouts/premium/flagships/canvas.svg");
    expect(html).toContain("/layouts/premium/flagships/nexus.svg");
    expect(html).toContain("Concept illustration:");
    expect(metadata.title).toContain("Build the business.");
    expect(metadata.description).toContain("free website");
  });
});
