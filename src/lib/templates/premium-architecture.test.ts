import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
const canonical = readFileSync("docs/layouts-48-premium-catalogue.md", "utf8");
const architecture = readFileSync(
  "docs/phase-12-premium-layout-architecture.md",
  "utf8",
);
const names = [...canonical.matchAll(/^\|\s*\d+\s*\|\s*\*\*([^*]+)\*\*/gm)].map(
  (m) => m[1],
);
describe("one canonical premium design programme", () => {
  it("reserves the exact approved 48 names, in order, without registering fake available designs", () => {
    const headings = [...architecture.matchAll(/^### ([^\n]+)$/gm)].map(
      (m) => m[1],
    );
    const blueprints = headings.filter((h) => names.includes(h));
    expect(names).toHaveLength(48);
    expect(blueprints).toEqual(names);
    const ids = [
      ...architecture.matchAll(/\*\*Identity:\*\* `(lucia\.layout\.[a-z]+)`/g),
    ].map((m) => m[1]);
    expect(ids).toHaveLength(48);
    expect(new Set(ids).size).toBe(48);
    expect(ids).toEqual(names.map((n) => "lucia.layout." + n.toLowerCase()));
  });
  it("covers eight categories with six actual visual/page/responsive/customization briefs each", () => {
    const categories = [...canonical.matchAll(/^### \d+\. (.+)$/gm)].map(
      (m) => m[1],
    );
    expect(categories).toHaveLength(8);
    for (const category of categories) {
      const start = architecture.indexOf("\n## " + category + "\n");
      expect(start).toBeGreaterThan(0);
      const block = architecture
        .slice(start + 1)
        .split("\n## ")
        .slice(0, 1)
        .join("");
      expect(block.match(/\*\*Identity:/g) || []).toHaveLength(6);
    }
    for (const name of names) {
      const section = architecture
        .split("\n### " + name + "\n")[1]
        .split(/\n## /)[0]
        .split(/\n### /)[0];
      for (const field of [
        "Visual language and audience",
        "Pages and composition",
        "Responsive transformations",
        "Customization and Design Lock",
      ])
        expect(section).toContain("**" + field + ":**");
    }
  });
  it("provides eight flagship engineering handoffs rather than claiming eight implemented sites", () => {
    const flagships = [...architecture.matchAll(/^#### Flagship: (.+)$/gm)].map(
      (m) => m[1],
    );
    expect(flagships).toEqual([
      "Meridian",
      "Canvas",
      "Haven",
      "Academia",
      "Maison",
      "Nexus",
      "Impact",
      "Estate",
    ]);
    expect(architecture).toContain("zero of the new 48 Layouts");
  });
});
