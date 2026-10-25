import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { appUsers, loomPosts } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const postSchema = z.object({ body: z.string().trim().min(1).max(4000) }).strict();

export async function GET() {
  try {
    const db = getDb();
    const posts = await db.select({
      id: loomPosts.id,
      body: loomPosts.body,
      createdAt: loomPosts.createdAt,
      authorId: appUsers.id,
      authorName: appUsers.displayName,
    }).from(loomPosts).innerJoin(appUsers, eq(loomPosts.authorUserId, appUsers.id))
      .orderBy(desc(loomPosts.createdAt)).limit(50);
    return NextResponse.json({ posts }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Loom community storage is not available. Please try again later." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in with LUCIA ID to publish to Loom." }, { status: 401 });
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "Submit a valid post." }, { status: 400 }); }
  const parsed = postSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Posts must contain 1–4,000 characters." }, { status: 422 });
  try {
    const db = getDb();
    const [post] = await db.insert(loomPosts).values({ authorUserId: user.id, body: parsed.data.body }).returning({
      id: loomPosts.id, body: loomPosts.body, createdAt: loomPosts.createdAt, authorId: loomPosts.authorUserId,
    });
    return NextResponse.json({ post: { ...post, authorName: user.displayName } }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Your post could not be saved. Your text is still available in the composer; please try again." }, { status: 503 });
  }
}
