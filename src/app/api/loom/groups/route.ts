import { and, desc, eq, inArray } from "drizzle-orm";
import { consumeLoomRateLimit } from "@/lib/loom/rate-limit";
import { getLoomRestriction } from "@/lib/loom/staff";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { loomBusinessVerifications, loomGroupMemberships, loomGroups } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const groupSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  description: z.string().trim().max(1000).default(""),
}).strict();

export async function GET() {
  try {
    const currentUser = await getCurrentUser().catch(() => null);
    if (currentUser && (await getLoomRestriction(currentUser.id))?.status === "banned") return NextResponse.json({ error: "Loom access is unavailable for this account." }, { status: 403 });
    const db = getDb();
    const user = await getCurrentUser().catch(() => null);
    const groups = await db.select({
      id: loomGroups.id,
      name: loomGroups.name,
      slug: loomGroups.slug,
      description: loomGroups.description,
      createdAt: loomGroups.createdAt,
    }).from(loomGroups).where(and(eq(loomGroups.status, "active"), eq(loomGroups.visibility, "public"))).orderBy(desc(loomGroups.createdAt)).limit(100);
    const memberships = user && groups.length ? await db.select({ groupId: loomGroupMemberships.groupId, role: loomGroupMemberships.role })
      .from(loomGroupMemberships).where(and(eq(loomGroupMemberships.userId, user.id), eq(loomGroupMemberships.status, "active"), inArray(loomGroupMemberships.groupId, groups.map(group => group.id)))) : [];
    const membershipMap = new Map(memberships.map(item => [item.groupId, item.role]));
    return NextResponse.json({ groups: groups.map(group => ({ ...group, isMember: membershipMap.has(group.id), memberRole: membershipMap.get(group.id) || null })) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Groups are temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in to create a group." }, { status: 401 });
  const restriction = await getLoomRestriction(user.id);
  if (restriction) return NextResponse.json({ error: "Your Loom participation is currently restricted." }, { status: 403 });
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "Submit valid group details." }, { status: 400 }); }
  const parsed = groupSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Group name, slug, or description is invalid." }, { status: 422 });
  try {
    const db = getDb();
    const rate = await consumeLoomRateLimit(user.id, "group_create", 3, 86400000);
    if (!rate.allowed) return NextResponse.json({ error: "Too many requests. Try again tomorrow." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });
    const [verification] = await db.select({ status: loomBusinessVerifications.status }).from(loomBusinessVerifications).where(eq(loomBusinessVerifications.userId, user.id)).limit(1);
    if (verification?.status !== "verified") return NextResponse.json({ error: "Business verification is required to create groups." }, { status: 403 });
    const group = await db.transaction(async tx => {
      const [created] = await tx.insert(loomGroups).values({ ...parsed.data, createdByUserId: user.id }).returning({
        id: loomGroups.id, name: loomGroups.name, slug: loomGroups.slug, description: loomGroups.description, createdAt: loomGroups.createdAt,
      });
      await tx.insert(loomGroupMemberships).values({ groupId: created.id, userId: user.id, role: "owner", status: "active" });
      return created;
    });
    return NextResponse.json({ group }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    if (typeof cause === "object" && cause !== null && "code" in cause && cause.code === "23505") {
      return NextResponse.json({ error: "That group address is already in use." }, { status: 409 });
    }
    return NextResponse.json({ error: "Group storage is temporarily unavailable." }, { status: 503 });
  }
}
