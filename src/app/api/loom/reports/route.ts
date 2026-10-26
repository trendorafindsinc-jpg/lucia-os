import { and, eq, or } from "drizzle-orm";
import { consumeLoomRateLimit } from "@/lib/loom/rate-limit";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { appUsers, loomBusinessVerifications, loomGroups, loomMessages, loomPosts, loomReplies, loomReports } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const reportSchema = z.object({
  targetType: z.enum(["post", "reply", "profile", "message", "group"]),
  targetId: z.string().trim().min(1).max(100),
  reason: z.enum(["spam", "harassment", "misinformation", "privacy", "other"]),
  details: z.string().trim().max(1000).default(""),
}).strict();

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in to report community content." }, { status: 401 });
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "Submit a valid report." }, { status: 400 }); }
  const parsed = reportSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid report reason and target." }, { status: 422 });
  try {
    const db = getDb();
    const rate = await consumeLoomRateLimit(user.id, "report", 5, 3600000);
    if (!rate.allowed) return NextResponse.json({ error: "Too many reports. Try again later." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });
    const target = parsed.data;
    if (target.targetType === "profile" && target.targetId === user.id) return NextResponse.json({ error: "This profile cannot be submitted as a report target." }, { status: 422 });
    let exists = false;
    if (target.targetType === "post") exists = Boolean((await db.select({ id: loomPosts.id }).from(loomPosts).where(eq(loomPosts.id, target.targetId)).limit(1))[0]);
    if (target.targetType === "reply") exists = Boolean((await db.select({ id: loomReplies.id }).from(loomReplies).where(eq(loomReplies.id, target.targetId)).limit(1))[0]);
    if (target.targetType === "profile") exists = Boolean((await db.select({ id: appUsers.id }).from(appUsers).innerJoin(loomBusinessVerifications, eq(loomBusinessVerifications.userId, appUsers.id)).where(and(eq(appUsers.id, target.targetId), eq(appUsers.active, true), eq(loomBusinessVerifications.status, "verified"))).limit(1))[0]);
    if (target.targetType === "group") exists = Boolean((await db.select({ id: loomGroups.id }).from(loomGroups).where(eq(loomGroups.id, target.targetId)).limit(1))[0]);
    if (target.targetType === "message") exists = Boolean((await db.select({ id: loomMessages.id }).from(loomMessages).where(and(
      eq(loomMessages.id, target.targetId),
      or(eq(loomMessages.senderUserId, user.id), eq(loomMessages.recipientUserId, user.id)),
    )).limit(1))[0]);
    if (!exists) return NextResponse.json({ error: "The reported content was not found or is not accessible." }, { status: 404 });
    const [report] = await db.insert(loomReports).values({
      reporterUserId: user.id, targetType: target.targetType, targetId: target.targetId,
      reason: target.reason, details: target.details, status: "open",
    }).returning({ id: loomReports.id, status: loomReports.status, createdAt: loomReports.createdAt });
    return NextResponse.json({ report, message: "Report received for staff review." }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Report could not be saved." }, { status: 503 });
  }
}
