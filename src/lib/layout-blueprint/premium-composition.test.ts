import { describe, expect, it } from "vitest";
import { applyPremiumEdit, parsePremiumLayout, premiumSectionRegistry } from "./premium-composition";

const tokens = { background: "#ffffff", foreground: "#171717", accent: "#485c67", font: "editorial-serif", scale: "balanced", width: "standard", radius: "square", rhythm: "measured", motion: "none" };
const permissions = { guided: ["text", "reorder"], advanced: ["variant", "tokens", "section-order", "page-responsive"], lockedSections: ["hero"], lockedTokens: ["font"] };
const hero = { id: "hero", type: "premium-hero", variant: "offset", eyebrow: "Hello", heading: "An original experience", body: "A thoughtful introduction." };
const story = { id: "story", type: "editorial-story", variant: "narrow", heading: "Our story", body: "A measured introduction." };
const contact = { id: "contact", type: "contact-panel", variant: "minimal", heading: "Contact", body: "Get in touch." };
const gallery = { id: "gallery", type: "project-gallery", variant: "masonry", heading: "Selected work", projects: [{ title: "Project A", image: { src: "builtin:portfolio/work-1", alt: "Project A" } }] };
const journey = { id: "journey", type: "service-journey", variant: "chapters", heading: "Services", items: [{ title: "Strategy", body: "Clarify direction" }] };
const experience = { id: "experience", type: "experience", variant: "immersive", heading: "Stay here", body: "A welcoming retreat", image: { src: "builtin:hospitality/stay", alt: "A room" } };

function fixture(name: string, sections: unknown[], interior: unknown[]) {
  return { schema: "lucia.layout-composition", version: 2, layoutId: "lucia.layout." + name, layoutVersion: 1,
    category: "Demonstration", identity: { name, description: "Composition fixture only, not a commissioned Layout" },
    tokens, navigation: [{ label: "Home", href: "/" }, { label: "About", href: "/about" }],
    pages: [{ id: "home", path: "/", title: "Home", description: "Home", navigation: true, sections },
      { id: "about", path: "/about", title: "About", description: "About", navigation: true, sections: interior, responsive: "asymmetric" }],
    permissions };
}
const meridian = fixture("meridian", [hero, journey, story, contact], [story, journey, contact]);
const canvas = fixture("canvas", [gallery, story, contact], [story, gallery, contact]);
const haven = fixture("haven", [{ ...hero, variant: "full-bleed", image: { src: "builtin:hospitality/hero", alt: "Hotel exterior" } }, experience, contact], [experience, story, contact]);

describe("Phase 13 premium layout contract", () => {
  it("registers only fixed section types", () => {
    expect(Object.keys(premiumSectionRegistry)).toHaveLength(7);
    expect(() => parsePremiumLayout(fixture("unsafe", [{ id: "evil", type: "javascript", code: "alert(1)" }], [contact]))).toThrow();
  });
  it.each([["Meridian", meridian], ["Canvas", canvas], ["Haven", haven]])("%s validates as a distinct two-page composition", (_name, layout) => {
    const parsed = parsePremiumLayout(layout);
    expect(parsed.pages.map(p => p.path)).toEqual(["/", "/about"]);
    expect(parsed.pages[0].sections.length).toBeGreaterThan(2);
  });
  it("rejects duplicate paths and unsupported page destinations", () => {
    const duplicate = structuredClone(meridian);
    duplicate.pages[1].path = "/";
    expect(() => parsePremiumLayout(duplicate)).toThrow();
    const nav = structuredClone(meridian);
    nav.navigation[1].href = "/unregistered";
    expect(() => parsePremiumLayout(nav)).toThrow();
  });
  it("rejects script payloads, malicious assets and unsupported variants", () => {
    const script = structuredClone(meridian);
    script.pages[0].sections[0].onClick = "alert(1)";
    expect(() => parsePremiumLayout(script)).toThrow();
    const external = structuredClone(haven);
    external.pages[0].sections[0].image.src = "https://evil.test/track";
    expect(() => parsePremiumLayout(external)).toThrow();
    const variant = structuredClone(canvas);
    variant.pages[0].sections[0].variant = "javascript";
    expect(() => parsePremiumLayout(variant)).toThrow();
  });
  it("rejects malformed tokens and duplicate section instance IDs", () => {
    const invalid = structuredClone(meridian);
    invalid.tokens.background = "var(--another-tenant)";
    expect(() => parsePremiumLayout(invalid)).toThrow();
    const duplicate = structuredClone(meridian);
    duplicate.pages[1].sections[0].id = "hero";
    expect(() => parsePremiumLayout(duplicate)).toThrow();
  });
  it("permits bounded content edits but prevents design-lock variant changes", () => {
    const parsed = parsePremiumLayout(meridian);
    const replacement = { ...parsed.pages[0].sections[0], heading: "Updated headline" };
    const changed = applyPremiumEdit(parsed, "guided", { kind: "replace-section", pageId: "home", section: replacement });
    expect(changed.pages[0].sections[0]).toMatchObject({ heading: "Updated headline" });
    expect(parsed.pages[0].sections[0]).toMatchObject({ heading: "An original experience" });
    expect(() => applyPremiumEdit(parsed, "advanced", { kind: "replace-section", pageId: "home", section: { ...replacement, variant: "typographic" } })).toThrow();
  });
  it("rejects guided token changes, locked typography and invalid reorder lists", () => {
    const parsed = parsePremiumLayout(meridian);
    expect(() => applyPremiumEdit(parsed, "guided", { kind: "token", key: "width", value: "wide" })).toThrow();
    expect(() => applyPremiumEdit(parsed, "advanced", { kind: "token", key: "font", value: "system-sans" })).toThrow();
    expect(() => applyPremiumEdit(parsed, "guided", { kind: "reorder", pageId: "home", sectionIds: ["hero"] })).toThrow();
    expect(applyPremiumEdit(parsed, "advanced", { kind: "token", key: "width", value: "wide" }).tokens.width).toBe("wide");
  });
});
