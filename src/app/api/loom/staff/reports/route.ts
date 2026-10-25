import { and, asc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { appUsers, loomGroups, loomMemberRestrictions, loomMessages, loomPosts, loomProfiles, loomReplies, loomReports, platformAuditEvents } from "@/lib/db/schema";
import { requireLoomStaff } from "@/lib/loom/staff";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const reviewSchema = z.object({
  reportId: z.string().uuid(),
  decision: z.enum(["resolved", "dismissed"]),
  hideContent: z.boolean().default(false),
  memberAction: z.enum(["none", "restrict", "ban", "lift"]).default("none"),
}).strict();

export async function GET() {
  const access = await requireLoomStaff("loom.moderate").catch(() => ({ user: null, denied: "forbidden" as const }));
  if (access.denied === "unauthenticated") return NextResponse.json({ error: "Sign in to access moderation." }, { status: 401 });
  if (access.denied || !access.user) return NextResponse.json({ error: "Authorised Loom moderation staff only." }, { status: 403 });
  try {
    const db = getDb();
    const reports = await db.select({
      id: loomReports.id,
      reporterUserId: loomReports.reporterUserId,
      reporterName: appUsers.displayName,
      targetType: loomReports.targetType,
      targetId: loomReports.targetId,
      reason: loomReports.reason,
      details: loomReports.details,
      status: loomReports.status,
      createdAt: loomReports.createdAt,
    }).from(loomReports).innerJoin(appUsers, eq(loomReports.reporterUserId, appUsers.id))
      .where(inArray(loomReports.status, ["open", "reviewing"]))
      .orderBy(asc(loomReports.createdAt)).limit(100);
    return NextResponse.json({ reports }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Moderation queue is temporarily unavailable." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const access = await requireLoomStaff("loom.moderate").catch(() => ({ user: null, denied: "forbidden" as const }));
  if (access.denied === "unauthenticated") return NextResponse.json({ error: "Sign in to review reports." }, { status: 401 });
  if (access.denied || !access.user) return NextResponse.json({ error: "Authorised Loom moderation staff only." }, { status: 403 });
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "Submit a valid moderation decision." }, { status: 400 }); }
  const parsed = reviewSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid report and decision." }, { status: 422 });
  try {
    const db = getDb();
    const now = new Date();
    const result = await db.transaction(async tx => {
      const [report] = await tx.select({
        id: loomReports.id,
        reporterUserId: loomReports.reporterUserId,
        targetType: loomReports.targetType,
        targetId: loomReports.targetId,
        status: loomReports.status,
      }).from(loomReports).where(eq(loomReports.id, parsed.data.reportId)).limit(1);
      if (!report) return { kind: "not_found" as const };
      if (report.status !== "open" && report.status !== "reviewing") return { kind: "already_reviewed" as const };
      if (parsed.data.hideContent && report.targetType === "profile") return { kind: "unsupported_target" as const };
      if (parsed.data.memberAction !== "none") {
        let subjectUserId: string | null = null;
        if (report.targetType === "post") {
          const [target] = await tx.select({ userId: loomPosts.authorUserId }).from(loomPosts).where(eq(loomPosts.id, report.targetId)).limit(1);
          subjectUserId = target?.userId ?? null;
        } else if (report.targetType === "reply") {
          const [target] = await tx.select({ userId: loomReplies.authorUserId }).from(loomReplies).where(eq(loomReplies.id, report.targetId)).limit(1);
          subjectUserId = target?.userId ?? null;
        } else if (report.targetType === "profile") {
          const [target] = await tx.select({ userId: loomProfiles.userId }).from(loomProfiles).where(eq(loomProfiles.userId, report.targetId)).limit(1);
          subjectUserId = target?.userId ?? null;
        } else if (report.targetType === "group") {
          const [target] = await tx.select({ userId: loomGroups.createdByUserId }).from(loomGroups).where(eq(loomGroups.id, report.targetId)).limit(1);
          subjectUserId = target?.userId ?? null;
        } else if (report.targetType === "message") {
          const [target] = await tx.select({ sender: loomMessages.senderUserId, recipient: loomMessages.recipientUserId }).from(loomMessages).where(eq(loomMessages.id, report.targetId)).limit(1);
          subjectUserId = target ? (target.sender === report.reporterUserId ? target.recipient : target.sender) : null;
        }
        if (!subjectUserId) return { kind: "target_not_found" as const };
        if (subjectUserId === access.user!.id) return { kind: "cannot_restrict_self" as const };
        if (parsed.data.memberAction === "lift") {
          await tx.update(loomMemberRestrictions).set({ status: "lifted", liftedAt: now, liftedByStaffUserId: access.user!.id, updatedAt: now }).where(eq(loomMemberRestrictions.userId, subjectUserId));
        } else {
          await tx.insert(loomMemberRestrictions).values({ userId: subjectUserId, status: parsed.data.memberAction, reason: "Loom moderation action for report " + report.id, createdByStaffUserId: access.user!.id, updatedAt: now })
            .onConflictDoUpdate({ target: loomMemberRestrictions.userId, set: { status: parsed.data.memberAction, reason: "Loom moderation action for report " + report.id, createdByStaffUserId: access.user!.id, expiresAt: null, liftedAt: null, liftedByStaffUserId: null, updatedAt: now } });
        }
      }
      if (parsed.data.hideContent) {
        if (report.targetType === "post") {
          await tx.update(loomPosts).set({ moderationStatus: "hidden" }).where(eq(loomPosts.id, report.targetId));
        } else if (report.targetType === "reply") {
          await tx.update(loomReplies).set({ moderationStatus: "hidden" }).where(eq(loomReplies.id, report.targetId));
        } else if (report.targetType === "group") {
          await tx.update(loomGroups).set({ status: "restricted", updatedAt: now }).where(eq(loomGroups.id, report.targetId));
        } else if (report.targetType === "message") {
          await tx.delete(loomMessages).where(eq(loomMessages.id, report.targetId));
        } else if (report.targetType === "profile") {
          // Prevalidated before any writes.
        }
      }
      await tx.update(loomReports).set({
        status: parsed.data.decision,
        reviewedByUserId: access.user!.id,
        reviewedAt: now,
      }).where(and(eq(loomReports.id, report.id), inArray(loomReports.status, ["open", "reviewing"])));
      await tx.insert(platformAuditEvents).values({
        actorUserId: access.user!.id,
        actorKind: "platform_staff",
        action: parsed.data.hideContent ? "loom.moderation.hide_content" : "loom.moderation.review_report",
        targetType: report.targetType,
        targetId: report.targetId,
        purpose: "Review a community content report.",
        result: "success",
        metadata: JSON.stringify({ reportId: report.id, decision: parsed.data.decision, memberAction: parsed.data.memberAction, hideContent: parsed.data.hideContent }),
      });
      return { kind: "updated" as const, id: report.id, status: parsed.data.decision, contentHidden: parsed.data.hideContent };
    });
    if (result.kind === "not_found") return NextResponse.json({ error: "Report not found." }, { status: 404 });
    if (result.kind === "already_reviewed") return NextResponse.json({ error: "This report has already been reviewed." }, { status: 409 });
    if (result.kind === "target_not_found") return NextResponse.json({ error: "The reported member could not be resolved." }, { status: 404 });
    if (result.kind === "cannot_restrict_self") return NextResponse.json({ error: "Staff cannot restrict their own account through a report." }, { status: 422 });
    if (result.kind === "unsupported_target") return NextResponse.json({ error: "Profile moderation is not supported by hide-content. Resolve or dismiss the report without hiding the profile." }, { status: 422 });
    return NextResponse.json({ result }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Moderation decision could not be saved." }, { status: 503 });
  }
}
