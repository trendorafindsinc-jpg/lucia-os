import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createVercelAIGatewayProvider, getConfiguredLoomifiAIProvider } from "./gateway";

function response(payload: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("Vercel AI Gateway adapter", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("sends the configured model and brief without exposing configuration to output", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response({
      choices: [{ message: { content: JSON.stringify({ schema: "lucia.loom-blueprint", version: 1 }) } }],
    }));
    const provider = createVercelAIGatewayProvider({ apiKey: "test-secret", model: "test/model" }, fetchMock);
    const result = await provider.generateBlueprint({
      brief: "A modern, accessible website for a local design studio.",
      signal: new AbortController().signal,
    });

    expect(result).toEqual({ schema: "lucia.loom-blueprint", version: 1 });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://ai-gateway.vercel.sh/v1/chat/completions");
    expect(init?.headers).toMatchObject({ Authorization: "Bearer test-secret" });
    const body = JSON.parse(String(init?.body));
    expect(body.model).toBe("test/model");
    expect(body.messages[1].content).toContain("design studio");
  });

  it("normalizes non-success responses without exposing provider response bodies", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("private provider details", { status: 429 }));
    const provider = createVercelAIGatewayProvider({ apiKey: "test-secret", model: "test/model" }, fetchMock);
    await expect(provider.generateBlueprint({
      brief: "A modern, accessible website for a local design studio.",
      signal: new AbortController().signal,
    })).rejects.toThrow("status 429");
    await expect(provider.generateBlueprint({
      brief: "A modern, accessible website for a local design studio.",
      signal: new AbortController().signal,
    })).rejects.not.toThrow("private provider details");
  });

  it("rejects missing choices and malformed JSON", async () => {
    const missingChoice = createVercelAIGatewayProvider(
      { apiKey: "test-secret", model: "test/model" },
      vi.fn<typeof fetch>().mockResolvedValue(response({ choices: [] })),
    );
    await expect(missingChoice.generateBlueprint({
      brief: "A modern, accessible website for a local design studio.",
      signal: new AbortController().signal,
    })).rejects.toThrow("Missing gateway choice");

    const malformedJson = createVercelAIGatewayProvider(
      { apiKey: "test-secret", model: "test/model" },
      vi.fn<typeof fetch>().mockResolvedValue(response({ choices: [{ message: { content: "{broken" } }] })),
    );
    await expect(malformedJson.generateBlueprint({
      brief: "A modern, accessible website for a local design studio.",
      signal: new AbortController().signal,
    })).rejects.toThrow("non-JSON");
  });

  it("does not configure the provider unless both server-side values exist", () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "");
    vi.stubEnv("LOOMIFIAI_MODEL", "test/model");
    expect(getConfiguredLoomifiAIProvider()).toBeNull();

    vi.stubEnv("AI_GATEWAY_API_KEY", "test-secret");
    vi.stubEnv("LOOMIFIAI_MODEL", "");
    expect(getConfiguredLoomifiAIProvider()).toBeNull();
  });
});
