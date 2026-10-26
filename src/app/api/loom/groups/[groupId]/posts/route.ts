import { and, desc, eq, notInArray } from "drizzle-orm";
import { consumeLoomRateLimit } from "@/lib/loom/rate-limit";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { getLoomRestriction } from "@/lib/loom/staff";
import { appUsers, loomBlocks, loomBusinessVerifications, loomGroupMemberships, loomGroups, loomNotifications, loomPosts } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ groupId: string }> };
const postSchema = z.object({ body: z.string().trim().min(1).max(4000) }).strict();

export async function GET(request: Request, context: Context) {
  const { groupId } = await context.params;
  if (!z.string().uuid().safeParse(groupId).success) return NextResponse.json({ error: "Invalid group." }, { status: 400 });
  try {
    const user = await getCurrentUser().catch(() => null);
    if (user && (await getLoomRestriction(user.id))?.status === "banned") return NextResponse.json({ error: "Loom access is unavailable for this account." }, { status: 403 });
    const db = getDb();
    const [group] = await db.select({ id: loomGroups.id, name: loomGroups.name, slug: loomGroups.slug, description: loomGroups.description })
      .from(loomGroups).where(and(eq(loomGroups.id, groupId), eq(loomGroups.status, "active"), eq(loomGroups.visibility, "public"))).limit(1);
    if (!group) return NextResponse.json({ error: "Public group not found." }, { status: 404 });
    const blockedAuthors = user ? [
      notInArray(loomPosts.authorUserId, db.select({ userId: loomBlocks.blockedUserId }).from(loomBlocks).where(eq(loomBlocks.blockerUserId, user.id))),
      notInArray(loomPosts.authorUserId, db.select({ userId: loomBlocks.blockerUserId }).from(loomBlocks).where(eq(loomBlocks.blockedUserId, user.id))),
    ] : [];
    const [membership] = user ? await db.select({ role: loomGroupMemberships.role }).from(loomGroupMemberships).where(and(eq(loomGroupMemberships.groupId, groupId), eq(loomGroupMemberships.userId, user.id), eq(loomGroupMemberships.status, "active"))).limit(1) : [];
    const posts = await db.select({
      id: loomPosts.id,
      body: loomPosts.body,
      createdAt: loomPosts.createdAt,
      authorId: appUsers.id,
      authorName: appUsers.displayName,
    }).from(loomPosts).innerJoin(appUsers, eq(loomPosts.authorUserId, appUsers.id))
      .where(and(eq(loomPosts.groupId, groupId), eq(loomPosts.moderationStatus, "visible"), ...blockedAuthors))
      .orderBy(desc(loomPosts.createdAt)).limit(100);
    return NextResponse.json({ group: { ...group, isMember: Boolean(membership), memberRole: membership?.role ?? null }, posts }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Group discussion is temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request, context: Context) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in to publish in a group." }, { status: 401 });
  const restriction = await getLoomRestriction(user.id);
  if (restriction) return NextResponse.json({ error: "Your Loom participation is currently restricted." }, { status: 403 });
  const { groupId } = await context.params;
  if (!z.string().uuid().safeParse(groupId).success) return NextResponse.json({ error: "Invalid group." }, { status: 400 });
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "Submit a valid group post." }, { status: 400 }); }
  const parsed = postSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Posts must contain 1–4,000 characters." }, { status: 422 });
  try {
    const db = getDb();
    const rate = await consumeLoomRateLimit(user.id, "group_post", 10, 600000);
    if (!rate.allowed) return NextResponse.json({ error: "Too many posts. Try again shortly." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });
    const [verification] = await db.select({ status: loomBusinessVerifications.status }).from(loomBusinessVerifications).where(eq(loomBusinessVerifications.userId, user.id)).limit(1);
    if (verification?.status !== "verified") return NextResponse.json({ error: "Business verification is required to publish in groups." }, { status: 403 });
    const [membership] = await db.select({ id: loomGroupMemberships.id }).from(loomGroupMemberships).where(and(eq(loomGroupMemberships.groupId, groupId), eq(loomGroupMemberships.userId, user.id), eq(loomGroupMemberships.status, "active"))).limit(1);
    if (!membership) return NextResponse.json({ error: "Join this public group before publishing." }, { status: 403 });
    const [group] = await db.select({ id: loomGroups.id, name: loomGroups.name }).from(loomGroups).where(and(eq(loomGroups.id, groupId), eq(loomGroups.status, "active"), eq(loomGroups.visibility, "public"))).limit(1);
    if (!group) return NextResponse.json({ error: "Public group not found." }, { status: 404 });
    const post = await db.transaction(async tx => {
      const [created] = await tx.insert(loomPosts).values({ authorUserId: user.id, groupId, body: parsed.data.body }).returning({
        id: loomPosts.id, body: loomPosts.body, createdAt: loomPosts.createdAt, authorId: loomPosts.authorUserId,
      });
      const members = await tx.select({ userId: loomGroupMemberships.userId }).from(loomGroupMemberships)
        .where(and(eq(loomGroupMemberships.groupId, groupId), eq(loomGroupMemberships.status, "active"), notInArray(loomGroupMemberships.userId, [user.id])));
      if (members.length) await tx.insert(loomNotifications).values(members.map(member => ({
        userId: member.userId, actorUserId: user.id, kind: "group_post", targetId: created.id,
        body: (user.displayName || "A Loom member") + " posted in " + group.name + ".",
      })));
      return created;
    });
    return NextResponse.json({ post: { ...post, authorName: user.displayName } }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Group post could not be saved." }, { status: 503 });
  }
}
