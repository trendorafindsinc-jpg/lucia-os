import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LayoutRenderer } from "./layout-renderer";
import { parsePremiumLayout } from "@/lib/layout-blueprint/premium-composition";
import { makeInitialDraft } from "@/lib/editor/site-draft";
import { siteDraftToLayoutBlueprint } from "@/lib/layout-blueprint/blueprint";

const hero = { id: "hero", type: "premium-hero", variant: "offset", eyebrow: "Advisory", heading: "Meridian Home", body: "Home introduction" };
const story = { id: "story", type: "editorial-story", variant: "narrow", heading: "Meridian About", body: "Distinct interior content" };
const layout = parsePremiumLayout({
  schema: "lucia.layout-composition", version: 2, layoutId: "lucia.layout.meridian", layoutVersion: 1,
  category: "Business", identity: { name: "Meridian", description: "Executive business" },
  tokens: { background: "#ffffff", foreground: "#171717", accent: "#537286", font: "editorial-serif", scale: "balanced", width: "standard", radius: "square", rhythm: "measured", motion: "none" },
  navigation: [{ label: "Home", href: "/" }, { label: "About", href: "/about" }],
  pages: [
    { id: "home", path: "/", title: "Home", description: "Home description", navigation: true, sections: [hero] },
    { id: "about", path: "/about", title: "About", description: "About description", navigation: true, sections: [story] },
  ],
  permissions: { guided: ["text"], advanced: ["tokens"], lockedSections: [], lockedTokens: [] },
});
describe("production LayoutRenderer v2 integration", () => {
  it("renders separate home and interior section markup through the existing renderer", () => {
    const home = renderToStaticMarkup(<LayoutRenderer blueprint={layout} />);
    const about = renderToStaticMarkup(<LayoutRenderer blueprint={layout} pagePath="/about" />);
    expect(home).toContain("Meridian Home");
    expect(home).not.toContain("Meridian About");
    expect(about).toContain("Meridian About");
    expect(about).not.toContain("Meridian Home");
    expect(home).toContain('data-section-type="premium-hero"');
    expect(about).toContain('data-section-type="editorial-story"');
    expect(about).toContain('aria-current="page"');
  });
  it("does not render an unknown v2 page", () => {
    expect(renderToStaticMarkup(<LayoutRenderer blueprint={layout} pagePath="/missing" />)).toBe("");
  });
  it("preserves the v1 shared renderer", () => {
    const v1 = siteDraftToLayoutBlueprint(makeInitialDraft("northstar-consulting"));
    expect(renderToStaticMarkup(<LayoutRenderer blueprint={v1} />)).toContain('class="layout-site ');
  });
});
