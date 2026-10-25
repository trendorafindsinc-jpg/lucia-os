import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { loomBusinessVerifications, loomGroups } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const groupSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  description: z.string().trim().max(1000).default(""),
}).strict();

export async function GET() {
  try {
    const db = getDb();
    const groups = await db.select({
      id: loomGroups.id,
      name: loomGroups.name,
      slug: loomGroups.slug,
      description: loomGroups.description,
      createdAt: loomGroups.createdAt,
    }).from(loomGroups).where(and(eq(loomGroups.status, "active"), eq(loomGroups.visibility, "public"))).orderBy(desc(loomGroups.createdAt)).limit(100);
    return NextResponse.json({ groups }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Groups are temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in to create a group." }, { status: 401 });
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "Submit valid group details." }, { status: 400 }); }
  const parsed = groupSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Group name, slug, or description is invalid." }, { status: 422 });
  try {
    const db = getDb();
    const [verification] = await db.select({ status: loomBusinessVerifications.status }).from(loomBusinessVerifications).where(eq(loomBusinessVerifications.userId, user.id)).limit(1);
    if (verification?.status !== "verified") return NextResponse.json({ error: "Business verification is required to create groups." }, { status: 403 });
    const [group] = await db.insert(loomGroups).values({ ...parsed.data, createdByUserId: user.id }).returning({
      id: loomGroups.id, name: loomGroups.name, slug: loomGroups.slug, description: loomGroups.description, createdAt: loomGroups.createdAt,
    });
    return NextResponse.json({ group }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Group could not be created. The slug may already be in use." }, { status: 409 });
  }
}
