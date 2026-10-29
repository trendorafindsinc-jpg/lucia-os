import { and, desc, eq, or } from "drizzle-orm";
import { consumeLoomRateLimit } from "@/lib/loom/rate-limit";
import { alias } from "drizzle-orm/pg-core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { getLoomRestriction } from "@/lib/loom/staff";
import { loomPublicAuthors, loomBlocks, loomBusinessVerifications, loomConnections, loomNotifications } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const requestSchema = z.object({ recipientUserId: z.string().uuid() }).strict();
const actionSchema = z.object({ connectionId: z.string().uuid(), action: z.enum(["accept", "decline"]) }).strict();

async function verified(userId: string) {
  const db = getDb();
  const [row] = await db.select({ status: loomBusinessVerifications.status }).from(loomBusinessVerifications).where(eq(loomBusinessVerifications.userId, userId)).limit(1);
  return row?.status === "verified";
}

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in to view connections." }, { status: 401 });
  try {
    const restriction = await getLoomRestriction(user.id);
    if (restriction?.status === "banned") return NextResponse.json({ error: "Loom access is unavailable for this account." }, { status: 403 });
    const db = getDb();
    const requester = alias(loomPublicAuthors, "loom_requester");
    const recipient = alias(loomPublicAuthors, "loom_recipient");
    const rows = await db.select({
      id: loomConnections.id,
      requesterUserId: loomConnections.requesterUserId,
      recipientUserId: loomConnections.recipientUserId,
      status: loomConnections.status,
      createdAt: loomConnections.createdAt,
      requesterName: requester.displayName,
      recipientName: recipient.displayName,
    }).from(loomConnections).innerJoin(requester, eq(loomConnections.requesterUserId, requester.id))
      .innerJoin(recipient, eq(loomConnections.recipientUserId, recipient.id))
      .where(or(eq(loomConnections.requesterUserId, user.id), eq(loomConnections.recipientUserId, user.id)))
      .orderBy(desc(loomConnections.createdAt)).limit(100);
    const connections = rows.map(row => ({ ...row, direction: row.recipientUserId === user.id ? "incoming" : "outgoing", otherUserName: row.requesterUserId === user.id ? row.recipientName : row.requesterName }));
    return NextResponse.json({ connections }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Connections are temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in to connect with a member." }, { status: 401 });
  const restriction = await getLoomRestriction(user.id);
  if (restriction) return NextResponse.json({ error: "Your Loom participation is currently restricted." }, { status: 403 });
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "Submit a valid connection request." }, { status: 400 }); }
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success || parsed.data.recipientUserId === user.id) return NextResponse.json({ error: "Choose another member to connect with." }, { status: 422 });
  try {
    if (!(await verified(user.id))) return NextResponse.json({ error: "Business verification is required to send connection requests." }, { status: 403 });
    const db = getDb();
    const rate = await consumeLoomRateLimit(user.id, "connection", 20, 86400000);
    if (!rate.allowed) return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });
    const [recipient] = await db.select({ id: loomPublicAuthors.id }).from(loomPublicAuthors).where(and(eq(loomPublicAuthors.id, parsed.data.recipientUserId), eq(loomPublicAuthors.active, true))).limit(1);
    if (!recipient) return NextResponse.json({ error: "Member not found." }, { status: 404 });
    const recipientRestriction = await getLoomRestriction(recipient.id);
    if (recipientRestriction) return NextResponse.json({ error: "This member is not currently available for connections." }, { status: 403 });
    const [block] = await db.select({ id: loomBlocks.id }).from(loomBlocks).where(or(and(eq(loomBlocks.blockerUserId, user.id), eq(loomBlocks.blockedUserId, recipient.id)), and(eq(loomBlocks.blockerUserId, recipient.id), eq(loomBlocks.blockedUserId, user.id)))).limit(1);
    if (block) return NextResponse.json({ error: "A member in this connection has blocked the other." }, { status: 403 });
    const [existing] = await db.select({ id: loomConnections.id, status: loomConnections.status }).from(loomConnections).where(or(
      and(eq(loomConnections.requesterUserId, user.id), eq(loomConnections.recipientUserId, recipient.id)),
      and(eq(loomConnections.requesterUserId, recipient.id), eq(loomConnections.recipientUserId, user.id)),
    )).limit(1);
    if (existing && (existing.status === "pending" || existing.status === "accepted")) return NextResponse.json({ error: "A connection already exists between these members." }, { status: 409 });
    const [connection] = existing
      ? await db.update(loomConnections).set({ requesterUserId: user.id, recipientUserId: recipient.id, status: "pending", updatedAt: new Date() }).where(eq(loomConnections.id, existing.id)).returning()
      : await db.insert(loomConnections).values({ requesterUserId: user.id, recipientUserId: recipient.id, status: "pending" }).returning();
    try { await db.insert(loomNotifications).values({ userId: recipient.id, actorUserId: user.id, kind: "connection_request", targetId: connection.id, body: `${user.displayName || "A Loom member"} sent you a connection request.` }); } catch { /* The connection request remains successful if notification delivery fails. */ }
    return NextResponse.json({ connection }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    if (typeof cause === "object" && cause !== null && "code" in cause && cause.code === "23505") return NextResponse.json({ error: "A connection request already exists." }, { status: 409 });
    return NextResponse.json({ error: "Connection request could not be saved." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in to manage connection requests." }, { status: 401 });
  const restriction = await getLoomRestriction(user.id);
  if (restriction) return NextResponse.json({ error: "Your Loom participation is currently restricted." }, { status: 403 });
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "Submit a valid action." }, { status: 400 }); }
  const parsed = actionSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid connection action." }, { status: 422 });
  try {
    if (!(await verified(user.id))) return NextResponse.json({ error: "Business verification is required to manage connections." }, { status: 403 });
    const db = getDb();
    const [connection] = await db.update(loomConnections).set({ status: parsed.data.action === "accept" ? "accepted" : "declined", updatedAt: new Date() })
      .where(and(eq(loomConnections.id, parsed.data.connectionId), eq(loomConnections.recipientUserId, user.id), eq(loomConnections.status, "pending"))).returning();
    if (!connection) return NextResponse.json({ error: "Pending connection request not found." }, { status: 404 });
    try { await db.insert(loomNotifications).values({ userId: connection.requesterUserId, actorUserId: user.id, kind: "connection_updated", targetId: connection.id, body: (user.displayName || "A Loom member") + " updated your connection request." }); } catch { /* Keep the connection decision successful if notification delivery fails. */ }
    return NextResponse.json({ connection });
  } catch {
    return NextResponse.json({ error: "Connection request could not be updated." }, { status: 503 });
  }
}
