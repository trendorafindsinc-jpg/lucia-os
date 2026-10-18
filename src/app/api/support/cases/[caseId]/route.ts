import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentOrganizationAccess, getCurrentStaffUser } from "@/lib/access/guards";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { platformAuditEvents, staffGrants, supportCases } from "@/lib/db/schema";
import {
  supportCaseAssignmentSchema,
  supportCaseTransitionSchema,
} from "@/lib/support/validation";
import { z } from "zod";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ caseId: string }> };
const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("status"), status: supportCaseTransitionSchema.shape.status }),
  z.object({ action: z.literal("assign"), staffUserId: supportCaseAssignmentSchema.shape.staffUserId }),
]);

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { caseId } = await context.params;
  if (!z.string().uuid().safeParse(caseId).success) {
    return NextResponse.json({ error: "Invalid support case id." }, { status: 400 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = actionSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid support case update.", issues: parsed.error.flatten() }, { status: 400 });

  const db = getDb();
  const [supportCase] = await db
    .select({
      id: supportCases.id,
      organizationId: supportCases.organizationId,
      status: supportCases.status,
    })
    .from(supportCases)
    .where(eq(supportCases.id, caseId))
    .limit(1);
  if (!supportCase) return NextResponse.json({ error: "Support case not found." }, { status: 404 });

  const permission = parsed.data.action === "assign" ? "support.cases.assign" : "support.cases.resolve";
  const staff = await getCurrentStaffUser(permission);
  if (!staff) return NextResponse.json({ error: "Staff permission required." }, { status: 403 });

  if (parsed.data.action === "assign" && parsed.data.staffUserId) {
    const [assignee] = await db
      .select({ id: staffGrants.userId })
      .from(staffGrants)
      .where(and(
        eq(staffGrants.userId, parsed.data.staffUserId),
        eq(staffGrants.status, "active"),
      ))
      .limit(1);
    if (!assignee) return NextResponse.json({ error: "Assignee must have an active LUCIA OS staff grant." }, { status: 400 });
  }

  const update = parsed.data.action === "assign"
    ? { assignedStaffUserId: parsed.data.staffUserId, updatedAt: new Date() }
    : {
        status: parsed.data.status,
        updatedAt: new Date(),
        closedAt: parsed.data.status === "closed" || parsed.data.status === "resolved" ? new Date() : null,
      };

  const result = await db.transaction(async (tx) => {
    const [updated] = await tx.update(supportCases)
      .set(update)
      .where(and(eq(supportCases.id, supportCase.id), eq(supportCases.organizationId, supportCase.organizationId)))
      .returning({
        id: supportCases.id,
        assignedStaffUserId: supportCases.assignedStaffUserId,
        status: supportCases.status,
        updatedAt: supportCases.updatedAt,
      });

    await tx.insert(platformAuditEvents).values({
      actorUserId: user.id,
      actorKind: "staff",
      organizationId: supportCase.organizationId,
      action: parsed.data.action === "assign" ? "support.case.assigned" : "support.case.status_changed",
      targetType: "support_case",
      targetId: supportCase.id,
      purpose: parsed.data.action === "assign" ? "Support case assignment" : "Support case status update",
      result: "success",
    });
    return updated;
  });

  return NextResponse.json({ case: result });
}
