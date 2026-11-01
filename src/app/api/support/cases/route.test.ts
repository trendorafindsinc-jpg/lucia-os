import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  organizationAccess: vi.fn(),
  withOrganizationScope: vi.fn(),
  getDb: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.currentUser }));
vi.mock("@/lib/access/guards", () => ({ getCurrentOrganizationAccess: mocks.organizationAccess }));
vi.mock("@/lib/db/tenant-scope", () => ({ withOrganizationScope: mocks.withOrganizationScope }));
vi.mock("@/lib/db/client", () => ({ getDb: mocks.getDb }));
vi.mock("drizzle-orm", () => ({
  and: (...values: unknown[]) => values,
  desc: (...values: unknown[]) => values,
  eq: (...values: unknown[]) => values,
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings: [...strings], values }),
}));

import { GET, POST } from "./route";

const userId = "b8e95a60-fbde-4c37-93e6-a2916c7b13d4";
const organizationId = "f1e4dbf7-12b6-4285-8c4c-42cdb0b4e1fa";

function getRequest(url = `https://os.lucia.name.ng/api/support/cases?organizationId=${organizationId}`) {
  return new Request(url);
}

function postRequest(body: unknown) {
  return new Request("https://os.lucia.name.ng/api/support/cases", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("support cases tenant authorization boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentUser.mockResolvedValue({ id: userId, displayName: "Test user" });
    mocks.organizationAccess.mockResolvedValue(null);
    mocks.withOrganizationScope.mockResolvedValue([]);
    mocks.getDb.mockReturnValue({ transaction: vi.fn() });
  });

  it("rejects case listing without a local authenticated session", async () => {
    mocks.currentUser.mockResolvedValue(null);
    const response = await GET(getRequest());
    expect(response.status).toBe(401);
    expect(mocks.organizationAccess).not.toHaveBeenCalled();
    expect(mocks.withOrganizationScope).not.toHaveBeenCalled();
  });

  it("rejects case listing for an organization without an active permitted membership", async () => {
    const response = await GET(getRequest());
    expect(response.status).toBe(403);
    expect(mocks.organizationAccess).toHaveBeenCalledWith(organizationId, "support.case.read");
    expect(mocks.withOrganizationScope).not.toHaveBeenCalled();
  });

  it("rejects case creation without a local authenticated session", async () => {
    mocks.currentUser.mockResolvedValue(null);
    const response = await POST(postRequest({ organizationId, subject: "Need help", category: "general", priority: "normal" }));
    expect(response.status).toBe(401);
    expect(mocks.organizationAccess).not.toHaveBeenCalled();
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("rejects case creation for an organization without create permission", async () => {
    const response = await POST(postRequest({ organizationId, subject: "Need help", category: "general", priority: "normal" }));
    expect(response.status).toBe(403);
    expect(mocks.organizationAccess).toHaveBeenCalledWith(organizationId, "support.case.create");
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("rejects malformed case input before checking tenant membership", async () => {
    const response = await POST(postRequest({ organizationId: "not-an-id", subject: "x" }));
    expect(response.status).toBe(400);
    expect(mocks.organizationAccess).not.toHaveBeenCalled();
    expect(mocks.getDb).not.toHaveBeenCalled();
  });
  it("persists opening details, case and audit using the same transaction", async () => {
    mocks.organizationAccess.mockResolvedValue({ membership: { organizationId } });
    const values = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: "new-case" }]) });
    const tx = {
      execute: vi.fn(),
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([{ id: organizationId }]) }) }) }),
      insert: vi.fn().mockReturnValue({ values }),
    };
    mocks.getDb.mockReturnValue({ transaction: vi.fn(fn => fn(tx)) });
    const response = await POST(postRequest({ organizationId, subject: "Publishing problem", body: "The button reports an error" }));
    expect(response.status).toBe(201);
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ caseId: "new-case", body: "The button reports an error", visibility: "customer", authorKind: "tenant", organizationId }));
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ action: "support.case.created", targetId: "new-case" }));
  });

});
