import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentOrganizationAccess, getCurrentStaffUser } from "@/lib/access/guards";
import { getCurrentUser } from "@/lib/auth/session";
import { withOrganizationScope, withPlatformStaffScope } from "@/lib/db/tenant-scope";
import { platformAuditEvents, supportCases, supportMessages } from "@/lib/db/schema";
import { findSupportCaseForStaff, findSupportCaseForUser } from "@/lib/support/authorized-case";
import { supportMessageInputSchema } from "@/lib/support/validation";
import { z } from "zod";


type RouteContext = { params: Promise<{ caseId: string }> };

export async function getSupportMessages(_request: Request, context: RouteContext, staffMode = false) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { caseId } = await context.params;
  if (!z.string().uuid().safeParse(caseId).success) return NextResponse.json({ error: "Invalid support case id." }, { status: 400 });

  const tenantCase = staffMode ? null : await findSupportCaseForUser(caseId, user.id);
  if (tenantCase) {
    const access = await getCurrentOrganizationAccess(tenantCase.organizationId, "support.case.read");
    if (access) {
      const messages = await withOrganizationScope(tenantCase.organizationId, (tx) =>
        tx.select({ id: supportMessages.id, authorKind: supportMessages.authorKind, visibility: supportMessages.visibility, body: supportMessages.body, createdAt: supportMessages.createdAt })
          .from(supportMessages).where(and(
            eq(supportMessages.organizationId, tenantCase.organizationId),
            eq(supportMessages.caseId, tenantCase.id),
            eq(supportMessages.visibility, "customer"),
          )).orderBy(asc(supportMessages.createdAt)));
      return NextResponse.json({ messages }, { headers: { "Cache-Control": "no-store" } });
    }
  }

  const staffCase = staffMode ? await findSupportCaseForStaff(caseId, "support.cases.read") : null;
  if (!staffCase) return NextResponse.json({ error: "Support case not found or access denied." }, { status: 404 });
  const staff = await getCurrentStaffUser("support.cases.read");
  if (!staff) return NextResponse.json({ error: "Staff permission required." }, { status: 403 });
  const messages = await withPlatformStaffScope(staff.id, (tx) =>
    tx.select({ id: supportMessages.id, authorKind: supportMessages.authorKind, visibility: supportMessages.visibility, body: supportMessages.body, createdAt: supportMessages.createdAt })
      .from(supportMessages).where(and(eq(supportMessages.organizationId, staffCase.organizationId), eq(supportMessages.caseId, staffCase.id)))
      .orderBy(asc(supportMessages.createdAt)));
  return NextResponse.json({ messages }, { headers: { "Cache-Control": "no-store" } });
}

export async function postSupportMessage(request: Request, context: RouteContext, staffMode = false) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { caseId } = await context.params;
  if (!z.string().uuid().safeParse(caseId).success) return NextResponse.json({ error: "Invalid support case id." }, { status: 400 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  const parsed = supportMessageInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid message.", issues: parsed.error.flatten() }, { status: 400 });

  const tenantCase = staffMode ? null : await findSupportCaseForUser(caseId, user.id);
  const tenantAccess = tenantCase ? await getCurrentOrganizationAccess(tenantCase.organizationId, "support.case.read") : null;
  const staff = staffMode ? await getCurrentStaffUser("support.cases.reply") : null;
  const supportCase = staff ? await findSupportCaseForStaff(caseId, "support.cases.reply") : (tenantAccess ? tenantCase : null);
  if (!supportCase) return NextResponse.json({ error: "Support case reply denied." }, { status: 403 });
  if (supportCase.status === "closed" || supportCase.status === "resolved") {
    return NextResponse.json({ error: "This support case is closed. Reopen it before replying." }, { status: 409 });
  }

  const visibility = staff && new URL(request.url).searchParams.get("visibility") === "internal" ? "internal" : "customer";
  const authorKind = staff ? "staff" : "tenant";
  const result = staff
    ? await withPlatformStaffScope(staff.id, async (tx) => {
        const [message] = await tx.insert(supportMessages).values({
          organizationId: supportCase.organizationId, caseId: supportCase.id, authorUserId: user.id, authorKind, visibility, body: parsed.data.body,
        }).returning({ id: supportMessages.id, authorKind: supportMessages.authorKind, visibility: supportMessages.visibility, body: supportMessages.body, createdAt: supportMessages.createdAt });
        await tx.update(supportCases).set({ updatedAt: new Date(), ...(visibility === "customer" ? { status: "waiting_on_customer" } : {}) })
          .where(and(eq(supportCases.id, supportCase.id), eq(supportCases.organizationId, supportCase.organizationId)));
        await tx.insert(platformAuditEvents).values({
          actorUserId: user.id, actorKind: authorKind, organizationId: supportCase.organizationId,
          action: visibility === "internal" ? "support.case.internal_note_added" : "support.case.replied",
          targetType: "support_case", targetId: supportCase.id, purpose: "Support conversation update", result: "success",
        });
        return message;
      })
    : await withOrganizationScope(supportCase.organizationId, async (tx) => {
        const [message] = await tx.insert(supportMessages).values({
          organizationId: supportCase.organizationId, caseId: supportCase.id, authorUserId: user.id, authorKind, visibility: "customer", body: parsed.data.body,
        }).returning({ id: supportMessages.id, authorKind: supportMessages.authorKind, visibility: supportMessages.visibility, body: supportMessages.body, createdAt: supportMessages.createdAt });
        await tx.update(supportCases).set({ updatedAt: new Date(), status: "waiting_on_staff" })
          .where(and(eq(supportCases.id, supportCase.id), eq(supportCases.organizationId, supportCase.organizationId)));
        await tx.insert(platformAuditEvents).values({
          actorUserId: user.id, actorKind: authorKind, organizationId: supportCase.organizationId,
          action: "support.case.replied", targetType: "support_case", targetId: supportCase.id,
          purpose: "Support conversation update", result: "success",
        });
        return message;
      });

  return NextResponse.json({ message: result }, { status: 201 });
}
