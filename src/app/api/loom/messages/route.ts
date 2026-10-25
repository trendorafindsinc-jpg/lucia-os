import { and, asc, eq, isNull, or } from "drizzle-orm";
import { getLoomRestriction } from "@/lib/loom/staff";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { appUsers, loomBlocks, loomBusinessVerifications, loomConnections, loomMessages, loomNotifications } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const messageSchema = z.object({ recipientUserId: z.string().uuid(), body: z.string().trim().min(1).max(4000) }).strict();

async function hasAcceptedConnection(first: string, second: string) {
  const db = getDb();
  const [row] = await db.select({ id: loomConnections.id }).from(loomConnections).where(and(
    eq(loomConnections.status, "accepted"),
    or(and(eq(loomConnections.requesterUserId, first), eq(loomConnections.recipientUserId, second)), and(eq(loomConnections.requesterUserId, second), eq(loomConnections.recipientUserId, first))),
  )).limit(1);
  return Boolean(row);
}

async function isVerified(userId: string) {
  const db = getDb();
  const [row] = await db.select({ status: loomBusinessVerifications.status }).from(loomBusinessVerifications).where(eq(loomBusinessVerifications.userId, userId)).limit(1);
  return row?.status === "verified";
}

async function hasBlock(first: string, second: string) {
  const db = getDb();
  const [row] = await db.select({ id: loomBlocks.id }).from(loomBlocks).where(or(and(eq(loomBlocks.blockerUserId, first), eq(loomBlocks.blockedUserId, second)), and(eq(loomBlocks.blockerUserId, second), eq(loomBlocks.blockedUserId, first)))).limit(1);
  return Boolean(row);
}

export async function GET(request: Request) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in to access messages." }, { status: 401 });
  const restriction = await getLoomRestriction(user.id);
  if (restriction) return NextResponse.json({ error: "Your Loom participation is currently restricted." }, { status: 403 });
  const peer = new URL(request.url).searchParams.get("with");
  if (!z.string().uuid().safeParse(peer).success) return NextResponse.json({ error: "Choose a conversation." }, { status: 400 });
  try {
    if (!(await isVerified(user.id))) return NextResponse.json({ error: "Business verification is required to use private messages." }, { status: 403 });
    if (!(await isVerified(peer!))) return NextResponse.json({ error: "This member is not currently available for private messages." }, { status: 403 });
    const peerRestriction = await getLoomRestriction(peer!);
    if (peerRestriction) return NextResponse.json({ error: "This member is not currently available for private messages." }, { status: 403 });
    if (await hasBlock(user.id, peer!)) return NextResponse.json({ error: "Messaging is unavailable between these members." }, { status: 403 });
    if (!(await hasAcceptedConnection(user.id, peer!))) return NextResponse.json({ error: "An accepted connection is required before messaging." }, { status: 403 });
    const db = getDb();
    await db.update(loomMessages).set({ readAt: new Date() }).where(and(
      eq(loomMessages.senderUserId, peer!),
      eq(loomMessages.recipientUserId, user.id),
      isNull(loomMessages.readAt),
    ));
    const messages = await db.select({
      id: loomMessages.id,
      senderUserId: loomMessages.senderUserId,
      recipientUserId: loomMessages.recipientUserId,
      body: loomMessages.body,
      readAt: loomMessages.readAt,
      createdAt: loomMessages.createdAt,
    }).from(loomMessages).where(or(
      and(eq(loomMessages.senderUserId, user.id), eq(loomMessages.recipientUserId, peer!)),
      and(eq(loomMessages.senderUserId, peer!), eq(loomMessages.recipientUserId, user.id)),
    )).orderBy(asc(loomMessages.createdAt)).limit(200);
    return NextResponse.json({ messages }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Messages are temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in to send a message." }, { status: 401 });
  const restriction = await getLoomRestriction(user.id);
  if (restriction) return NextResponse.json({ error: "Your Loom participation is currently restricted." }, { status: 403 });
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "Submit a valid message." }, { status: 400 }); }
  const parsed = messageSchema.safeParse(raw);
  if (!parsed.success || parsed.data.recipientUserId === user.id) return NextResponse.json({ error: "Choose another member and write a message of 1–4,000 characters." }, { status: 422 });
  try {
    if (!(await isVerified(user.id))) return NextResponse.json({ error: "Business verification is required to send private messages." }, { status: 403 });
    if (!(await isVerified(parsed.data.recipientUserId))) return NextResponse.json({ error: "This member is not currently available for private messages." }, { status: 403 });
    const recipientRestriction = await getLoomRestriction(parsed.data.recipientUserId);
    if (recipientRestriction) return NextResponse.json({ error: "This member is not currently available for private messages." }, { status: 403 });
    if (await hasBlock(user.id, parsed.data.recipientUserId)) return NextResponse.json({ error: "Messaging is unavailable between these members." }, { status: 403 });
    if (!(await hasAcceptedConnection(user.id, parsed.data.recipientUserId))) return NextResponse.json({ error: "An accepted connection is required before messaging." }, { status: 403 });
    const db = getDb();
    const [recipient] = await db.select({ id: appUsers.id }).from(appUsers).where(and(eq(appUsers.id, parsed.data.recipientUserId), eq(appUsers.active, true))).limit(1);
    if (!recipient) return NextResponse.json({ error: "Member not found." }, { status: 404 });
    const [message] = await db.insert(loomMessages).values({ senderUserId: user.id, recipientUserId: recipient.id, body: parsed.data.body }).returning({
      id: loomMessages.id, senderUserId: loomMessages.senderUserId, recipientUserId: loomMessages.recipientUserId, body: loomMessages.body, readAt: loomMessages.readAt, createdAt: loomMessages.createdAt,
    });
    try { await db.insert(loomNotifications).values({ userId: recipient.id, actorUserId: user.id, kind: "private_message", targetId: message.id, body: (user.displayName || "A Loom member") + " sent you a private message." }); } catch { /* Keep message delivery independent of notification delivery. */ }
    return NextResponse.json({ message }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Message could not be saved." }, { status: 503 });
  }
}
