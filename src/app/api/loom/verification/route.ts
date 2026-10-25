import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { loomBusinessVerifications } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const requestSchema = z.object({
  evidenceType: z.enum(["registration", "domain"]),
  evidenceReference: z.string().trim().min(3).max(500),
}).strict();

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in with LUCIA ID to view verification status." }, { status: 401 });
  try {
    const db = getDb();
    const [verification] = await db.select({
      evidenceType: loomBusinessVerifications.evidenceType,
      status: loomBusinessVerifications.status,
      reviewNote: loomBusinessVerifications.reviewNote,
      submittedAt: loomBusinessVerifications.submittedAt,
      reviewedAt: loomBusinessVerifications.reviewedAt,
    }).from(loomBusinessVerifications).where(eq(loomBusinessVerifications.userId, user.id)).limit(1);
    return NextResponse.json({ verification: verification ?? null }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Verification status is temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in with LUCIA ID to request business verification." }, { status: 401 });
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "Submit valid verification evidence." }, { status: 400 }); }
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Choose registration or domain evidence and provide a valid reference." }, { status: 422 });
  try {
    const db = getDb();
    const [existing] = await db.select({ id: loomBusinessVerifications.id, status: loomBusinessVerifications.status }).from(loomBusinessVerifications).where(eq(loomBusinessVerifications.userId, user.id)).limit(1);
    if (existing?.status === "verified") return NextResponse.json({ error: "Your business is already verified. Contact authorised support if your details need to change." }, { status: 409 });
    const values = {
      userId: user.id,
      evidenceType: parsed.data.evidenceType,
      evidenceReference: parsed.data.evidenceReference,
      status: "pending",
      reviewNote: null,
      reviewedByUserId: null,
      reviewedAt: null,
      updatedAt: new Date(),
    };
    await db.insert(loomBusinessVerifications).values(values).onConflictDoUpdate({
      target: loomBusinessVerifications.userId,
      set: values,
    });
    return NextResponse.json({ status: "pending", message: "Your request has been submitted for authorised review." }, { status: 202, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Your request could not be saved. Please try again later." }, { status: 503 });
  }
}
