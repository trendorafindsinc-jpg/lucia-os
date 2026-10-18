import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentOrganizationAccess, getCurrentStaffUser } from "@/lib/access/guards";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { platformAuditEvents, supportCases, supportMessages } from "@/lib/db/schema";
import { supportMessageInputSchema } from "@/lib/support/validation";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ caseId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { caseId } = await context.params;
  const db = getDb();
  const [supportCase] = await db
    .select({ id: supportCases.id, organizationId: supportCases.organizationId })
    .from(supportCases)
    .where(eq(supportCases.id, caseId))
    .limit(1);
  if (!supportCase) return NextResponse.json({ error: "Support case not found." }, { status: 404 });

  const tenantAccess = await getCurrentOrganizationAccess(supportCase.organizationId, "support.case.read");
  const staffAccess = await getCurrentStaffUser("support.cases.read");
  if (!tenantAccess && !staffAccess) return NextResponse.json({ error: "Support case access denied." }, { status: 403 });

  const messages = await db
    .select({
      id: supportMessages.id,
      authorKind: supportMessages.authorKind,
      visibility: supportMessages.visibility,
      body: supportMessages.body,
      createdAt: supportMessages.createdAt,
    })
    .from(supportMessages)
    .where(and(
      eq(supportMessages.organizationId, supportCase.organizationId),
      eq(supportMessages.caseId, supportCase.id),
      ...(staffAccess ? [] : [eq(supportMessages.visibility, "customer")]),
    ))
    .orderBy(asc(supportMessages.createdAt));

  return NextResponse.json({ messages });
}

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { caseId } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = supportMessageInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid message.", issues: parsed.error.flatten() }, { status: 400 });

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

  const tenantAccess = await getCurrentOrganizationAccess(supportCase.organizationId, "support.case.read");
  const staffAccess = await getCurrentStaffUser("support.cases.reply");
  if (!tenantAccess && !staffAccess) return NextResponse.json({ error: "Support case reply denied." }, { status: 403 });
  if (supportCase.status === "closed" || supportCase.status === "resolved") {
    return NextResponse.json({ error: "This support case is closed. Reopen it before replying." }, { status: 409 });
  }

  const visibility = staffAccess && new URL(request.url).searchParams.get("visibility") === "internal"
    ? "internal"
    : "customer";
  const authorKind = staffAccess ? "staff" : "tenant";

  const result = await db.transaction(async (tx) => {
    const [message] = await tx.insert(supportMessages).values({
      organizationId: supportCase.organizationId,
      caseId: supportCase.id,
      authorUserId: user.id,
      authorKind,
      visibility,
      body: parsed.data.body,
    }).returning({
      id: supportMessages.id,
      authorKind: supportMessages.authorKind,
      visibility: supportMessages.visibility,
      body: supportMessages.body,
      createdAt: supportMessages.createdAt,
    });

    await tx.update(supportCases).set({
      updatedAt: new Date(),
      status: staffAccess ? "waiting_on_customer" : "waiting_on_staff",
    }).where(and(eq(supportCases.id, supportCase.id), eq(supportCases.organizationId, supportCase.organizationId)));

    await tx.insert(platformAuditEvents).values({
      actorUserId: user.id,
      actorKind: authorKind,
      organizationId: supportCase.organizationId,
      action: visibility === "internal" ? "support.case.internal_note_added" : "support.case.replied",
      targetType: "support_case",
      targetId: supportCase.id,
      purpose: "Support conversation update",
      result: "success",
    });
    return message;
  });

  return NextResponse.json({ message: result }, { status: 201 });
}
