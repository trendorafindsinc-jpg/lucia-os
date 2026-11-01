import { describe, expect, it } from "vitest";
import {
  applyPremiumEdit,
  parsePremiumLayout,
  premiumSectionRegistry,
} from "./premium-composition";

const tokens = {
  background: "#ffffff",
  foreground: "#171717",
  accent: "#485c67",
  font: "editorial-serif",
  scale: "balanced",
  width: "standard",
  radius: "square",
  rhythm: "measured",
  motion: "none",
};
const permissions = {
  guided: ["text", "reorder"],
  advanced: ["variant", "tokens", "section-order", "page-responsive", "pages"],
  lockedSections: ["hero"],
  lockedTokens: ["font"],
};
const hero = {
  id: "hero",
  type: "premium-hero",
  variant: "offset",
  eyebrow: "Hello",
  heading: "An original experience",
  body: "A thoughtful introduction.",
};
const story = {
  id: "story",
  type: "editorial-story",
  variant: "narrow",
  heading: "Our story",
  body: "A measured introduction.",
};
const contact = {
  id: "contact",
  type: "contact-panel",
  variant: "minimal",
  heading: "Contact",
  body: "Get in touch.",
};
const gallery = {
  id: "gallery",
  type: "project-gallery",
  variant: "masonry",
  heading: "Selected work",
  projects: [
    {
      title: "Project A",
      image: { src: "builtin:portfolio/work-1", alt: "Project A" },
    },
  ],
};
const journey = {
  id: "journey",
  type: "service-journey",
  variant: "chapters",
  heading: "Services",
  items: [{ title: "Strategy", body: "Clarify direction" }],
};
const experience = {
  id: "experience",
  type: "experience",
  variant: "immersive",
  heading: "Stay here",
  body: "A welcoming retreat",
  image: { src: "builtin:hospitality/stay", alt: "A room" },
};

function fixture(
  name: string,
  sections: Record<string, unknown>[],
  interior: Record<string, unknown>[],
) {
  return {
    schema: "lucia.layout-composition",
    version: 2,
    layoutId: "lucia.layout." + name,
    layoutVersion: 1,
    category: "Demonstration",
    identity: {
      name,
      description: "Composition fixture only, not a commissioned Layout",
    },
    tokens,
    navigation: [
      { label: "Home", href: "/" },
      { label: "About", href: "/about" },
    ],
    pages: [
      {
        id: "home",
        path: "/",
        title: "Home",
        description: "Home",
        navigation: true,
        sections,
      },
      {
        id: "about",
        path: "/about",
        title: "About",
        description: "About",
        navigation: true,
        sections: interior.map((section) => ({
          ...section,
          id: "about-" + section.id,
        })),
        responsive: "asymmetric",
      },
    ],
    permissions: {
      ...permissions,
      lockedSections: sections.some((section) => section.id === "hero")
        ? ["hero"]
        : [],
    },
  };
}
const meridian = fixture(
  "meridian",
  [hero, journey, story, contact],
  [story, journey, contact],
);
const canvas = fixture(
  "canvas",
  [gallery, story, contact],
  [story, gallery, contact],
);
const haven = fixture(
  "haven",
  [
    {
      ...hero,
      variant: "full-bleed",
      image: { src: "builtin:hospitality/hero", alt: "Hotel exterior" },
    },
    experience,
    contact,
  ],
  [experience, story, contact],
);

