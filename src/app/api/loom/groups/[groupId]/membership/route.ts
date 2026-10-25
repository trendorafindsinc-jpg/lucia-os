import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { getLoomRestriction } from "@/lib/loom/staff";
import { loomBusinessVerifications, loomGroupMemberships, loomGroups } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ groupId: string }> };

async function resolve(request: Request, routeContext: Context) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return { response: NextResponse.json({ error: "Invalid origin." }, { status: 403 }) };
  const user = await getCurrentUser().catch(() => null);
  if (!user) return { response: NextResponse.json({ error: "Sign in to manage group membership." }, { status: 401 }) };
  const { groupId } = await routeContext.params;
  if (!z.string().uuid().safeParse(groupId).success) return { response: NextResponse.json({ error: "Invalid group." }, { status: 400 }) };
  return { user, groupId };
}

export async function POST(request: Request, routeContext: Context) {
  const state = await resolve(request, routeContext);
  if ("response" in state) return state.response;
  const { user, groupId } = state;
  const restriction = await getLoomRestriction(user.id);
  if (restriction) return NextResponse.json({ error: "Your Loom participation is currently restricted." }, { status: 403 });
  try {
    const db = getDb();
    const [verification] = await db.select({ status: loomBusinessVerifications.status }).from(loomBusinessVerifications).where(eq(loomBusinessVerifications.userId, user.id)).limit(1);
    if (verification?.status !== "verified") return NextResponse.json({ error: "Business verification is required to join groups." }, { status: 403 });
    const [group] = await db.select({ id: loomGroups.id }).from(loomGroups).where(and(eq(loomGroups.id, groupId), eq(loomGroups.status, "active"), eq(loomGroups.visibility, "public"))).limit(1);
    if (!group) return NextResponse.json({ error: "Public group not found." }, { status: 404 });
    const [membership] = await db.insert(loomGroupMemberships).values({ groupId, userId: user.id, role: "member", status: "active" }).onConflictDoNothing().returning({ id: loomGroupMemberships.id });
    if (!membership) return NextResponse.json({ error: "You already belong to this group." }, { status: 409 });
    return NextResponse.json({ membership }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Group membership could not be created." }, { status: 503 });
  }
}

export async function DELETE(request: Request, routeContext: Context) {
  const state = await resolve(request, routeContext);
  if ("response" in state) return state.response;
  const { user, groupId } = state;
  try {
    const db = getDb();
    const [membership] = await db.select({ id: loomGroupMemberships.id, role: loomGroupMemberships.role }).from(loomGroupMemberships)
      .where(and(eq(loomGroupMemberships.groupId, groupId), eq(loomGroupMemberships.userId, user.id), eq(loomGroupMemberships.status, "active"))).limit(1);
    if (!membership) return NextResponse.json({ error: "Active group membership not found." }, { status: 404 });
    if (membership.role === "owner") return NextResponse.json({ error: "Group owners must transfer ownership before leaving." }, { status: 409 });
    await db.delete(loomGroupMemberships).where(eq(loomGroupMemberships.id, membership.id));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Group membership could not be updated." }, { status: 503 });
  }
}
