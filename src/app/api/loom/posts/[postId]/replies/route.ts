import { and, asc, eq, notInArray } from "drizzle-orm";
import { consumeLoomRateLimit } from "@/lib/loom/rate-limit";
import { getLoomRestriction } from "@/lib/loom/staff";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { appUsers, loomBlocks, loomBusinessVerifications, loomGroupMemberships, loomGroups, loomNotifications, loomPosts, loomReplies } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const replySchema = z.object({ body: z.string().trim().min(1).max(2000) }).strict();

type Context = { params: Promise<{ postId: string }> };

export async function GET(_request: Request, context: Context) {
  const { postId } = await context.params;
  if (!z.string().uuid().safeParse(postId).success) return NextResponse.json({ error: "Invalid post." }, { status: 400 });
  try {
    const currentUser = await getCurrentUser().catch(() => null);
    if (currentUser && (await getLoomRestriction(currentUser.id))?.status === "banned") return NextResponse.json({ error: "Loom access is unavailable for this account." }, { status: 403 });
    const db = getDb();
    const [parent] = await db.select({ id: loomPosts.id, moderationStatus: loomPosts.moderationStatus, groupId: loomPosts.groupId })
      .from(loomPosts).where(eq(loomPosts.id, postId)).limit(1);
    if (!parent || parent.moderationStatus !== "visible") return NextResponse.json({ error: "That post could not be found." }, { status: 404 });
    if (parent.groupId) {
      const [group] = await db.select({ id: loomGroups.id }).from(loomGroups).where(and(eq(loomGroups.id, parent.groupId), eq(loomGroups.status, "active"), eq(loomGroups.visibility, "public"))).limit(1);
      if (!group) return NextResponse.json({ error: "That post could not be found." }, { status: 404 });
    }
    const replies = await db.select({
      id: loomReplies.id,
      postId: loomReplies.postId,
      body: loomReplies.body,
      createdAt: loomReplies.createdAt,
      authorId: appUsers.id,
      authorName: appUsers.displayName,
    }).from(loomReplies).innerJoin(appUsers, eq(loomReplies.authorUserId, appUsers.id))
      .where(and(
        eq(loomReplies.postId, postId),
        eq(loomReplies.moderationStatus, "visible"),
        ...(currentUser ? [
          notInArray(loomReplies.authorUserId, db.select({ userId: loomBlocks.blockedUserId }).from(loomBlocks).where(eq(loomBlocks.blockerUserId, currentUser.id))),
          notInArray(loomReplies.authorUserId, db.select({ userId: loomBlocks.blockerUserId }).from(loomBlocks).where(eq(loomBlocks.blockedUserId, currentUser.id))),
        ] : []),
      )).orderBy(asc(loomReplies.createdAt)).limit(100);
    return NextResponse.json({ replies }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Replies are temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request, context: Context) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in with LUCIA ID to reply." }, { status: 401 });
  const restriction = await getLoomRestriction(user.id);
  if (restriction) return NextResponse.json({ error: "Your Loom participation is currently restricted." }, { status: 403 });
  const { postId } = await context.params;
  if (!z.string().uuid().safeParse(postId).success) return NextResponse.json({ error: "Invalid post." }, { status: 400 });
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "Submit a valid reply." }, { status: 400 }); }
  const parsed = replySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Replies must contain 1–2,000 characters." }, { status: 422 });
  try {
    const db = getDb();
    const rate = await consumeLoomRateLimit(user.id, "reply", 20, 600000);
    if (!rate.allowed) return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });
    const [verification] = await db.select({ status: loomBusinessVerifications.status })
      .from(loomBusinessVerifications).where(eq(loomBusinessVerifications.userId, user.id)).limit(1);
    if (verification?.status !== "verified") return NextResponse.json({ error: "Only verified businesses can reply. Request business verification in Loom.", code: "BUSINESS_VERIFICATION_REQUIRED" }, { status: 403 });
    const [parent] = await db.select({ id: loomPosts.id, authorUserId: loomPosts.authorUserId, moderationStatus: loomPosts.moderationStatus, groupId: loomPosts.groupId }).from(loomPosts).where(eq(loomPosts.id, postId)).limit(1);
    if (!parent || parent.moderationStatus !== "visible") return NextResponse.json({ error: "That post could not be found." }, { status: 404 });
    if (parent.groupId) {
      const [membership] = await db.select({ id: loomGroupMemberships.id }).from(loomGroupMemberships).where(and(eq(loomGroupMemberships.groupId, parent.groupId), eq(loomGroupMemberships.userId, user.id), eq(loomGroupMemberships.status, "active"))).limit(1);
      if (!membership) return NextResponse.json({ error: "Join this group before replying." }, { status: 403 });
    }
    const [reply] = await db.insert(loomReplies).values({ postId, authorUserId: user.id, body: parsed.data.body }).returning({
      id: loomReplies.id, postId: loomReplies.postId, body: loomReplies.body, createdAt: loomReplies.createdAt, authorId: loomReplies.authorUserId,
    });
    if (parent.authorUserId !== user.id) {
      try { await db.insert(loomNotifications).values({ userId: parent.authorUserId, actorUserId: user.id, kind: "post_reply", targetId: postId, body: `${user.displayName || "A Loom member"} replied to your post.` }); } catch { /* The reply remains successful if notification delivery fails. */ }
    }
    return NextResponse.json({ reply: { ...reply, authorName: user.displayName } }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Your reply could not be saved. Please try again." }, { status: 503 });
  }
}
