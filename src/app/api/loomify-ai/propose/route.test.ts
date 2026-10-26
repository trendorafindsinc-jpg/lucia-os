import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeInitialDraft } from "@/lib/editor/site-draft";
import { siteDraftToLayoutBlueprint } from "@/lib/loom/blueprint";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  getDb: vi.fn(),
  provider: vi.fn(),
  propose: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.currentUser }));
vi.mock("@/lib/db/client", () => ({ getDb: mocks.getDb }));
vi.mock("@/lib/loomify-ai/gateway", () => ({ getConfiguredLoomifyAIProvider: mocks.provider }));
vi.mock("@/lib/loomify-ai/provider", async () => {
  const actual = await vi.importActual<typeof import("@/lib/loomify-ai/provider")>("@/lib/loomify-ai/provider");
  return { ...actual, proposeLayoutBlueprint: mocks.propose };
});
vi.mock("drizzle-orm", () => ({
  and: (...values: unknown[]) => values,
  eq: (...values: unknown[]) => values,
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings: [...strings], values }),
}));

import { POST } from "./route";

const websiteId = "b7c9a1f2-4d8e-4a6b-9c10-123456789abc";
const brief = "Create a modern, accessible website for a local design studio.";
const blueprint = siteDraftToLayoutBlueprint(makeInitialDraft("northstar-consulting"));

function request(body: unknown, origin = "https://preview.example.test") {
  return new Request("https://preview.example.test/api/loomify-ai/propose", {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify(body),
  });
}

function configureDb(membership: { organizationId: string; role: string; status: string }, websiteFound = true) {
  const membershipRow = {
    id: membership.organizationId,
    name: "Test organisation",
    slug: "test-organisation",
    status: "active",
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    role: membership.role,
    membershipStatus: membership.status,
  };
  const membershipQuery = {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([membershipRow]),
  };
  const websiteQuery = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(websiteFound ? [{ id: websiteId }] : []),
  };
  let selectCount = 0;
  const tx = {
    execute: vi.fn().mockResolvedValue(undefined),
    select: vi.fn(() => (++selectCount === 1 ? membershipQuery : websiteQuery)),
  };
  mocks.getDb.mockReturnValue({
    transaction: vi.fn(async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx)),
  });
  return { tx };
}

describe("POST /api/loomify-ai/propose authorization boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentUser.mockResolvedValue({ id: "b8e95a60-fbde-4c37-93e6-a2916c7b13d4", displayName: "Test editor" });
    mocks.provider.mockReturnValue({ id: "test-provider", generateBlueprint: vi.fn() });
    mocks.propose.mockResolvedValue({ providerId: "test-provider", blueprint });
    configureDb({ organizationId: "org-1", role: "editor", status: "active" });
  });

  it("rejects requests without an authenticated LUCIA OS session", async () => {
    mocks.currentUser.mockResolvedValue(null);
    const response = await POST(request({ websiteId, brief }));
    expect(response.status).toBe(401);
    expect(mocks.propose).not.toHaveBeenCalled();
  });

  it("rejects cross-origin requests before authentication or generation", async () => {
    const response = await POST(request({ websiteId, brief }, "https://attacker.example"));
    expect(response.status).toBe(403);
    expect(mocks.currentUser).not.toHaveBeenCalled();
    expect(mocks.propose).not.toHaveBeenCalled();
  });

  it("denies viewer memberships without querying the requested website", async () => {
    const { tx } = configureDb({ organizationId: "org-1", role: "viewer", status: "active" });
    const response = await POST(request({ websiteId, brief }));
    expect(response.status).toBe(404);
    expect(tx.select).toHaveBeenCalledTimes(1);
    expect(mocks.propose).not.toHaveBeenCalled();
  });

  it("denies a website ID that is not owned by the editor's organisation", async () => {
    const { tx } = configureDb({ organizationId: "org-1", role: "editor", status: "active" }, false);
    const response = await POST(request({ websiteId, brief }));
    expect(response.status).toBe(404);
    expect(tx.execute).toHaveBeenCalledTimes(2);
    expect(mocks.propose).not.toHaveBeenCalled();
  });

  it("returns a proposal for an authorized editor without persisting or publishing it", async () => {
    const { tx } = configureDb({ organizationId: "org-1", role: "editor", status: "active" });
    const response = await POST(request({ websiteId, brief }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      proposal: blueprint,
      provider: "test-provider",
      persisted: false,
      published: false,
    });
    expect(tx.execute).toHaveBeenCalledTimes(2);
    expect(mocks.propose).toHaveBeenCalledOnce();
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("returns a safe provider failure without saving or publishing a proposal", async () => {
    mocks.propose.mockRejectedValue(new Error("upstream provider detail"));
    const response = await POST(request({ websiteId, brief }));
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      error: "loomifyAI could not create a safe proposal. Your existing draft and live site have not been changed.",
    });
    expect(mocks.propose).toHaveBeenCalledOnce();
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("rejects malformed input before database access", async () => {
    const response = await POST(request({ websiteId: "not-a-uuid", brief: "too short" }));
    expect(response.status).toBe(422);
    expect(mocks.getDb).not.toHaveBeenCalled();
    expect(mocks.propose).not.toHaveBeenCalled();
  });
});
