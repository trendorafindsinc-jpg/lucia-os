import { and, desc, eq, ilike, isNull, notInArray } from "drizzle-orm";
import { consumeLoomRateLimit } from "@/lib/loom/rate-limit";
import { getLoomRestriction } from "@/lib/loom/staff";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { loomPublicAuthors, loomBlocks, loomBusinessVerifications, loomPosts } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const postSchema = z.object({ body: z.string().trim().min(1).max(4000) }).strict();

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser().catch(() => null);
    if (currentUser && (await getLoomRestriction(currentUser.id))?.status === "banned") return NextResponse.json({ error: "Loom access is unavailable for this account." }, { status: 403 });
    const db = getDb();
    const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 100);
    const base = db.select({
      id: loomPosts.id,
      body: loomPosts.body,
      createdAt: loomPosts.createdAt,
      authorId: loomPublicAuthors.id,
      authorName: loomPublicAuthors.displayName,
    }).from(loomPosts).innerJoin(loomPublicAuthors, eq(loomPosts.authorUserId, loomPublicAuthors.id));
    const blockedAuthors = currentUser ? [
      notInArray(loomPosts.authorUserId, db.select({ userId: loomBlocks.blockedUserId }).from(loomBlocks).where(eq(loomBlocks.blockerUserId, currentUser.id))),
      notInArray(loomPosts.authorUserId, db.select({ userId: loomBlocks.blockerUserId }).from(loomBlocks).where(eq(loomBlocks.blockedUserId, currentUser.id))),
    ] : [];
    const posts = await base.where(and(eq(loomPosts.moderationStatus, "visible"), isNull(loomPosts.groupId), ...blockedAuthors, query ? ilike(loomPosts.body, `%${query}%`) : undefined))
      .orderBy(desc(loomPosts.createdAt)).limit(50);
    return NextResponse.json({ posts, query: query || null }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Loom community storage is not available. Please try again later." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in with LUCIA ID to publish to Loom." }, { status: 401 });
  const restriction = await getLoomRestriction(user.id);
  if (restriction) return NextResponse.json({ error: "Your Loom participation is currently restricted." }, { status: 403 });
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "Submit a valid post." }, { status: 400 }); }
  const parsed = postSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Posts must contain 1–4,000 characters." }, { status: 422 });
  try {
    const db = getDb();
    const rate = await consumeLoomRateLimit(user.id, "publish", 10, 600000);
    if (!rate.allowed) return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });
    const [verification] = await db.select({ status: loomBusinessVerifications.status })
      .from(loomBusinessVerifications).where(eq(loomBusinessVerifications.userId, user.id)).limit(1);
    if (verification?.status !== "verified") {
      return NextResponse.json({ error: "Publishing is reserved for verified businesses. Submit business registration or domain evidence in Loom to request verification.", code: "BUSINESS_VERIFICATION_REQUIRED" }, { status: 403 });
    }
    const [post] = await db.insert(loomPosts).values({ authorUserId: user.id, body: parsed.data.body }).returning({
      id: loomPosts.id, body: loomPosts.body, createdAt: loomPosts.createdAt, authorId: loomPosts.authorUserId,
    });
    return NextResponse.json({ post: { ...post, authorName: user.displayName } }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: "Your post could not be saved. Your text is still available in the composer; please try again." }, { status: 503 });
  }
}
