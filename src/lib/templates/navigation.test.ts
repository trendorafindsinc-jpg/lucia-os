import { describe, expect, it } from "vitest";
import { getTemplateSetupHref } from "./navigation";

describe("template setup navigation", () => {
  it("routes a selected design through durable setup before opening the editor", () => {
    expect(getTemplateSetupHref("northstar-consulting")).toBe("/create?template=northstar-consulting");
  });

  it("encodes the template identifier as a query parameter", () => {
    expect(getTemplateSetupHref("school house & studio")).toBe("/create?template=school%20house%20%26%20studio");
  });
});
