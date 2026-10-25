import { and, count, eq } from "drizzle-orm";
import { consumeLoomRateLimit } from "@/lib/loom/rate-limit";
import { getLoomRestriction } from "@/lib/loom/staff";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { loomBusinessVerifications, loomPosts, loomReactions } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const reactionSchema = z.object({ postId: z.string().uuid(), reaction: z.enum(["like", "insightful", "support"]).default("like") }).strict();

export async function GET(request: Request) {
  const postId = new URL(request.url).searchParams.get("postId");
  if (!z.string().uuid().safeParse(postId).success) return NextResponse.json({ error: "Choose a valid post." }, { status: 400 });
  const user = await getCurrentUser().catch(() => null);
  try {
    const db = getDb();
    const [post] = await db.select({ id: loomPosts.id }).from(loomPosts).where(and(eq(loomPosts.id, postId!), eq(loomPosts.moderationStatus, "visible"))).limit(1);
    if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });
    const [total] = await db.select({ count: count() }).from(loomReactions).where(eq(loomReactions.postId, postId!));
    const [mine] = user ? await db.select({ reaction: loomReactions.reaction }).from(loomReactions).where(and(eq(loomReactions.postId, postId!), eq(loomReactions.userId, user.id))).limit(1) : [];
    return NextResponse.json({ count: total?.count ?? 0, reaction: mine?.reaction ?? null }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Post reactions are temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in to react to a post." }, { status: 401 });
  const restriction = await getLoomRestriction(user.id);
  if (restriction) return NextResponse.json({ error: "Your Loom participation is currently restricted." }, { status: 403 });
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "Choose a valid reaction." }, { status: 400 }); }
  const parsed = reactionSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid post and reaction." }, { status: 422 });
  try {
    const db = getDb();
    const rate = await consumeLoomRateLimit(user.id, "reaction", 60, 600000);
    if (!rate.allowed) return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });
    const rate = await consumeLoomRateLimit(user.id, "reaction", 60, 600000);
    if (!rate.allowed) return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });
    const [verification] = await db.select({ status: loomBusinessVerifications.status }).from(loomBusinessVerifications).where(eq(loomBusinessVerifications.userId, user.id)).limit(1);
    if (verification?.status !== "verified") return NextResponse.json({ error: "Business verification is required to react to community posts." }, { status: 403 });
    const [post] = await db.select({ id: loomPosts.id }).from(loomPosts).where(and(eq(loomPosts.id, parsed.data.postId), eq(loomPosts.moderationStatus, "visible"))).limit(1);
    if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });
    const [existing] = await db.select({ id: loomReactions.id, reaction: loomReactions.reaction }).from(loomReactions).where(and(eq(loomReactions.postId, post.id), eq(loomReactions.userId, user.id))).limit(1);
    if (existing?.reaction === parsed.data.reaction) {
      await db.delete(loomReactions).where(eq(loomReactions.id, existing.id));
    } else if (existing) {
      await db.update(loomReactions).set({ reaction: parsed.data.reaction }).where(eq(loomReactions.id, existing.id));
    } else {
      await db.insert(loomReactions).values({ postId: post.id, userId: user.id, reaction: parsed.data.reaction });
    }
    const [total] = await db.select({ count: count() }).from(loomReactions).where(eq(loomReactions.postId, post.id));
    const [mine] = await db.select({ reaction: loomReactions.reaction }).from(loomReactions).where(and(eq(loomReactions.postId, post.id), eq(loomReactions.userId, user.id))).limit(1);
    return NextResponse.json({ count: total?.count ?? 0, reaction: mine?.reaction ?? null }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Your reaction could not be saved." }, { status: 503 });
  }
}
