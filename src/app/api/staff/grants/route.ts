import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentStaffUser } from "@/lib/access/guards";
import { withPlatformStaffScope } from "@/lib/db/tenant-scope";
import { appUsers, platformAuditEvents, staffGrants } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Staff are only granted support roles through this UI. Platform-operator and
// security-reviewer grants require a separate, reviewed operator procedure.
const grantInput = z.object({
  action: z.enum(["grant", "revoke"]),
  userId: z.string().uuid(),
  role: z.enum(["support_agent", "support_lead"]),
  reason: z.string().trim().min(5).max(300),
});

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  const operator = await getCurrentStaffUser("staff.grants.manage");
  if (!operator) return errorResponse("Platform-operator permission required.", 403);

  const users = await withPlatformStaffScope(operator.id, async (tx) =>
    tx.select({
      userId: appUsers.id,
      grantId: staffGrants.id,
      displayName: appUsers.displayName,
      active: appUsers.active,
      role: staffGrants.role,
      status: staffGrants.status,
      expiresAt: staffGrants.expiresAt,
      reason: staffGrants.reason,
      grantedAt: staffGrants.createdAt,
    })
      .from(appUsers)
      .leftJoin(staffGrants, eq(staffGrants.userId, appUsers.id))
      .orderBy(desc(appUsers.updatedAt))
      .limit(200),
  );

  return NextResponse.json({ users }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const operator = await getCurrentStaffUser("staff.grants.manage");
  if (!operator) return errorResponse("Platform-operator permission required.", 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }
  const parsed = grantInput.safeParse(body);
  if (!parsed.success) return NextResponse.json(
    { error: "Choose an existing user, a supported staff role, an action, and a reason.", issues: parsed.error.flatten() },
    { status: 400, headers: { "Cache-Control": "no-store" } },
  );

  const input = parsed.data;
  try {
    const result = await withPlatformStaffScope(operator.id, async (tx) => {
      const [target] = await tx.select({ id: appUsers.id, active: appUsers.active })
        .from(appUsers).where(eq(appUsers.id, input.userId)).limit(1);
      if (!target || !target.active) return { error: "Choose an active LUCIA OS user who has signed in at least once.", status: 404 as const };

      let grant;
      if (input.action === "grant") {
        [grant] = await tx.insert(staffGrants).values({
          userId: target.id,
          role: input.role,
          status: "active",
          grantedByUserId: operator.id,
          reason: input.reason,
          expiresAt: null,
        }).onConflictDoUpdate({
          target: [staffGrants.userId, staffGrants.role],
          set: {
            status: "active",
            grantedByUserId: operator.id,
            reason: input.reason,
            expiresAt: null,
            updatedAt: new Date(),
          },
        }).returning({
          id: staffGrants.id,
          userId: staffGrants.userId,
          role: staffGrants.role,
          status: staffGrants.status,
        });
      } else {
        [grant] = await tx.update(staffGrants).set({
          status: "revoked",
          grantedByUserId: operator.id,
          reason: input.reason,
          updatedAt: new Date(),
        }).where(and(
          eq(staffGrants.userId, target.id),
          eq(staffGrants.role, input.role),
          eq(staffGrants.status, "active"),
        )).returning({
          id: staffGrants.id,
          userId: staffGrants.userId,
          role: staffGrants.role,
          status: staffGrants.status,
        });
        if (!grant) return { error: "No active grant exists for that user and role.", status: 409 as const };
      }

      await tx.insert(platformAuditEvents).values({
        actorUserId: operator.id,
        actorKind: "staff",
        organizationId: null,
        action: input.action === "grant" ? "staff.grant.created" : "staff.grant.revoked",
        targetType: "platform_staff_grant",
        targetId: grant.id,
        purpose: input.reason,
        result: "success",
        metadata: JSON.stringify({ userId: target.id, role: input.role }),
      });
      return { grant };
    });

    if ("error" in result && typeof result.error === "string") {
      return errorResponse(result.error, typeof result.status === "number" ? result.status : 500);
    }
    if (!("grant" in result) || !result.grant) {
      return errorResponse("Staff access update did not return a grant record.", 500);
    }
    return NextResponse.json({ grant: result.grant }, { status: input.action === "grant" ? 201 : 200, headers: { "Cache-Control": "no-store" } });
  } catch {
    return errorResponse("Staff access could not be updated. No success was reported; check the audit log before retrying.", 500);
  }
}
