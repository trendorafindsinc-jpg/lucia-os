import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { appUsers, loomBusinessVerifications, loomPosts, loomSavedPosts } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const inputSchema = z.object({ postId: z.string().uuid() }).strict();

async function isVerified(userId: string) {
  const db = getDb();
  const [row] = await db.select({ status: loomBusinessVerifications.status }).from(loomBusinessVerifications).where(eq(loomBusinessVerifications.userId, userId)).limit(1);
  return row?.status === "verified";
}

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in to view saved posts." }, { status: 401 });
  try {
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
      .where(eq(loomSavedPosts.userId, user.id)).orderBy(desc(loomSavedPosts.createdAt)).limit(100);
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
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "Choose a post to save." }, { status: 400 }); }
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid post." }, { status: 422 });
  try {
    if (!(await isVerified(user.id))) return NextResponse.json({ error: "Business verification is required to save posts." }, { status: 403 });
    const db = getDb();
    const [post] = await db.select({ id: loomPosts.id }).from(loomPosts).where(eq(loomPosts.id, parsed.data.postId)).limit(1);
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
