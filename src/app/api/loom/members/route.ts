import { and, asc, eq, ilike, isNull, notInArray, or, ne } from "drizzle-orm";
import { getLoomRestriction } from "@/lib/loom/staff";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { loomPublicAuthors, loomBlocks, loomBusinessVerifications, loomProfiles } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in to discover verified members." }, { status: 401 });
  const restriction = await getLoomRestriction(user.id);
  if (restriction?.status === "banned") return NextResponse.json({ error: "Loom access is unavailable for this account." }, { status: 403 });
  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 100);
  try {
    const db = getDb();
    const base = db.select({
      userId: loomPublicAuthors.id,
      displayName: loomPublicAuthors.displayName,
      businessName: loomProfiles.businessName,
      bio: loomProfiles.bio,
      website: loomProfiles.website,
    }).from(loomPublicAuthors)
      .innerJoin(loomBusinessVerifications, eq(loomBusinessVerifications.userId, loomPublicAuthors.id))
      .leftJoin(loomProfiles, eq(loomProfiles.userId, loomPublicAuthors.id));
    const filters = and(
      eq(loomPublicAuthors.active, true),
      eq(loomBusinessVerifications.status, "verified"),
      ne(loomPublicAuthors.id, user.id),
      or(isNull(loomProfiles.id), eq(loomProfiles.moderationStatus, "visible")),
      notInArray(loomPublicAuthors.id, db.select({ userId: loomBlocks.blockedUserId }).from(loomBlocks).where(eq(loomBlocks.blockerUserId, user.id))),
      notInArray(loomPublicAuthors.id, db.select({ userId: loomBlocks.blockerUserId }).from(loomBlocks).where(eq(loomBlocks.blockedUserId, user.id))),
    );
    const members = query
      ? await base.where(and(filters, or(ilike(loomProfiles.businessName, `%${query}%`), ilike(loomProfiles.bio, `%${query}%`), ilike(loomPublicAuthors.displayName, `%${query}%`)))).orderBy(asc(loomProfiles.businessName)).limit(100)
      : await base.where(filters).orderBy(asc(loomProfiles.businessName)).limit(100);
    return NextResponse.json({ members }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Member discovery is temporarily unavailable." }, { status: 503 });
  }
}
