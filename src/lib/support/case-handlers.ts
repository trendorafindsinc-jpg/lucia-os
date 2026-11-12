import { and, eq, isNull, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentOrganizationAccess, getCurrentStaffUser } from "@/lib/access/guards";
import { getCurrentUser } from "@/lib/auth/session";
import { withPlatformStaffScope } from "@/lib/db/tenant-scope";
import { hasStaffPermission } from "@/lib/access/policy";
import { platformAuditEvents, staffGrants, supportCases } from "@/lib/db/schema";
import { findSupportCaseForStaff, findSupportCaseForUser } from "@/lib/support/authorized-case";
import { supportCaseAssignmentSchema, supportCaseTransitionSchema } from "@/lib/support/validation";
import { z } from "zod";


type RouteContext = { params: Promise<{ caseId: string }> };
const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("claim") }),
  z.object({ action: z.literal("status"), status: supportCaseTransitionSchema.shape.status }),
  z.object({ action: z.literal("assign"), staffUserId: supportCaseAssignmentSchema.shape.staffUserId }),
]);

export async function getSupportCase(_request: Request, context: RouteContext, staffMode = false) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { caseId } = await context.params;
  if (!z.string().uuid().safeParse(caseId).success) return NextResponse.json({ error: "Invalid support case id." }, { status: 400 });

  const tenantCase = staffMode ? null : await findSupportCaseForUser(caseId, user.id);
  if (tenantCase) {
    const access = await getCurrentOrganizationAccess(tenantCase.organizationId, "support.case.read");
    if (access) return NextResponse.json({ case: tenantCase }, { headers: { "Cache-Control": "no-store" } });
  }

  const staffCase = staffMode ? await findSupportCaseForStaff(caseId, "support.cases.read") : null;
  if (staffCase) return NextResponse.json({ case: staffCase }, { headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ error: "Support case not found or access denied." }, { status: 404 });
}

export async function updateSupportCase(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { caseId } = await context.params;
  if (!z.string().uuid().safeParse(caseId).success) return NextResponse.json({ error: "Invalid support case id." }, { status: 400 });

  let raw: unknown;
  try { raw = await request.json(); }
  catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  const parsed = actionSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid support case update.", issues: parsed.error.flatten() }, { status: 400 });

  const permission = parsed.data.action === "claim" ? "support.cases.assign_self" : parsed.data.action === "assign" ? "support.cases.assign" : "support.cases.resolve";
  const staff = await getCurrentStaffUser(permission);
  if (!staff) return NextResponse.json({ error: "Staff permission required." }, { status: 403 });

  const [supportCase] = await withPlatformStaffScope(staff.id, (tx) =>
    tx.select({ id: supportCases.id, organizationId: supportCases.organizationId })
      .from(supportCases).where(eq(supportCases.id, caseId)).limit(1));
  if (!supportCase) return NextResponse.json({ error: "Support case not found." }, { status: 404 });


  if (parsed.data.action === "assign" && parsed.data.staffUserId) {
    const assigneeId = parsed.data.staffUserId;
    const assignees = await withPlatformStaffScope(staff.id, (tx) => tx.select({ role: staffGrants.role, status: staffGrants.status, expiresAt: staffGrants.expiresAt }).from(staffGrants)
      .where(and(eq(staffGrants.userId, assigneeId), eq(staffGrants.status, "active"))));
    if (!hasStaffPermission(assignees, "support.cases.reply")) return NextResponse.json({ error: "Assignee must have an active LUCIA OS staff grant." }, { status: 400 });
  }

  const update = parsed.data.action === "claim"
    ? { assignedStaffUserId: staff.id, updatedAt: new Date() }
    : parsed.data.action === "assign"
    ? { assignedStaffUserId: parsed.data.staffUserId, updatedAt: new Date() }
    : { status: parsed.data.status, updatedAt: new Date(), closedAt: ["closed", "resolved"].includes(parsed.data.status) ? new Date() : null };

  const result = await withPlatformStaffScope(staff.id, async (tx) => {
    const [updated] = await tx.update(supportCases).set(update)
      .where(and(eq(supportCases.id, supportCase.id), eq(supportCases.organizationId, supportCase.organizationId),
        parsed.data.action === "claim" ? or(isNull(supportCases.assignedStaffUserId), eq(supportCases.assignedStaffUserId, staff.id)) : undefined))
      .returning({ id: supportCases.id, assignedStaffUserId: supportCases.assignedStaffUserId, status: supportCases.status, updatedAt: supportCases.updatedAt });
    if (!updated) return null;
    await tx.insert(platformAuditEvents).values({
      actorUserId: user.id, actorKind: "staff", organizationId: supportCase.organizationId,
      action: parsed.data.action !== "status" ? "support.case.assigned" : "support.case.status_changed",
      targetType: "support_case", targetId: supportCase.id,
      purpose: parsed.data.action !== "status" ? "Support case assignment" : "Support case status update", result: "success",
    });
    return updated;
  });
  if (!result) return NextResponse.json({ error: "Case unavailable or already assigned. Refresh before trying again." }, { status: 409 });
  return NextResponse.json({ case: result });
}
