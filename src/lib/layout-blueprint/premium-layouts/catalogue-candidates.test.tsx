import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LayoutRenderer } from "@/components/layout-studio/layout-renderer";
import {
  premiumCandidate,
  premiumCandidateIds,
} from "./catalogue-candidates";
import { premiumCandidateBriefs } from "./candidate-briefs";
import { premiumArtworkChoices } from "./asset-choices";
import { premiumAssets } from "../premium-assets";
import { applyPremiumEdit, parsePremiumLayout } from "../premium-composition";

describe("Phase 14 canonical premium candidates — not release acceptance", () => {
  it("declares exactly the 48 unique canonical identities and 47 new authored briefs", () => {
    expect(premiumCandidateIds).toHaveLength(48);
    expect(new Set(premiumCandidateIds).size).toBe(48);
    expect(premiumCandidateBriefs).toHaveLength(47);
    expect(premiumCandidateIds[0]).toBe("lucia.layout.meridian");
    expect(premiumCandidateIds[47]).toBe("lucia.layout.greenfield");
  });

  it.each(premiumCandidateIds)(
    "%s: validates pages, case routes, ownership-safe paths and meaningful copy",
    (id) => {
      const definition = premiumCandidate(id);
      expect(definition.layoutId).toBe(id);
      expect(definition.version).toBe(2);
      expect(definition.pages.length).toBeGreaterThanOrEqual(6);
      expect(definition.pages.some((p) => p.path === "/contact")).toBe(true);
      expect(definition.pages.every((p) => p.sections.length >= 2)).toBe(true);
      expect(new Set(definition.pages.map((p) => p.path)).size).toBe(
        definition.pages.length,
      );
      for (const nav of definition.navigation)
        expect(definition.pages.some((p) => p.path === nav.href)).toBe(true);
      const serialized = JSON.stringify(definition);
      expect(serialized).toContain("Demo");
      expect(serialized).not.toContain("javascript:");
      expect(serialized).not.toContain("http://");
      expect(serialized).not.toContain("https://");
      expect(definition.pages[0].sections.some((s) => s.type === "contact-panel")).toBe(true);
      expect(parsePremiumLayout(definition)).toEqual(definition);
    },
  );

  it("renders every original flagship candidate on the production shared renderer", () => {
    for (const id of [
      "lucia.layout.meridian",
      "lucia.layout.canvas",
      "lucia.layout.haven",
      "lucia.layout.academia",
      "lucia.layout.maison",
      "lucia.layout.nexus",
      "lucia.layout.impact",
      "lucia.layout.estate",
    ]) {
      const definition = premiumCandidate(id);
      for (const page of definition.pages) {
        const markup = renderToStaticMarkup(
          <LayoutRenderer blueprint={definition} pagePath={page.path} />,
        );
        expect(markup).toContain('data-layout-version="2"');
        expect(markup).toContain('data-page-path="' + page.path + '"');
        expect(markup).toContain("Main navigation");
      }
    }
  });

  it("preserves 48 distinct editorial identities and adequate page diversity", () => {
    const candidates = premiumCandidateIds.map((id) => premiumCandidate(id));
    const identities = candidates.map((site) => [
      site.tokens.background, site.tokens.foreground, site.tokens.accent,
      site.pages[0].sections.find((s) => s.type === "premium-hero" && s.id === "home-hero")
        ?.type ?? "meridian",
      site.pages[0].sections.map((s) => s.type + ":" + s.variant).join(";"),
    ].join("|"));
    expect(new Set(identities).size).toBe(48);
    expect(new Set(candidates.map((site) => site.pages[0].sections.map((s) => s.type).join("|"))).size)
      .toBeGreaterThan(10);
    expect(new Set(candidates.map((site) => site.category)).size).toBe(8);
  });

  it("allows validated content replacement while keeping original candidate unchanged", () => {
    const original = premiumCandidate("lucia.layout.canvas");
    const main = original.pages[0];
    const section = main.sections.find((s) => s.type === "premium-hero");
    if (!section || section.type !== "premium-hero") throw Error("Expected hero");
    const edited = applyPremiumEdit(original, "guided", {
      kind: "replace-section",
      pageId: "home",
      section: { ...section, heading: "A personal collection of original work" },
    });
    expect(edited.pages[0].sections.some((s) => s.type === "premium-hero" && s.heading === "A personal collection of original work")).toBe(true);
    expect(original.pages[0].sections.some((s) => s.type === "premium-hero" && s.heading === "A personal collection of original work")).toBe(false);
  });

  it("rejects unsafe candidate destinations and unknown catalogue IDs", () => {
    expect(() => premiumCandidate("lucia.layout.unknown")).toThrow();
    const layout = premiumCandidate("lucia.layout.nexus");
    const projects = layout.pages[0].sections.find((s) => s.type === "project-gallery");
    if (!projects || projects.type !== "project-gallery") throw Error("Expected gallery");
    projects.projects[0].href = "/staff";
    expect(() => parsePremiumLayout(layout)).toThrow();
  });

  it("gives each flagship a relevant, working interior journey rather than repeating About", () => {
    const required: Record<string, string[]> = {
      "lucia.layout.meridian": ["/services", "/work/service-journey"],
      "lucia.layout.canvas": ["/process", "/commissions"],
      "lucia.layout.haven": ["/rooms", "/booking-enquiry"],
      "lucia.layout.academia": ["/admissions", "/student-life"],
      "lucia.layout.maison": ["/lookbook", "/care-guide"],
      "lucia.layout.nexus": ["/documentation", "/integrations"],
      "lucia.layout.impact": ["/volunteer", "/accountability"],
      "lucia.layout.estate": ["/viewings", "/area-guide"],
    };
    for (const [id, routes] of Object.entries(required)) {
      const layout = premiumCandidate(id);
      for (const route of routes) {
        const page = layout.pages.find((p) => p.path === route);
        expect(page, id + " missing " + route).toBeDefined();
        expect(page?.sections.some((s) => s.type === "editorial-story")).toBe(true);
        if (!page) throw Error("Missing designed page");
        const html = renderToStaticMarkup(
          <LayoutRenderer blueprint={layout} pagePath={route} />,
        );
        expect(html).toContain('data-page-path="' + route + '"');
        const hero = page.sections.find((s) => s.type === "premium-hero");
        if (hero?.type === "premium-hero")
          expect(html).toContain(hero.heading);
      }
    }
  });

  it("renders accessible responsive menus, skip links and the page's active destination", () => {
    const layout = premiumCandidate("lucia.layout.haven");
    const html = renderToStaticMarkup(<LayoutRenderer blueprint={layout} pagePath="/rooms" />);
    expect(html).toContain('class="premium-mobile-menu"');
    expect(html).toContain("Skip to content");
    expect(html).toContain('aria-label="Mobile navigation"');
    expect(html).toContain('aria-label="Footer navigation"');
    expect(html).toContain('class="premium-footer-identity"');
    expect(html).toContain('class="premium-footer-end"');
    expect(html).toContain('Return to ');
    expect(html).toContain('href="/contact"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('id="premium-main-content"');
    const homeHtml = renderToStaticMarkup(<LayoutRenderer blueprint={layout} />);
    expect(homeHtml).toContain('loading="eager"');
  });

  it("does not grant permission to load unregistered Layouts or unsafe paths", () => {
    expect(() => premiumCandidate("lucia.layout.fake")).toThrow(/Unknown/);
    const layout = premiumCandidate("lucia.layout.estate");
    expect(() => parsePremiumLayout({
      ...layout,
      navigation: [...layout.navigation, { label: "Staff", href: "/staff" }],
    })).toThrow();
  });

  it("exposes only registered artwork selections and handles image replacement safely", () => {
    expect(new Set(premiumArtworkChoices.map((asset) => asset.ref))).toEqual(
      new Set(Object.keys(premiumAssets)),
    );
    const layout = premiumCandidate("lucia.layout.haven");
    const hero = layout.pages[0].sections.find((s) => s.type === "premium-hero");
    if (hero?.type !== "premium-hero" || !hero.image) throw Error("Missing hero art");
    expect(hero.image.src).toBe("builtin:premium/flagship-haven");
    const edited = applyPremiumEdit(layout, "guided", {
      kind: "replace-section", pageId: "home",
      section: {
        ...hero,
        image: {
          src: "builtin:premium/hospitality",
          alt: "An original abstract courtyard composition",
        },
      },
    });
    expect(edited.pages[0].sections.find((s) => s.id === hero.id)).toMatchObject({
      image: { src: "builtin:premium/hospitality" },
    });
    expect(() => applyPremiumEdit(layout, "guided", {
      kind: "replace-section", pageId: "home",
      section: {
        ...hero,
        image: { src: "https://tracking.example/image.jpg", alt: "Invalid" },
      },
    })).toThrow();
    expect(layout.pages[0].sections.find((s) => s.id === hero.id)).toMatchObject({
      image: { src: "builtin:premium/flagship-haven" },
    });
  });

  it("can point a flagship hero CTA to an existing page but never an invented destination", () => {
    const original = premiumCandidate("lucia.layout.nexus");
    const home = original.pages.find((page) => page.path === "/");
    const hero = home?.sections.find((section) => section.type === "premium-hero");
    if (!home || hero?.type !== "premium-hero" || !hero.action)
      throw Error("Missing required flagship call to action");
    const edited = applyPremiumEdit(original, "guided", {
      kind: "replace-section", pageId: home.id,
      section: { ...hero, action: { label: "Read documentation", href: "/documentation" } },
    });
    const rendered = renderToStaticMarkup(<LayoutRenderer blueprint={edited} />);
    expect(rendered).toContain('href="/documentation"');
    expect(rendered).toContain("Read documentation");
    expect(() => applyPremiumEdit(original, "guided", {
      kind: "replace-section", pageId: home.id,
      section: { ...hero, action: { label: "Broken", href: "/api/internal" } },
    })).toThrow();
    expect(original.pages[0].sections.find((section) => section.id === hero.id))
      .toEqual(hero);
  });
});
