import { describe, expect, it } from "vitest";
import { makeInitialWebsiteDraft } from "./initial-website-draft";

describe("initial website editor draft", () => {
  it("persists the selected template and requested website name", () => {
    const draft = makeInitialWebsiteDraft("bright-school", "Bright Future Academy");
    expect(draft.templateId).toBe("bright-school");
    expect(draft.siteName).toBe("Bright Future Academy");
    expect(draft.visibleSections.length).toBeGreaterThan(0);
  });

  it("rejects an unknown template rather than persisting invalid editor state", () => {
    expect(() => makeInitialWebsiteDraft("not-a-real-template", "My Website")).toThrow();
  });

  it("rejects an invalid website name before persistence", () => {
    expect(() => makeInitialWebsiteDraft("bright-school", "x")).toThrow();
  });
});
