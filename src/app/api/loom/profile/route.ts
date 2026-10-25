import { eq } from "drizzle-orm";
import { getLoomRestriction } from "@/lib/loom/staff";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { loomBusinessVerifications, loomProfiles } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const profileSchema = z.object({
  businessName: z.string().trim().max(120).default(""),
  bio: z.string().trim().max(500).default(""),
  website: z.union([z.literal(""), z.string().url().max(300)]).default(""),
}).strict();

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in to view your profile." }, { status: 401 });
  try {
    const restriction = await getLoomRestriction(user.id);
    if (restriction?.status === "banned") return NextResponse.json({ error: "Loom access is unavailable for this account." }, { status: 403 });
    const db = getDb();
    const [profile] = await db.select({
      businessName: loomProfiles.businessName,
      bio: loomProfiles.bio,
      website: loomProfiles.website,
      avatarUrl: loomProfiles.avatarUrl,
      updatedAt: loomProfiles.updatedAt,
    }).from(loomProfiles).where(eq(loomProfiles.userId, user.id)).limit(1);
    return NextResponse.json({ profile: profile ?? { businessName: "", bio: "", website: "", avatarUrl: null, updatedAt: null } }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Profile is temporarily unavailable." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in to edit your profile." }, { status: 401 });
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "Submit valid profile details." }, { status: 400 }); }
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Profile details are invalid." }, { status: 422 });
  try {
    const db = getDb();
    const [verification] = await db.select({ status: loomBusinessVerifications.status }).from(loomBusinessVerifications).where(eq(loomBusinessVerifications.userId, user.id)).limit(1);
    if (verification?.status !== "verified") return NextResponse.json({ error: "Business verification is required to edit a public Loom profile." }, { status: 403 });
    const values = { userId: user.id, businessName: parsed.data.businessName, bio: parsed.data.bio, website: parsed.data.website || null, updatedAt: new Date() };
    const [profile] = await db.insert(loomProfiles).values(values).onConflictDoUpdate({
      target: loomProfiles.userId,
      set: { businessName: values.businessName, bio: values.bio, website: values.website, updatedAt: values.updatedAt },
    }).returning({ businessName: loomProfiles.businessName, bio: loomProfiles.bio, website: loomProfiles.website, updatedAt: loomProfiles.updatedAt });
    return NextResponse.json({ profile }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Profile could not be saved." }, { status: 503 });
  }
}
