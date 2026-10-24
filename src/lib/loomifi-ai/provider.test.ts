import { describe, expect, it } from "vitest";
import { makeInitialDraft } from "@/lib/editor/site-draft";
import { siteDraftToLoomBlueprint } from "@/lib/loom/blueprint";
import { LoomifiAIError, proposeLoomBlueprint, type LoomifiAIProvider } from "./provider";

const validBlueprint = siteDraftToLoomBlueprint(makeInitialDraft("northstar-consulting"));
const provider = (generateBlueprint: LoomifiAIProvider["generateBlueprint"]): LoomifiAIProvider => ({
  id: "test-provider",
  generateBlueprint,
});

describe("LoomifiAI provider-neutral proposal boundary", () => {
  it("returns a validated proposal without persisting or publishing it", async () => {
    const result = await proposeLoomBlueprint(provider(async () => validBlueprint), "Create a modern consulting website for small businesses.");
    expect(result.providerId).toBe("test-provider");
    expect(result.blueprint).toEqual(validBlueprint);
  });

  it("rejects briefs that are too short or not text", async () => {
    await expect(proposeLoomBlueprint(provider(async () => validBlueprint), "short"))
      .rejects.toMatchObject({ code: "invalid_brief" });
    await expect(proposeLoomBlueprint(provider(async () => validBlueprint), null))
      .rejects.toMatchObject({ code: "invalid_brief" });
  });

  it("keeps non-AI website creation available when no provider is configured", async () => {
    await expect(proposeLoomBlueprint(null, "Create a modern consulting website for small businesses."))
      .rejects.toMatchObject({ code: "provider_unavailable" });
  });

  it("rejects malformed or unsafe provider output before it can be saved", async () => {
    await expect(proposeLoomBlueprint(provider(async () => ({ ...validBlueprint, injectedScript: "<script/>" })), "Create a modern consulting website for small businesses."))
      .rejects.toMatchObject({ code: "invalid_blueprint" });
  });

  it("reports provider timeouts without touching a draft", async () => {
    const hangingProvider = provider(() => new Promise<unknown>(() => {}));
    await expect(proposeLoomBlueprint(hangingProvider, "Create a modern consulting website for small businesses.", { timeoutMs: 5 }))
      .rejects.toMatchObject({ code: "timeout" });
  });

  it("normalises provider failures into recoverable errors", async () => {
    await expect(proposeLoomBlueprint(provider(async () => { throw new Error("provider secret or internals"); }), "Create a modern consulting website for small businesses."))
      .rejects.toMatchObject({ code: "provider_unavailable", message: expect.not.stringContaining("provider secret") });
  });

  it("uses the configured adapter id only as metadata", async () => {
    const result = await proposeLoomBlueprint(provider(async () => validBlueprint), "Create a modern consulting website for small businesses.");
    expect(result.providerId).toBe("test-provider");
    expect(result.blueprint.schema).toBe("lucia.loom-blueprint");
  });
});
