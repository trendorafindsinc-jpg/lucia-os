import { describe, expect, it } from "vitest";
import { getPreferredTemplateId, getTemplateSetupHref } from "./navigation";

describe("template setup navigation", () => {
  it("routes a selected design through durable setup before opening the editor", () => {
    expect(getTemplateSetupHref("northstar-consulting")).toBe("/create?template=northstar-consulting");
  });

  it("prefers a valid URL-selected template over an older saved choice", () => {
    const knownTemplates = new Set(["northstar-consulting", "bright-school"]);
    expect(getPreferredTemplateId("bright-school", "northstar-consulting", (id) => knownTemplates.has(id))).toBe("bright-school");
  });

  it("ignores an unknown URL template and preserves the saved choice", () => {
    const knownTemplates = new Set(["northstar-consulting", "bright-school"]);
    expect(getPreferredTemplateId("unknown-template", "northstar-consulting", (id) => knownTemplates.has(id))).toBe("northstar-consulting");
  });

  it("encodes the template identifier as a query parameter", () => {
    expect(getTemplateSetupHref("school house & studio")).toBe("/create?template=school%20house%20%26%20studio");
  });
});
