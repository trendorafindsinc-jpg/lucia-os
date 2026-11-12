import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { websiteTemplates } from "./catalogue";
import { makeInitialDraft, siteDraftSchema } from "@/lib/editor/site-draft";
import { siteDraftToLayoutBlueprint } from "@/lib/layout-blueprint/blueprint";
import { LayoutRenderer } from "@/components/layout-studio/layout-renderer";
describe("existing Layout starters remain renderable during the premium architecture transition", () => {
  it.each(websiteTemplates)(
    "$id produces validated data and the actual safe renderer",
    (layout) => {
      const draft = siteDraftSchema.parse(makeInitialDraft(layout.id));
      const blueprint = siteDraftToLayoutBlueprint(draft);
      const html = renderToStaticMarkup(
        <LayoutRenderer blueprint={blueprint} />,
      );
      expect(html).toContain(layout.name.replaceAll("&", "&amp;"));
      expect(html).toContain('class="layout-site ');
      expect(html).not.toContain("undefined");
      expect(blueprint.pages[0].path).toBe("/");
    },
  );
  it("records actual rendering families and section/page structures rather than card counts", () => {
    const rows = websiteTemplates.map((t) => {
      const b = siteDraftToLayoutBlueprint(makeInitialDraft(t.id));
      return {
        id: t.id,
        name: t.name,
        category: t.category,
        style: t.style,
        family: b.theme.layout,
        sections: b.pages[0].sections.map((s) => s.type).join(" → "),
        pages: b.pages.length,
      };
    });
    console.log("CURRENT_LAYOUT_INVENTORY", JSON.stringify(rows));
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
    expect(rows.every((r) => r.pages >= 1)).toBe(true);
  });
});
