import { and, desc, eq } from "drizzle-orm";
import { getLoomRestriction } from "@/lib/loom/staff";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { appUsers, loomPosts, loomSavedPosts } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const inputSchema = z.object({ postId: z.string().uuid() }).strict();


export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in to view saved posts." }, { status: 401 });
  try {
    const restriction = await getLoomRestriction(user.id);
    if (restriction?.status === "banned") return NextResponse.json({ error: "Loom access is unavailable for this account." }, { status: 403 });
    const db = getDb();
    const saved = await db.select({
      id: loomSavedPosts.id,
      savedAt: loomSavedPosts.createdAt,
      postId: loomPosts.id,
      body: loomPosts.body,
      postCreatedAt: loomPosts.createdAt,
      authorId: appUsers.id,
      authorName: appUsers.displayName,
    }).from(loomSavedPosts).innerJoin(loomPosts, eq(loomSavedPosts.postId, loomPosts.id))
      .innerJoin(appUsers, eq(loomPosts.authorUserId, appUsers.id))
      .where(and(eq(loomSavedPosts.userId, user.id), eq(loomPosts.moderationStatus, "visible"))).orderBy(desc(loomSavedPosts.createdAt)).limit(100);
    return NextResponse.json({ saved }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Saved posts are temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in to save posts." }, { status: 401 });
  const restriction = await getLoomRestriction(user.id);
  if (restriction) return NextResponse.json({ error: "Your Loom participation is currently restricted." }, { status: 403 });
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "Choose a post to save." }, { status: 400 }); }
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid post." }, { status: 422 });
  try {
    const db = getDb();
    const [post] = await db.select({ id: loomPosts.id }).from(loomPosts).where(and(eq(loomPosts.id, parsed.data.postId), eq(loomPosts.moderationStatus, "visible"))).limit(1);
    if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });
    await db.insert(loomSavedPosts).values({ userId: user.id, postId: post.id }).onConflictDoNothing();
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Post could not be saved." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in to manage saved posts." }, { status: 401 });
  const restriction = await getLoomRestriction(user.id);
  if (restriction) return NextResponse.json({ error: "Your Loom participation is currently restricted." }, { status: 403 });
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "Choose a saved post." }, { status: 400 }); }
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid post." }, { status: 422 });
  try {
    const db = getDb();
    await db.delete(loomSavedPosts).where(and(eq(loomSavedPosts.userId, user.id), eq(loomSavedPosts.postId, parsed.data.postId)));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Saved post could not be removed." }, { status: 503 });
  }
}
