import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  execute: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  getDb: () => ({ transaction: mocks.transaction }),
}));

import {
  normalizeOrganizationId,
  normalizeUserId,
  withOrganizationScope,
  withUserScope,
} from "./tenant-scope";

describe("organization-scoped database context", () => {
  beforeEach(() => {
    mocks.execute.mockReset();
    mocks.execute.mockResolvedValue([]);
    mocks.transaction.mockReset();
    mocks.transaction.mockImplementation(async (operation) =>
      operation({ execute: mocks.execute }),
    );
  });

  it("normalizes valid UUID organization selectors", () => {
    expect(normalizeOrganizationId("  AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA  ")).toBe(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );
  });

  it.each(["", "org-1", "not-a-uuid", "aaaaaaaa-aaaa-4aaa-7aaa-aaaaaaaaaaaa"])(
    "rejects invalid organization identifiers before opening a transaction (%s)",
    async (organizationId) => {
      await expect(withOrganizationScope(organizationId, async () => "unused")).rejects.toThrow(
        "Invalid organization identifier.",
      );
      expect(mocks.transaction).not.toHaveBeenCalled();
    },
  );

  it("sets transaction-local organization context before running the operation", async () => {
    const order: string[] = [];
    mocks.execute.mockImplementation(async () => {
      order.push("scope");
      return [];
    });

    const result = await withOrganizationScope(
      "AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA",
      async () => {
        order.push("operation");
        return "ok";
      },
    );

    expect(result).toBe("ok");
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.execute).toHaveBeenCalledTimes(1);
    expect(order).toEqual(["scope", "operation"]);
  });
});

describe("user-scoped database context", () => {
  beforeEach(() => {
    mocks.execute.mockReset();
    mocks.execute.mockResolvedValue([]);
    mocks.transaction.mockReset();
    mocks.transaction.mockImplementation(async (operation) =>
      operation({ execute: mocks.execute }),
    );
  });

  it("normalizes valid local user IDs", () => {
    expect(normalizeUserId("  AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA  ")).toBe(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );
  });

  it.each(["", "user-1", "not-a-uuid", "aaaaaaaa-aaaa-4aaa-7aaa-aaaaaaaaaaaa"])(
    "rejects invalid user identifiers before opening a transaction (%s)",
    async (userId) => {
      await expect(withUserScope(userId, async () => "unused")).rejects.toThrow(
        "Invalid user identifier.",
      );
      expect(mocks.transaction).not.toHaveBeenCalled();
    },
  );

  it("sets transaction-local user context before running the operation", async () => {
    const order: string[] = [];
    mocks.execute.mockImplementation(async () => {
      order.push("user-scope");
      return [];
    });

    const result = await withUserScope(
      "AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA",
      async () => {
        order.push("operation");
        return "ok";
      },
    );

    expect(result).toBe("ok");
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.execute).toHaveBeenCalledTimes(1);
    expect(order).toEqual(["user-scope", "operation"]);
  });
});
