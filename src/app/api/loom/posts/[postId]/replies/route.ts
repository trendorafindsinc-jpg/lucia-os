import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { appUsers, loomBusinessVerifications, loomNotifications, loomPosts, loomReplies } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const replySchema = z.object({ body: z.string().trim().min(1).max(2000) }).strict();

type Context = { params: Promise<{ postId: string }> };

export async function GET(_request: Request, context: Context) {
  const { postId } = await context.params;
  if (!z.string().uuid().safeParse(postId).success) return NextResponse.json({ error: "Invalid post." }, { status: 400 });
  try {
    const db = getDb();
    const replies = await db.select({
      id: loomReplies.id,
      postId: loomReplies.postId,
      body: loomReplies.body,
      createdAt: loomReplies.createdAt,
      authorId: appUsers.id,
      authorName: appUsers.displayName,
    }).from(loomReplies).innerJoin(appUsers, eq(loomReplies.authorUserId, appUsers.id))
      .where(and(eq(loomReplies.postId, postId), eq(loomReplies.moderationStatus, "visible"))).orderBy(asc(loomReplies.createdAt)).limit(100);
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
  const { postId } = await context.params;
  if (!z.string().uuid().safeParse(postId).success) return NextResponse.json({ error: "Invalid post." }, { status: 400 });
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "Submit a valid reply." }, { status: 400 }); }
  const parsed = replySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Replies must contain 1–2,000 characters." }, { status: 422 });
  try {
    const db = getDb();
    const [verification] = await db.select({ status: loomBusinessVerifications.status })
      .from(loomBusinessVerifications).where(eq(loomBusinessVerifications.userId, user.id)).limit(1);
    if (verification?.status !== "verified") return NextResponse.json({ error: "Only verified businesses can reply. Request business verification in Loom.", code: "BUSINESS_VERIFICATION_REQUIRED" }, { status: 403 });
    const [parent] = await db.select({ id: loomPosts.id, authorUserId: loomPosts.authorUserId, moderationStatus: loomPosts.moderationStatus }).from(loomPosts).where(eq(loomPosts.id, postId)).limit(1);
    if (!parent || parent.moderationStatus !== "visible") return NextResponse.json({ error: "That post could not be found." }, { status: 404 });
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
