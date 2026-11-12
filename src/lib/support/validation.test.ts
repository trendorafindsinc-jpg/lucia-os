import { describe, expect, it } from "vitest";
import {
  supportCaseAssignmentSchema,
  supportCaseInputSchema,
  supportCaseTransitionSchema,
  supportMessageInputSchema,
} from "./validation";

describe("support workflow input validation", () => {
  it("trims and bounds case subjects", () => {
    expect(supportCaseInputSchema.safeParse({
      organizationId: "b6d9d3a2-6d2e-4f2c-9f6b-2f4fdb3d87b1",
      subject: "  Website issue  ",
    }).success).toBe(true);
    expect(supportCaseInputSchema.safeParse({
      organizationId: "b6d9d3a2-6d2e-4f2c-9f6b-2f4fdb3d87b1",
      subject: "no",
    }).success).toBe(false);
  });

  it("rejects unknown categories and priorities", () => {
    expect(supportCaseInputSchema.safeParse({
      organizationId: "b6d9d3a2-6d2e-4f2c-9f6b-2f4fdb3d87b1",
      subject: "Help with publishing",
      category: "root",
    }).success).toBe(false);
  });

  it("limits message size and rejects empty replies", () => {
    expect(supportMessageInputSchema.safeParse({ body: "  " }).success).toBe(false);
    expect(supportMessageInputSchema.safeParse({ body: "Need help" }).success).toBe(true);
    expect(supportMessageInputSchema.safeParse({ body: "x".repeat(12001) }).success).toBe(false);
  });

  it("allows only known status transitions and UUID assignments", () => {
    expect(supportCaseTransitionSchema.safeParse({ status: "resolved" }).success).toBe(true);
    expect(supportCaseTransitionSchema.safeParse({ status: "deleted" }).success).toBe(false);
    expect(supportCaseAssignmentSchema.safeParse({ staffUserId: null }).success).toBe(true);
    expect(supportCaseAssignmentSchema.safeParse({ staffUserId: "not-a-uuid" }).success).toBe(false);
  });
});
