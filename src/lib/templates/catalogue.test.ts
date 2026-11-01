import { describe, expect, it } from "vitest";
import { getTemplateById, templateCategories, websiteTemplates } from "./catalogue";

describe("website template catalogue", () => {
  it("contains at least 30 unique, categorised concepts", () => {
    expect(websiteTemplates.length).toBeGreaterThanOrEqual(30);
    expect(new Set(websiteTemplates.map((template) => template.id)).size).toBe(websiteTemplates.length);
    for (const template of websiteTemplates) {
      expect(template.name.trim().length).toBeGreaterThan(0);
      expect(template.description.trim().length).toBeGreaterThan(20);
      expect(template.sections.length).toBeGreaterThanOrEqual(4);
      expect(templateCategories).toContain(template.category);
    }
  });

  it("supports lookup by stable id and returns undefined for unknown ids", () => {
    expect(getTemplateById("schoolhouse")?.name).toBe("Schoolhouse");
    expect(getTemplateById("not-a-template")).toBeUndefined();
  });

  it("provides a palette of three colours for each preview", () => {
    for (const template of websiteTemplates) {
      expect(template.colors).toHaveLength(3);
      for (const colour of template.colors) expect(colour).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
