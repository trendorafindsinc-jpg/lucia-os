import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LayoutRenderer } from "@/components/layout-studio/layout-renderer";
import { premiumCandidate, premiumCandidateIds, premiumFlagshipIds } from "./catalogue-candidates";
import { premiumAssets, resolvePremiumAsset } from "../premium-assets";
import { parsePremiumLayout } from "../premium-composition";

const cinematic = premiumCandidateIds.filter(id => !(premiumFlagshipIds as readonly string[]).includes(id));
describe("Phase 14 cinematic editions: forty distinct, safe starting definitions", () => {
  it("keeps exactly forty new editions and eight original flagships", () => {
    expect(cinematic).toHaveLength(40);
    expect(premiumFlagshipIds).toHaveLength(8);
    expect(new Set(premiumCandidateIds).size).toBe(48);
  });
  it.each(cinematic)("%s: validates real art, sections, pages and accessible production render", id => {
    const site = premiumCandidate(id);
    expect(site.layoutVersion).toBe(2);
    expect(parsePremiumLayout(site)).toEqual(site);
    expect(site.visualExperience).toBeDefined();
    expect(site.pages.length).toBeGreaterThanOrEqual(6);
    const home = site.pages[0];
    const hero = home.sections.find(s => s.type === "premium-hero");
    if (!hero || hero.type !== "premium-hero") throw Error("Missing home hero");
    expect(hero.image?.src).toBe("builtin:premium/cinematic-" + id.replace("lucia.layout.", "") + "-hero");
    expect(hero.image?.alt).toMatch(/Original/);
    expect(resolvePremiumAsset(hero.image!.src)).toMatch(/(?:^data:image\/svg\+xml|\/_next\/static\/media\/)/);
    const gallery = site.pages.flatMap(p => p.sections).find(s => s.type === "project-gallery");
    if (!gallery || gallery.type !== "project-gallery") throw Error("Missing project gallery");
    expect(new Set(gallery.projects.map(p => p.image.src)).size).toBeGreaterThan(1);
    expect(gallery.projects.every(p => Object.hasOwn(premiumAssets, p.image.src))).toBe(true);
    const markup = renderToStaticMarkup(<LayoutRenderer blueprint={site} />);
    expect(markup).toContain('data-layout-revision="2"');
    expect(markup).toContain("premium-cinema");
    expect(markup).toContain('data-layout-id="' + id + '"');
    expect(markup).toContain("Skip to content");
    expect(markup).toContain("Main navigation");
    expect(markup).not.toContain("javascript:");
    expect(new Set(site.pages.map(p=>p.path)).size).toBe(site.pages.length);
    for (const page of site.pages) {
      expect(page.sections.length).toBeGreaterThanOrEqual(2);
      expect(page.sections.filter(s=>s.type==="premium-hero").every(s=>s.type==="premium-hero" && !!s.image)).toBe(true);
    }
  });
  it("leaves the eight flagships on their previous stored-compatible design revision", () => {
    for (const id of premiumFlagshipIds) {
      const original = premiumCandidate(id);
      expect(original.pages[0].sections.some(s => s.type === "premium-hero" && s.image?.src.startsWith("builtin:premium/cinematic-"))).toBe(false);
      expect(renderToStaticMarkup(<LayoutRenderer blueprint={original} />)).not.toContain("premium-cinema");
    }
  });
});
