import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentOrganizationAccess } from "@/lib/access/guards";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { organizations, platformAuditEvents, supportCases, supportMessages } from "@/lib/db/schema";
import { supportCaseInputSchema } from "@/lib/support/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const url = new URL(request.url);
  const organizationId = url.searchParams.get("organizationId");
  if (!organizationId) return NextResponse.json({ error: "organizationId is required." }, { status: 400 });

  const access = await getCurrentOrganizationAccess(organizationId, "support.case.read");
  if (!access) return NextResponse.json({ error: "Organisation access denied." }, { status: 403 });

  const db = getDb();
  const rows = await db
    .select({
      id: supportCases.id,
      subject: supportCases.subject,
      category: supportCases.category,
      priority: supportCases.priority,
      status: supportCases.status,
      createdAt: supportCases.createdAt,
      updatedAt: supportCases.updatedAt,
    })
    .from(supportCases)
    .where(eq(supportCases.organizationId, access.membership.organizationId))
    .orderBy(desc(supportCases.updatedAt))
    .limit(50);

  return NextResponse.json({ cases: rows });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = supportCaseInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid support case details.", issues: parsed.error.flatten() }, { status: 400 });

  const access = await getCurrentOrganizationAccess(parsed.data.organizationId, "support.case.create");
  if (!access) return NextResponse.json({ error: "Organisation access denied." }, { status: 403 });

  const db = getDb();
  const created = await db.transaction(async (tx) => {
    const [organization] = await tx
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.id, access.membership.organizationId))
      .limit(1);
    if (!organization) throw new Error("ORGANIZATION_NOT_FOUND");

    const [supportCase] = await tx
      .insert(supportCases)
      .values({
        organizationId: organization.id,
        createdByUserId: user.id,
        subject: parsed.data.subject,
        category: parsed.data.category,
        priority: parsed.data.priority,
        status: "open",
      })
      .returning({
        id: supportCases.id,
        organizationId: supportCases.organizationId,
        subject: supportCases.subject,
        category: supportCases.category,
        priority: supportCases.priority,
        status: supportCases.status,
        createdAt: supportCases.createdAt,
      });

    await tx.insert(platformAuditEvents).values({
      actorUserId: user.id,
      actorKind: "tenant",
      organizationId: organization.id,
      action: "support.case.created",
      targetType: "support_case",
      targetId: supportCase.id,
      purpose: "Customer opened a support request",
      result: "success",
    });

    return supportCase;
  });

  return NextResponse.json({ case: created }, { status: 201 });
}
