import React from "react";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LayoutRenderer } from "@/components/layout-studio/layout-renderer";
import { parsePremiumLayout } from "../premium-composition";
import { meridianCandidate } from "./meridian";
import { premiumAssetDimensions } from "../premium-assets";

describe("Phase 14 Meridian batch-one candidate", () => {
  it("ships the exact provenance-recorded generated images with correct intrinsic dimensions", () => {
    const provenance = JSON.parse(readFileSync("docs/acceptance/phase-14/meridian/asset-provenance.json", "utf8")) as {
      asset: string; sha256: string; bytes: number; width: number; height: number; disclosure: string;
    }[];
    expect(provenance).toHaveLength(4);
    for (const entry of provenance) {
      const bytes = readFileSync(entry.asset);
      expect(bytes.length).toBe(entry.bytes);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(entry.sha256);
      const reference = "builtin:meridian/" + entry.asset.split("/").at(-1)!.replace(".webp", "");
      expect(premiumAssetDimensions(reference)).toEqual({ width: entry.width, height: entry.height });
      expect(entry.disclosure).toContain("Synthetic");
    }
    const html = renderToStaticMarkup(<LayoutRenderer blueprint={meridianCandidate()} />);
    expect(html).toContain('width="900" height="1125"');
    expect(html).toContain("generated illustrations");
  });
  it("tracks the exact canonical 48 identities without inflated acceptance counts", () => {
    const inventory = JSON.parse(
      readFileSync("docs/phase-14-layout-inventory.json", "utf8"),
    );
    const canonical = Array.from(
      readFileSync("docs/layouts-48-premium-catalogue.md", "utf8").matchAll(
        /\|\s*\d+\s*\|\s*\*\*([^*]+)\*\*/g,
      ),
      (m) => m[1],
    );
    expect(inventory.layouts.map((r: { name: string }) => r.name)).toEqual(
      canonical,
    );
    expect(inventory.layouts).toHaveLength(48);
    expect(
      new Set(inventory.layouts.map((r: { id: string }) => r.id)).size,
    ).toBe(48);
    const counts = new Map<string, number>();
    for (const row of inventory.layouts)
      counts.set(row.category, (counts.get(row.category) ?? 0) + 1);
    expect(counts.size).toBe(8);
    expect([...counts.values()].every((count) => count === 6)).toBe(true);
    expect(inventory.accepted).toBe(
      inventory.layouts.filter((r: { accepted: boolean }) => r.accepted).length,
    );
  });
  it("builds ten meaningful registered pages with unique section identities", () => {
    const layout = meridianCandidate();
    expect(layout.layoutId).toBe("lucia.layout.meridian");
    expect(layout.layoutVersion).toBe(2);
    expect(layout.pages.map((p) => p.path)).toEqual([
      "/",
      "/services",
      "/work",
      "/work/service-journey",
      "/work/strategic-direction",
      "/work/operating-rhythm",
      "/about",
      "/insights",
      "/contact",
      "/privacy",
    ]);
    const sequences = layout.pages.map((p) =>
      p.sections.map((s) => s.type).join(","),
    );
    expect(new Set(sequences).size).toBeGreaterThan(2);
    for (const page of layout.pages) {
      const html = renderToStaticMarkup(
        <LayoutRenderer blueprint={layout} pagePath={page.path} />,
      );
      expect(html).toContain(`data-page-path="${page.path}"`);
    }
  });
  it("renders a keyboard-reachable case rail linked to the actual case page", () => {
    const html = renderToStaticMarkup(
      <LayoutRenderer blueprint={meridianCandidate()} />,
    );
    expect(html).toContain('href="/work/service-journey"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('role="region"');
  });
  it.each(["javascript:alert(1)", "/staff", "/not-registered"])(
    "rejects unsafe or unavailable case destination %s",
    (href) => {
      const layout = meridianCandidate();
      const gallery = layout.pages[0].sections.find(
        (s) => s.type === "project-gallery",
      )!;
      if (gallery.type !== "project-gallery") throw Error("Expected gallery");
      gallery.projects[0].href = href;
      expect(() => parsePremiumLayout(layout)).toThrow();
    },
  );
  it("does not present sample material as actual clients or measured outcomes", () => {
    const layout = meridianCandidate();
    expect(layout.identity.name).toContain("Demo");
    const html = renderToStaticMarkup(
      <LayoutRenderer blueprint={layout} pagePath="/work/service-journey" />,
    );
    expect(html).toContain("Fictional case study");
    expect(html).toContain("no invented statistics");
  });
});
