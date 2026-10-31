import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  validateSnapshot,
  validateSnapshots,
  discardTabSnapshots,
} from "@/lib/workspace/continuity";
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LayoutRenderer } from "@/components/layout-studio/layout-renderer";
import { makeInitialDraft } from "@/lib/editor/site-draft";
import { structuralLayout, structuralLayoutIds } from "./structural-layouts";
import { premiumFlagshipIds } from "./premium-layouts/catalogue-candidates";
import {
  websiteDefinitionSchema,
  mutateWebsite,
  websiteBlueprint,
  websiteMutationSchema,
  websitePageDetails,
} from "./website-definition";
import { applyPremiumEdit, premiumLayoutSchema } from "./premium-composition";
import { premiumAssetSources } from "./premium-assets";

describe("versioned production website boundary", () => {
  it.each(structuralLayoutIds)(
    "%s survives storage roundtrip and renders distinct interior pages",
    (name) => {
      const assigned = mutateWebsite(makeInitialDraft("northstar-consulting"), {
        kind: "assign-layout",
        layoutId: name,
      });
      const roundtrip = websiteDefinitionSchema.parse(
        JSON.parse(JSON.stringify(assigned)),
      );
      const layout = premiumLayoutSchema.parse(roundtrip);
      expect(layout.identity.name).toBe("Northstar Consulting");
      const home = renderToStaticMarkup(
        <LayoutRenderer blueprint={websiteBlueprint(roundtrip)} />,
      );
      const about = renderToStaticMarkup(
        <LayoutRenderer
          blueprint={websiteBlueprint(roundtrip)}
          pagePath="/about"
        />,
      );
      expect(home).toContain('data-page-path="/"');
      expect(about).toContain('data-page-path="/about"');
      expect(home).not.toEqual(about);
      expect(home).toContain("--layout-ink:");
    },
  );
  it("uses different ordered DOM structures rather than color-only substitutions", () => {
    const signatures = structuralLayoutIds.map((name) =>
      structuralLayout(name, "Demo site")
        .pages[0].sections.map((s) => s.type)
        .join(","),
    );
    expect(new Set(signatures).size).toBe(3);
    const all = structuralLayoutIds.flatMap((name) =>
      structuralLayout(name, "Demo site").pages[0].sections.map((s) => s.type),
    );
    expect(new Set(all).size).toBe(7);
  });
  it("resolves only real repository-owned image assets", () => {
    for (const asset of premiumAssetSources)
      expect(existsSync(asset)).toBe(true);
    const layout = structuralLayout("haven", "Demo site");
    const html = renderToStaticMarkup(<LayoutRenderer blueprint={layout} />);
    expect(html).toContain("retreat");
    expect(html).toContain('alt="Illustrated retreat');
    layout.pages[0].sections[0] = {
      ...layout.pages[0].sections[0],
      image: { src: "builtin:not-present", alt: "Missing" },
    } as (typeof layout.pages)[0]["sections"][0];
    expect(premiumLayoutSchema.safeParse(layout).success).toBe(false);
  });
  it.each([
    "/workspace",
    "/api/private",
    "/staff",
    "/_next",
    "/../secret",
    "//evil.test",
    "/%2e%2e",
  ])("rejects unsafe public path %s", (path) => {
    const layout = structuralLayout("canvas", "Demo site");
    layout.pages[1].path = path;
    layout.navigation[1].href = path;
    expect(premiumLayoutSchema.safeParse(layout).success).toBe(false);
  });
  it("denies client-defined permission grants, downgrade and replacement", () => {
    const legacy = makeInitialDraft("northstar-consulting"),
      layout = structuralLayout("meridian", "Demo site");
    expect(() => mutateWebsite(layout, legacy)).toThrow();
    expect(() =>
      mutateWebsite(layout, { kind: "assign-layout", layoutId: "haven" }),
    ).toThrow();
    expect(
      websiteMutationSchema.safeParse({
        kind: "composition-edit",
        mode: "advanced",
        edits: [],
        permissions: { lockedSections: [] },
      }).success,
    ).toBe(false);
  });
  it("permits content edits under Design Lock while protecting geometry and tokens", () => {
    const layout = structuralLayout("meridian", "Demo site"),
      section = layout.pages[0].sections[0];
    if (section.type !== "premium-hero") throw Error("Expected hero");
    const edited = applyPremiumEdit(layout, "guided", {
      kind: "replace-section",
      pageId: "home",
      section: { ...section, heading: "Customer-owned copy" },
    });
    expect(edited.pages[0].sections[0]).toMatchObject({
      heading: "Customer-owned copy",
    });
    expect(() =>
      applyPremiumEdit(layout, "advanced", {
        kind: "replace-section",
        pageId: "home",
        section: { ...section, variant: "typographic" },
      }),
    ).toThrow(/Lock/);
    expect(() =>
      applyPremiumEdit(layout, "advanced", {
        kind: "token",
        key: "font",
        value: "system-sans",
      }),
    ).toThrow(/Lock/);
    const changed = applyPremiumEdit(layout, "advanced", {
      kind: "token",
      key: "accent",
      value: "#445577",
    });
    expect(changed.tokens.accent).toBe("#445577");
    expect(() =>
      applyPremiumEdit(layout, "advanced", {
        kind: "token",
        key: "accent",
        value: "red; background:url(javascript:evil)",
      }),
    ).toThrow();
  });
  it("requires the correct content capability rather than treating text as blanket access", () => {
    const layout = structuralLayout("haven", "Demo site"),
      section = layout.pages[0].sections[0];
    if (section.type !== "premium-hero") throw Error("Expected hero");
    layout.permissions.guided = ["text"];
    expect(() =>
      applyPremiumEdit(layout, "guided", {
        kind: "replace-section",
        pageId: "home",
        section: {
          ...section,
          image: { src: "builtin:hospitality/stay", alt: "Room" },
        },
      }),
    ).toThrow(/Image/);
    expect(() =>
      applyPremiumEdit(layout, "guided", {
        kind: "replace-section",
        pageId: "home",
        section: { ...section, action: { label: "More", href: "/" } },
      }),
    ).toThrow(/Content/);
  });
  it("supports registered Advanced section/page composition without bypassing locks", () => {
    const layout = structuralLayout("meridian", "Demo site");
    const addition = {
      id: "new-contact",
      type: "contact-panel" as const,
      variant: "minimal" as const,
      heading: "Talk to us",
      body: "A new contact section.",
    };
    const inserted = applyPremiumEdit(layout, "advanced", {
      kind: "insert-section",
      pageId: "home",
      index: layout.pages[0].sections.length,
      section: addition,
    });
    expect(inserted.pages[0].sections.at(-1)?.id).toBe("new-contact");
    expect(() =>
      applyPremiumEdit(layout, "guided", {
        kind: "insert-section",
        pageId: "home",
        index: 5,
        section: addition,
      }),
    ).toThrow();
    expect(() =>
      applyPremiumEdit(layout, "advanced", {
        kind: "insert-section",
        pageId: "home",
        index: 0,
        section: addition,
      }),
    ).toThrow(/Lock/);
    const page = {
      id: "new-page",
      path: "/contact",
      title: "Contact",
      description: "Talk to our team.",
      navigation: true,
      sections: [addition],
      responsive: "stack" as const,
    };
    const expanded = applyPremiumEdit(layout, "advanced", {
      kind: "insert-page",
      page,
    });
    expect(expanded.pages).toHaveLength(3);
    expect(expanded.navigation.at(-1)?.href).toBe("/contact");
    expect(
      applyPremiumEdit(expanded, "advanced", {
        kind: "remove-page",
        pageId: "new-page",
      }).pages,
    ).toHaveLength(2);
    expect(() =>
      applyPremiumEdit(expanded, "advanced", {
        kind: "remove-page",
        pageId: "home",
      }),
    ).toThrow(/Lock/);
    expect(() =>
      applyPremiumEdit(layout, "advanced", {
        kind: "insert-page",
        page: { ...page, path: "/api/secret" },
      }),
    ).toThrow();
  });
  it("registers bounded composition recovery for exactly its website tab", () => {
    const key = "composition-draft:website-engine:website:site-a";
    const value = {
      version: 1,
      mode: "advanced",
      revision: '"draft-' + "a".repeat(64) + '"',
      edits: [{ kind: "token", key: "accent", value: "#334455" }],
    };
    expect(validateSnapshot(key, value, "user-a")).toEqual(value);
    expect(
      validateSnapshot("composition-draft:staff:root", value, "user-a"),
    ).toBeUndefined();
    expect(
      validateSnapshot(
        key,
        { ...value, edits: Array(41).fill(value.edits[0]) },
        "user-a",
      ),
    ).toBeUndefined();
    expect(
      validateSnapshots(
        { [key]: value },
        "user-a",
        "website-engine:website:site-b",
      ),
    ).toEqual({});
    expect(
      discardTabSnapshots({ [key]: value }, "website-engine:website:site-a"),
    ).toEqual({});
  });
  it("resolves page-specific metadata without inheriting the workspace title", () => {
    const layout = structuralLayout("haven", "Haven website");
    expect(websitePageDetails(layout, "/")).toMatchObject({
      title: "Haven website",
      description: "A thoughtful introduction.",
    });
    expect(websitePageDetails(layout, "/about")).toMatchObject({
      title: "About Haven website",
      description: "Our story and approach.",
    });
    expect(() => websitePageDetails(layout, "/missing")).toThrow();
    expect(
      websitePageDetails(makeInitialDraft("northstar-consulting"), "/").title,
    ).toBe("Northstar Consulting");
  });
  it("escapes customer markup instead of executing a section's text", () => {
    const layout = structuralLayout("meridian", "Demo site"),
      section = layout.pages[0].sections[0];
    if (section.type !== "premium-hero") throw Error("Expected hero");
    const edited = applyPremiumEdit(layout, "guided", {
      kind: "replace-section",
      pageId: "home",
      section: { ...section, heading: '<script>alert("unsafe")</script>' },
    });
    const html = renderToStaticMarkup(<LayoutRenderer blueprint={edited} />);
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>alert");
  });
  it("does not mutate legacy records or reinterpret unsupported compositions", () => {
    const legacy = makeInitialDraft("northstar-consulting"),
      copy = JSON.stringify(legacy);
    expect(
      websiteBlueprint(websiteDefinitionSchema.parse(legacy)).version,
    ).toBe(1);
    expect(JSON.stringify(legacy)).toBe(copy);
    expect(
      websiteDefinitionSchema.safeParse({
        schema: "lucia.layout-composition",
        version: 3,
      }).success,
    ).toBe(false);
  });

  it.each(premiumFlagshipIds)(
    "assigns %s through the real revision-protected website mutation contract",
    (id) => {
      const initial = makeInitialDraft("northstar-consulting");
      const canonical = websiteMutationSchema.parse({
        kind: "assign-layout", layoutId: id,
      });
      const created = mutateWebsite(initial, canonical);
      const validated = premiumLayoutSchema.parse(
        websiteDefinitionSchema.parse(JSON.parse(JSON.stringify(created))),
      );
      expect(validated.layoutId).toBe(id);
      expect(validated.identity.name).toBe(initial.siteName);
      expect(validated.pages.length).toBeGreaterThanOrEqual(6);
      const home = renderToStaticMarkup(
        <LayoutRenderer blueprint={websiteBlueprint(validated)} />,
      );
      expect(home).toContain('data-layout-id="' + id + '"');
      const firstPage = validated.pages.find((page) => page.path !== "/");
      if (!firstPage) throw Error("Expected a meaningful interior page");
      const interior = renderToStaticMarkup(
        <LayoutRenderer blueprint={websiteBlueprint(validated)} pagePath={firstPage.path} />,
      );
      expect(interior).toContain('data-page-path="' + firstPage.path + '"');
      const hero = validated.pages[0].sections.find((part) => part.type === "premium-hero");
      if (hero?.type !== "premium-hero") throw Error("Expected content-editable hero");
      const changed = mutateWebsite(validated, websiteMutationSchema.parse({
        kind: "composition-edit", mode: "guided",
        edits: [{
          kind: "replace-section", pageId: "home",
          section: { ...hero, heading: "Customer authored landing page" },
        }],
      }));
      const persisted = websiteDefinitionSchema.parse(JSON.parse(JSON.stringify(changed)));
      expect(premiumLayoutSchema.parse(persisted).pages[0].sections)
        .toContainEqual(expect.objectContaining({ heading: "Customer authored landing page" }));
      expect(validated.pages[0].sections.some((section) =>
        section.type === "premium-hero" && section.heading === "Customer authored landing page"
      )).toBe(false);
      expect(() => mutateWebsite(validated, initial)).toThrow();
      expect(() => mutateWebsite(validated, canonical)).toThrow();
    },
  );

  it("allows only the eight specified Phase 14 flagship candidate IDs for assignment", () => {
    for (const denied of [
      "lucia.layout.keystone", "lucia.layout.greenfield", "lucia.layout.fake",
      "lucia.layout.meridian/../../staff", "prototype:canvas",
    ]) {
      expect(websiteMutationSchema.safeParse({
        kind: "assign-layout", layoutId: denied,
      }).success).toBe(false);
    }
    expect(websiteMutationSchema.safeParse({
      kind: "assign-layout", layoutId: "lucia.layout.canvas",
      permissions: { lockedSections: [] },
    }).success).toBe(false);
  });

  it("renames a flagship site in Guided Mode without changing its canonical ID or design", () => {
    const base = premiumLayoutSchema.parse(mutateWebsite(
      makeInitialDraft("northstar-consulting"),
      websiteMutationSchema.parse({
        kind: "assign-layout", layoutId: "lucia.layout.meridian",
      }),
    ));
    const before = base.pages.map((p) => p.sections.map((s) => s.id));
    const renamed = premiumLayoutSchema.parse(mutateWebsite(base, {
      kind: "composition-edit", mode: "guided",
      edits: [{ kind: "brand", name: "Stonebridge Advisory" }],
    }));
    expect(renamed.identity.name).toBe("Stonebridge Advisory");
    expect(renamed.layoutId).toBe(base.layoutId);
    expect(renamed.pages[0].title).toBe("Stonebridge Advisory");
    expect(renamed.pages.map((p) => p.sections.map((s) => s.id))).toEqual(before);
    expect(renamed.pages.find((p) => p.path === "/services")?.title)
      .toContain("Stonebridge Advisory");
    expect(base.identity.name).not.toBe("Stonebridge Advisory");
    const html = renderToStaticMarkup(<LayoutRenderer blueprint={renamed} />);
    expect(html).toContain("Stonebridge Advisory");
    expect(() => mutateWebsite(base, {
      kind: "composition-edit", mode: "guided",
      edits: [{ kind: "brand", name: "X" }],
    })).toThrow();
    const denied = structuredClone(base);
    denied.permissions.guided = denied.permissions.guided.filter((permission) => permission !== "brand");
    expect(() => mutateWebsite(denied, {
      kind: "composition-edit", mode: "guided",
      edits: [{ kind: "brand", name: "A different owner" }],
    })).toThrow(/Brand edit denied/);
  });
});
