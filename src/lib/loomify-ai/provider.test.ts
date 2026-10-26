import { describe, expect, it } from "vitest";
import { makeInitialDraft } from "@/lib/editor/site-draft";
import { siteDraftToLayoutBlueprint } from "@/lib/layout-blueprint/blueprint";
import { LoomifyAIError, proposeLayoutBlueprint, type LoomifyAIProvider } from "./provider";

const validBlueprint = siteDraftToLayoutBlueprint(makeInitialDraft("northstar-consulting"));
const provider = (generateBlueprint: LoomifyAIProvider["generateBlueprint"]): LoomifyAIProvider => ({
  id: "test-provider",
  generateBlueprint,
});

describe("LoomifyAI provider-neutral proposal boundary", () => {
  it("returns a validated proposal without persisting or publishing it", async () => {
    const result = await proposeLayoutBlueprint(provider(async () => validBlueprint), "Create a modern consulting website for small businesses.");
    expect(result.providerId).toBe("test-provider");
    expect(result.blueprint).toEqual(validBlueprint);
  });

  it("rejects briefs that are too short or not text", async () => {
    await expect(proposeLayoutBlueprint(provider(async () => validBlueprint), "short"))
      .rejects.toMatchObject({ code: "invalid_brief" });
    await expect(proposeLayoutBlueprint(provider(async () => validBlueprint), null))
      .rejects.toMatchObject({ code: "invalid_brief" });
  });

  it("keeps non-AI website creation available when no provider is configured", async () => {
    await expect(proposeLayoutBlueprint(null, "Create a modern consulting website for small businesses."))
      .rejects.toMatchObject({ code: "provider_unavailable" });
  });

  it("rejects malformed or unsafe provider output before it can be saved", async () => {
    await expect(proposeLayoutBlueprint(provider(async () => ({ ...validBlueprint, injectedScript: "<script/>" })), "Create a modern consulting website for small businesses."))
      .rejects.toMatchObject({ code: "invalid_blueprint" });
  });

  it("reports provider timeouts without touching a draft", async () => {
    const hangingProvider = provider(() => new Promise<unknown>(() => {}));
    await expect(proposeLayoutBlueprint(hangingProvider, "Create a modern consulting website for small businesses.", { timeoutMs: 5 }))
      .rejects.toMatchObject({ code: "timeout" });
  });

  it("normalises provider failures into recoverable errors", async () => {
    await expect(proposeLayoutBlueprint(provider(async () => { throw new Error("provider secret or internals"); }), "Create a modern consulting website for small businesses."))
      .rejects.toMatchObject({ code: "provider_unavailable", message: expect.not.stringContaining("provider secret") });
  });

  it("uses the configured adapter id only as metadata", async () => {
    const result = await proposeLayoutBlueprint(provider(async () => validBlueprint), "Create a modern consulting website for small businesses.");
    expect(result.providerId).toBe("test-provider");
    expect(result.blueprint.schema).toBe("lucia.loom-blueprint");
  });
});