describe("Phase 13 premium layout contract", () => {
  it("accepts literal dotted layout IDs and rejects malformed separators", () => {
    expect(parsePremiumLayout(meridian).layoutId).toBe("lucia.layout.meridian");
    const malformed = structuredClone(meridian);
    malformed.layoutId = "luciaXlayoutXmeridian";
    expect(() => parsePremiumLayout(malformed)).toThrow();
  });
  it("registers only fixed section types", () => {
    expect(Object.keys(premiumSectionRegistry)).toHaveLength(8);
    expect(() =>
      parsePremiumLayout(
        fixture(
          "unsafe",
          [{ id: "evil", type: "javascript", code: "alert(1)" }],
          [contact],
        ),
      ),
    ).toThrow();
  });
  it.each([
    ["Meridian", meridian],
    ["Canvas", canvas],
    ["Haven", haven],
  ])("%s validates as a distinct two-page composition", (_name, layout) => {
    const parsed = parsePremiumLayout(layout);
    expect(parsed.pages.map((p) => p.path)).toEqual(["/", "/about"]);
    expect(parsed.pages[0].sections.length).toBeGreaterThan(2);
  });
  it("keeps page metadata and navigation in one validated composition", () => {
    const parsed = parsePremiumLayout(meridian);
    const renamed = applyPremiumEdit(parsed, "advanced", {
      kind: "page-details", pageId: "about", path: "/about", title: "Our story",
      description: "Learn more about the team.", navigation: true,
    });
    expect(renamed.pages[1]).toMatchObject({ title: "Our story", description: "Learn more about the team." });
    expect(renamed.navigation[1]).toEqual({ label: "Our story", href: "/about" });
    const hidden = applyPremiumEdit(renamed, "advanced", {
      kind: "page-details", pageId: "about", path: "/about", title: "Our story",
      description: "Learn more about the team.", navigation: false,
    });
    expect(hidden.navigation).toEqual([{ label: "Home", href: "/" }]);
    const reordered = applyPremiumEdit(parsed, "advanced", {
      kind: "navigation-order", hrefs: ["/about", "/"],
    });
    expect(reordered.navigation.map((item) => item.href)).toEqual(["/about", "/"]);
    const withInternalLink = structuredClone(parsed);
    const homeHero = withInternalLink.pages[0].sections.find((section) => section.type === "premium-hero");
    if (!homeHero || homeHero.type !== "premium-hero") throw new Error("Missing hero");
    homeHero.action = { label: "Read our story", href: "/about" };
    const pathChanged = applyPremiumEdit(withInternalLink, "advanced", {
      kind: "page-details", pageId: "about", path: "/our-story", title: "Our story",
      description: "Learn more about the team.", navigation: true,
    });
    expect(pathChanged.pages[1].path).toBe("/our-story");
    expect(pathChanged.navigation[1].href).toBe("/our-story");
    const updatedHero = pathChanged.pages[0].sections.find((section) => section.type === "premium-hero");
    expect(updatedHero?.type === "premium-hero" ? updatedHero.action?.href : null).toBe("/our-story");
  });
  it("accepts only typed customer media and allowlisted external embeds", () => {
    const video = {
      id: "home-video", type: "media-embed", variant: "wide", kind: "video",
      title: "A short introduction", mediaRef: "media:550e8400-e29b-41d4-a716-446655440000",
      mime: "video/mp4",
    };
    expect(() => parsePremiumLayout(fixture("media", [hero, video], [story]))).not.toThrow();
    const image = {
      id: "home-image", type: "media-embed", variant: "wide", kind: "image",
      title: "Our team", mediaRef: "media:550e8400-e29b-41d4-a716-446655440001",
      description: "Our team at work",
    };
    expect(() => parsePremiumLayout(fixture("media", [hero, image], [story]))).not.toThrow();
    const spotify = {
      id: "home-audio", type: "media-embed", variant: "wide", kind: "embed",
      title: "Our playlist", url: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
    };
    expect(() => parsePremiumLayout(fixture("media", [hero, spotify], [story]))).not.toThrow();
    const unsafe = { ...spotify, url: "https://evil.example/embed/track" };
    expect(() => parsePremiumLayout(fixture("media", [hero, unsafe], [story]))).toThrow();
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
    (script.pages[0].sections[0] as Record<string, unknown>).onClick =
      "alert(1)";
    expect(() => parsePremiumLayout(script)).toThrow();
    const external = structuredClone(haven);
    const externalHero = external.pages[0].sections[0] as Record<
      string,
      unknown
    >;
    if (externalHero.type !== "premium-hero")
      throw new Error("Expected premium hero fixture");
    externalHero.image = { src: "https://evil.test/track", alt: "test" };
    expect(() => parsePremiumLayout(external)).toThrow();
    const variant = structuredClone(canvas);
    const gallerySection = variant.pages[0].sections[0] as Record<
      string,
      unknown
    >;
    if (gallerySection.type !== "project-gallery")
      throw new Error("Expected gallery fixture");
    gallerySection.variant = "javascript";
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
    const originalHero = parsed.pages[0].sections[0];
    if (originalHero.type !== "premium-hero")
      throw new Error("Expected premium hero fixture");
    const replacement = { ...originalHero, heading: "Updated headline" };
    const changed = applyPremiumEdit(parsed, "guided", {
      kind: "replace-section",
      pageId: "home",
      section: replacement,
    });
    expect(changed.pages[0].sections[0]).toMatchObject({
      heading: "Updated headline",
    });
    expect(parsed.pages[0].sections[0]).toMatchObject({
      heading: "An original experience",
    });
    expect(() =>
      applyPremiumEdit(parsed, "advanced", {
        kind: "replace-section",
        pageId: "home",
        section: { ...replacement, variant: "typographic" },
      }),
    ).toThrow();
  });
  it("rejects guided token changes, locked typography and invalid reorder lists", () => {
    const parsed = parsePremiumLayout(meridian);
    expect(() =>
      applyPremiumEdit(parsed, "guided", {
        kind: "token",
        key: "width",
        value: "wide",
      }),
    ).toThrow();
    expect(() =>
      applyPremiumEdit(parsed, "advanced", {
        kind: "token",
        key: "font",
        value: "system-sans",
      }),
    ).toThrow();
    expect(() =>
      applyPremiumEdit(parsed, "guided", {
        kind: "reorder",
        pageId: "home",
        sectionIds: ["hero"],
      }),
    ).toThrow();
    expect(
      applyPremiumEdit(parsed, "advanced", {
        kind: "token",
        key: "width",
        value: "wide",
      }).tokens.width,
    ).toBe("wide");
  });
});
