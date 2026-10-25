import { and, desc, eq, or } from "drizzle-orm";
import { consumeLoomRateLimit } from "@/lib/loom/rate-limit";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { appUsers, loomBlocks, loomConnections } from "@/lib/db/schema";
import { getLoomRestriction } from "@/lib/loom/staff";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const inputSchema = z.object({ userId: z.string().uuid() }).strict();

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in to manage blocked members." }, { status: 401 });
  const restriction = await getLoomRestriction(user.id);
  if (restriction?.status === "banned") return NextResponse.json({ error: "Loom access is unavailable for this account." }, { status: 403 });
  try {
    const db = getDb();
    const blocks = await db.select({
      id: loomBlocks.id,
      userId: loomBlocks.blockedUserId,
      displayName: appUsers.displayName,
      createdAt: loomBlocks.createdAt,
    }).from(loomBlocks).innerJoin(appUsers, eq(loomBlocks.blockedUserId, appUsers.id))
      .where(eq(loomBlocks.blockerUserId, user.id)).orderBy(desc(loomBlocks.createdAt)).limit(100);
    return NextResponse.json({ blocks }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Blocked members could not be loaded." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in to block a member." }, { status: 401 });
  const restriction = await getLoomRestriction(user.id);
  if (restriction?.status === "banned") return NextResponse.json({ error: "Loom access is unavailable for this account." }, { status: 403 });
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "Choose a member to block." }, { status: 400 }); }
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success || parsed.data.userId === user.id) return NextResponse.json({ error: "Choose another member." }, { status: 422 });
  try {
    const db = getDb();
    const rate = await consumeLoomRateLimit(user.id, "block", 30, 86400000);
    if (!rate.allowed) return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });
    const [target] = await db.select({ id: appUsers.id }).from(appUsers).where(and(eq(appUsers.id, parsed.data.userId), eq(appUsers.active, true))).limit(1);
    if (!target) return NextResponse.json({ error: "Member not found." }, { status: 404 });
    const [block] = await db.insert(loomBlocks).values({ blockerUserId: user.id, blockedUserId: target.id }).onConflictDoNothing().returning({ id: loomBlocks.id });
    await db.update(loomConnections).set({ status: "blocked", updatedAt: new Date() }).where(or(
      and(eq(loomConnections.requesterUserId, user.id), eq(loomConnections.recipientUserId, target.id)),
      and(eq(loomConnections.requesterUserId, target.id), eq(loomConnections.recipientUserId, user.id)),
    ));
    return NextResponse.json({ ok: true, alreadyBlocked: !block }, { status: block ? 201 : 200 });
  } catch {
    return NextResponse.json({ error: "Member could not be blocked." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in to unblock a member." }, { status: 401 });
  const restriction = await getLoomRestriction(user.id);
  if (restriction?.status === "banned") return NextResponse.json({ error: "Loom access is unavailable for this account." }, { status: 403 });
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "Choose a member to unblock." }, { status: 400 }); }
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid member." }, { status: 422 });
  try {
    const db = getDb();
    await db.delete(loomBlocks).where(and(eq(loomBlocks.blockerUserId, user.id), eq(loomBlocks.blockedUserId, parsed.data.userId)));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Member could not be unblocked." }, { status: 503 });
  }
}
