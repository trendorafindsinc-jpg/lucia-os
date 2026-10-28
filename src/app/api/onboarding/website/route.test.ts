import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  getDb: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.currentUser }));
vi.mock("@/lib/db/client", () => ({ getDb: mocks.getDb }));
vi.mock("drizzle-orm", () => ({
  and: (...values: unknown[]) => values,
  eq: (...values: unknown[]) => values,
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings: [...strings], values }),
}));

import { POST } from "./route";
import { memberships, organizations, websitePages, websites } from "@/lib/db/schema";

const userId = "b8e95a60-fbde-4c37-93e6-a2916c7b13d4";
const organizationId = "f1e4dbf7-12b6-4285-8c4c-42cdb0b4e1fa";
const websiteId = "a660ce01-079a-4409-a9e0-c5eb30c699b9";
const payload = {
  organisationName: "LUCIA Studio",
  websiteName: "LUCIA Studio",
  organisationType: "Business or service",
  goal: "Get enquiries or bookings",
  templateId: "northstar-consulting",
  country: "Nigeria",
  siteSlug: "lucia-studio",
};

function request(body: unknown = payload) {
  return new Request("https://os.lucia.name.ng/api/onboarding/website", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function configureTransaction(options: {
  failMembership?: boolean;
  failWebsite?: boolean;
  existingMembership?: boolean;
  existingWebsite?: boolean;
} = {}) {
  const writes: Array<{ table: unknown; values: unknown }> = [];
  const execute = vi.fn().mockResolvedValue([]);
  const membershipLookup = {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(options.existingMembership
      ? [{ id: organizationId, name: payload.organisationName, slug: "lucia-studio", status: "active" }]
      : []),
  };
  const websiteLookup = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(options.existingWebsite
      ? [{ id: websiteId, name: payload.websiteName, slug: payload.siteSlug }]
      : []),
  };
  const select = vi.fn()
    .mockReturnValueOnce(membershipLookup)
    .mockReturnValue(websiteLookup);
  const insert = vi.fn((table: unknown) => ({
    values: vi.fn((values: unknown) => {
      writes.push({ table, values });
      if (table === memberships && options.failMembership) {
        return Promise.reject(new Error("injected owner membership failure"));
      }
      if (table === websites && options.failWebsite) {
        return { returning: vi.fn().mockRejectedValue(new Error("injected website failure")) };
      }
      return {
        returning: vi.fn(async () => table === organizations
          ? [{ id: organizationId, name: payload.organisationName, slug: "lucia-studio-abcd1234", status: "active" }]
          : [{ id: websiteId, name: payload.websiteName, slug: payload.siteSlug }]),
      };
    }),
  }));
  const tx = { execute, select, insert };
  let committed = false;
  const transaction = vi.fn(async (callback: (transaction: typeof tx) => Promise<unknown>) => {
    const result = await callback(tx);
    committed = true;
    return result;
  });
  mocks.getDb.mockReturnValue({ transaction });
  return { tx, transaction, writes, didCommit: () => committed };
}

describe("POST /api/onboarding/website transaction boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentUser.mockResolvedValue({ id: userId, displayName: "Test owner" });
  });

  it("rejects unauthenticated requests before opening the database", async () => {
    mocks.currentUser.mockResolvedValue(null);
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON before opening the database", async () => {
    const malformed = new Request("https://os.lucia.name.ng/api/onboarding/website", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    });
    const response = await POST(malformed);
    expect(response.status).toBe(400);
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("rejects invalid setup input before opening the database", async () => {
    const response = await POST(request({ ...payload, siteSlug: "../outside" }));
    expect(response.status).toBe(422);
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("rolls back the transaction when initial owner membership creation fails", async () => {
    const { transaction, writes, didCommit } = configureTransaction({ failMembership: true });
    const response = await POST(request());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "We couldn't save your website yet. Please try again shortly.",
    });
    expect(transaction).toHaveBeenCalledOnce();
    expect(writes.some((write) => write.table === organizations)).toBe(true);
    expect(writes.some((write) => write.table === memberships)).toBe(true);
    expect(writes.some((write) => write.table === websites)).toBe(false);
    expect(didCommit()).toBe(false);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("rolls back organization, owner membership and website when website creation fails", async () => {
    const { transaction, writes, didCommit } = configureTransaction({ failWebsite: true });
    const response = await POST(request());

    expect(response.status).toBe(500);
    expect(transaction).toHaveBeenCalledOnce();
    expect(writes.some((write) => write.table === organizations)).toBe(true);
    expect(writes.some((write) => write.table === memberships)).toBe(true);
    expect(writes.some((write) => write.table === websites)).toBe(true);
    expect(writes.some((write) => write.table === websitePages)).toBe(false);
    expect(didCommit()).toBe(false);
  });

  it("creates the organization, owner membership, website and pages in one transaction", async () => {
    const { transaction, writes, didCommit } = configureTransaction();
    const response = await POST(request());

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      organization: { id: organizationId, name: payload.organisationName },
      website: { id: websiteId, slug: payload.siteSlug },
      status: "draft",
      reused: false,
    });
    expect(transaction).toHaveBeenCalledOnce();
    expect(writes.map((write) => write.table)).toEqual([
      organizations,
      memberships,
      websites,
      websitePages,
    ]);
    expect(didCommit()).toBe(true);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("reuses an existing owned organization and website on a repeated setup request", async () => {
    const { tx, transaction, writes, didCommit } = configureTransaction({
      existingMembership: true,
      existingWebsite: true,
    });
    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      organization: { id: organizationId, name: payload.organisationName },
      website: { id: websiteId, slug: payload.siteSlug },
      reused: true,
    });
    expect(transaction).toHaveBeenCalledOnce();
    expect(tx.execute).toHaveBeenCalledTimes(3);
    expect(writes).toHaveLength(0);
    expect(didCommit()).toBe(true);
  });

  it("returns a safe service error when database initialization fails", async () => {
    mocks.getDb.mockImplementation(() => {
      throw new Error("private connection string details");
    });
    const response = await POST(request());
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({
      error: "We couldn't save your website yet. Please try again shortly.",
    });
    expect(JSON.stringify(body)).not.toContain("private connection string details");
  });
});
