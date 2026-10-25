import { and, asc, eq, ilike, or, ne } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { appUsers, loomBusinessVerifications, loomProfiles } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in to discover verified members." }, { status: 401 });
  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 100);
  try {
    const db = getDb();
    const base = db.select({
      userId: appUsers.id,
      displayName: appUsers.displayName,
      businessName: loomProfiles.businessName,
      bio: loomProfiles.bio,
      website: loomProfiles.website,
    }).from(appUsers)
      .innerJoin(loomBusinessVerifications, eq(loomBusinessVerifications.userId, appUsers.id))
      .leftJoin(loomProfiles, eq(loomProfiles.userId, appUsers.id));
    const filters = and(eq(appUsers.active, true), eq(loomBusinessVerifications.status, "verified"), ne(appUsers.id, user.id));
    const members = query
      ? await base.where(and(filters, or(ilike(loomProfiles.businessName, `%${query}%`), ilike(loomProfiles.bio, `%${query}%`), ilike(appUsers.displayName, `%${query}%`)))).orderBy(asc(loomProfiles.businessName)).limit(100)
      : await base.where(filters).orderBy(asc(loomProfiles.businessName)).limit(100);
    return NextResponse.json({ members }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Member discovery is temporarily unavailable." }, { status: 503 });
  }
}
