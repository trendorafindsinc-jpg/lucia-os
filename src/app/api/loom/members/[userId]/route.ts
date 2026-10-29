import { and, eq, isNull, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { getLoomRestriction } from "@/lib/loom/staff";
import { appUsers, loomBlocks, loomBusinessVerifications, loomProfiles } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ userId: string }> };

export async function GET(request: Request, context: Context) {
  const { userId } = await context.params;
  if (!z.string().uuid().safeParse(userId).success) return NextResponse.json({ error: "Invalid member." }, { status: 400 });
  const viewer = await getCurrentUser().catch(() => null);
  try {
    if (viewer && (await getLoomRestriction(viewer.id))?.status === "banned") return NextResponse.json({ error: "Loom access is unavailable for this account." }, { status: 403 });
    const db = getDb();
    if (viewer && viewer.id !== userId) {
      const [block] = await db.select({ id: loomBlocks.id }).from(loomBlocks).where(or(
        and(eq(loomBlocks.blockerUserId, viewer.id), eq(loomBlocks.blockedUserId, userId)),
        and(eq(loomBlocks.blockerUserId, userId), eq(loomBlocks.blockedUserId, viewer.id)),
      )).limit(1);
      if (block) return NextResponse.json({ error: "This profile is unavailable." }, { status: 404 });
    }
    const [profile] = await db.select({
      userId: appUsers.id,
      displayName: appUsers.displayName,
      businessName: loomProfiles.businessName,
      bio: loomProfiles.bio,
      website: loomProfiles.website,
      createdAt: loomProfiles.createdAt,
    }).from(appUsers)
      .innerJoin(loomBusinessVerifications, eq(loomBusinessVerifications.userId, appUsers.id))
      .leftJoin(loomProfiles, eq(loomProfiles.userId, appUsers.id))
      .where(and(
        eq(appUsers.id, userId),
        eq(appUsers.active, true),
        eq(loomBusinessVerifications.status, "verified"),
        or(isNull(loomProfiles.id), eq(loomProfiles.moderationStatus, "visible")),
      )).limit(1);
    if (!profile) return NextResponse.json({ error: "Verified public profile not found." }, { status: 404 });
    return NextResponse.json({ profile, isSelf: viewer?.id === profile.userId }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Public profile is temporarily unavailable." }, { status: 503 });
  }
}
