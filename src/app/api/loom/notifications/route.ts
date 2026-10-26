import { and, desc, eq, isNull } from "drizzle-orm";
import { getLoomRestriction } from "@/lib/loom/staff";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { loomNotifications } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const readSchema = z.object({ id: z.string().uuid().optional(), markAllRead: z.boolean().optional() }).strict();

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in to view notifications." }, { status: 401 });
  try {
    const restriction = await getLoomRestriction(user.id);
    if (restriction?.status === "banned") return NextResponse.json({ error: "Loom access is unavailable for this account." }, { status: 403 });
    const db = getDb();
    const notifications = await db.select({
      id: loomNotifications.id,
      actorUserId: loomNotifications.actorUserId,
      kind: loomNotifications.kind,
      targetId: loomNotifications.targetId,
      body: loomNotifications.body,
      readAt: loomNotifications.readAt,
      createdAt: loomNotifications.createdAt,
    }).from(loomNotifications).where(eq(loomNotifications.userId, user.id)).orderBy(desc(loomNotifications.createdAt)).limit(100);
    return NextResponse.json({ notifications, unreadCount: notifications.filter(item => !item.readAt).length }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Notifications are temporarily unavailable." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in to update notifications." }, { status: 401 });
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "Submit a valid notification action." }, { status: 400 }); }
  const parsed = readSchema.safeParse(raw);
  if (!parsed.success || (!parsed.data.id && !parsed.data.markAllRead)) return NextResponse.json({ error: "Choose a notification to mark read." }, { status: 422 });
  try {
    const db = getDb();
    const now = new Date();
    if (parsed.data.markAllRead) {
      await db.update(loomNotifications).set({ readAt: now }).where(and(eq(loomNotifications.userId, user.id), isNull(loomNotifications.readAt)));
    } else if (parsed.data.id) {
      await db.update(loomNotifications).set({ readAt: now }).where(and(eq(loomNotifications.id, parsed.data.id), eq(loomNotifications.userId, user.id)));
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Notification status could not be updated." }, { status: 503 });
  }
}
