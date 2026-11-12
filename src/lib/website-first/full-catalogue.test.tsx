import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LayoutRenderer } from "@/components/layout-studio/layout-renderer";
import { premiumCandidate, premiumCandidateIds } from "@/lib/layout-blueprint/premium-layouts/catalogue-candidates";
import { applyPremiumEdit, parsePremiumLayout } from "@/lib/layout-blueprint/premium-composition";

describe("Phase 14 website-first catalogue structural gate", () => {
  const layouts = premiumCandidateIds.map((id) => parsePremiumLayout(premiumCandidate(id)));
  it("retains exactly 48 unique identities across eight categories", () => {
    expect(layouts).toHaveLength(48);
    expect(new Set(layouts.map((item) => item.layoutId)).size).toBe(48);
    const categories = new Map<string, number>();
    for (const item of layouts) categories.set(item.category, (categories.get(item.category) ?? 0) + 1);
    expect(categories.size).toBe(8);
    expect([...categories.values()]).toEqual(Array(8).fill(6));
  });

  it.each(layouts.map((layout) => [layout.layoutId, layout] as const))(
    "%s renders home and interior page through the canonical renderer",
    (id, layout) => {
      const home = layout.pages.find((page) => page.path === "/");
      const interior = layout.pages.find((page) => page.path !== "/");
      expect(home).toBeDefined();
      expect(interior).toBeDefined();
      expect(home!.sections.length).toBeGreaterThan(2);
      for (const page of [home!, interior!]) {
        const html = renderToStaticMarkup(<LayoutRenderer blueprint={layout} preview pagePath={page.path} />);
        expect(html).toContain("data-layout-version=\"2\"");
        expect(html).toContain("data-layout-id=\"" + id + "\"");
        expect(html).toContain("data-page-path=\"" + page.path + "\"");
        expect(html).toContain("premium-section");
      }
    },
  );

  it.each(layouts.map((layout) => [layout.layoutId, layout] as const))(
    "%s supports validated text updates, section insertion and section ordering",
    (_, layout) => {
      const page = layout.pages[0];
      const source = page.sections.find((section) => "heading" in section)!;
      expect(source).toBeDefined();
      if (!("heading" in source)) throw Error("Missing heading");
      const updated = applyPremiumEdit(layout, "advanced", {
        kind: "replace-section", pageId: page.id, section: { ...source, heading: "Customer-written heading" },
      });
      expect(updated.pages[0].sections.find((section) => section.id === source.id))
        .toMatchObject({ heading: "Customer-written heading" });
      const inserted = applyPremiumEdit(updated, "advanced", {
        kind: "insert-section", pageId: page.id, index: updated.pages[0].sections.length,
        section: { id: "customer-story", type: "editorial-story", variant: "narrow",
          heading: "A customer section", body: "A validated, editable website paragraph." },
      });
      const ids = inserted.pages[0].sections.map((section) => section.id);
      const reordered = applyPremiumEdit(inserted, "advanced", { kind: "reorder", pageId: page.id, sectionIds: ids });
      expect(reordered.pages[0].sections.at(-1)?.id).toBe("customer-story");
      expect(parsePremiumLayout(reordered).layoutId).toBe(layout.layoutId);
    },
  );
});
