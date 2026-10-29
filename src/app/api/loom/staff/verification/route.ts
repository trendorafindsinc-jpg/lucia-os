import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { loomPublicAuthors, loomBusinessVerifications, loomNotifications, platformAuditEvents } from "@/lib/db/schema";
import { requireLoomStaff } from "@/lib/loom/staff";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const reviewSchema = z.object({
  verificationId: z.string().uuid(),
  decision: z.enum(["verified", "rejected"]),
  reviewNote: z.string().trim().max(1000).default(""),
}).strict();

export async function GET() {
  const access = await requireLoomStaff("loom.verify_business").catch(() => ({ user: null, denied: "forbidden" as const }));
  if (access.denied === "unauthenticated") return NextResponse.json({ error: "Sign in to access staff review." }, { status: 401 });
  if (access.denied || !access.user) return NextResponse.json({ error: "Authorised Loom verification staff only." }, { status: 403 });
  try {
    const db = getDb();
    const requests = await db.select({
      id: loomBusinessVerifications.id,
      userId: loomBusinessVerifications.userId,
      displayName: loomPublicAuthors.displayName,
      evidenceType: loomBusinessVerifications.evidenceType,
      evidenceReference: loomBusinessVerifications.evidenceReference,
      status: loomBusinessVerifications.status,
      reviewNote: loomBusinessVerifications.reviewNote,
      submittedAt: loomBusinessVerifications.submittedAt,
    }).from(loomBusinessVerifications).innerJoin(loomPublicAuthors, eq(loomBusinessVerifications.userId, loomPublicAuthors.id))
      .where(eq(loomBusinessVerifications.status, "pending"))
      .orderBy(asc(loomBusinessVerifications.submittedAt)).limit(100);
    return NextResponse.json({ requests }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Verification queue is temporarily unavailable." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const access = await requireLoomStaff("loom.verify_business").catch(() => ({ user: null, denied: "forbidden" as const }));
  if (access.denied === "unauthenticated") return NextResponse.json({ error: "Sign in to review verification." }, { status: 401 });
  if (access.denied || !access.user) return NextResponse.json({ error: "Authorised Loom verification staff only." }, { status: 403 });
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "Submit a valid review decision." }, { status: 400 }); }
  const parsed = reviewSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid request and decision." }, { status: 422 });
  try {
    const db = getDb();
    const now = new Date();
    const result = await db.transaction(async tx => {
      const [existing] = await tx.select({
        id: loomBusinessVerifications.id,
        userId: loomBusinessVerifications.userId,
        status: loomBusinessVerifications.status,
      }).from(loomBusinessVerifications).where(eq(loomBusinessVerifications.id, parsed.data.verificationId)).limit(1);
      if (!existing) return { kind: "not_found" as const };
      if (existing.status !== "pending") return { kind: "already_reviewed" as const };
      const [updated] = await tx.update(loomBusinessVerifications).set({
        status: parsed.data.decision,
        reviewNote: parsed.data.reviewNote || null,
        reviewedByUserId: access.user!.id,
        reviewedAt: now,
        updatedAt: now,
      }).where(and(eq(loomBusinessVerifications.id, existing.id), eq(loomBusinessVerifications.status, "pending"))).returning({ id: loomBusinessVerifications.id });
      if (!updated) return { kind: "already_reviewed" as const };
      await tx.insert(loomNotifications).values({
        userId: existing.userId,
        actorUserId: access.user!.id,
        kind: "business_verification_" + parsed.data.decision,
        targetId: existing.id,
        body: parsed.data.decision === "verified"
          ? "Your business verification was approved. You can now participate in Loom."
          : "Your business verification needs attention. Review the staff note and submit updated evidence.",
      });
      await tx.insert(platformAuditEvents).values({
        actorUserId: access.user!.id,
        actorKind: "platform_staff",
        action: "loom.business_verification." + parsed.data.decision,
        targetType: "loom_business_verification",
        targetId: existing.id,
        purpose: "Review business identity evidence for Loom participation.",
        result: "success",
        metadata: JSON.stringify({ subjectUserId: existing.userId, reviewNote: parsed.data.reviewNote || null }),
      });
      return { kind: "updated" as const, id: existing.id, status: parsed.data.decision };
    });
    if (result.kind === "not_found") return NextResponse.json({ error: "Verification request not found." }, { status: 404 });
    if (result.kind === "already_reviewed") return NextResponse.json({ error: "This request has already been reviewed. Refresh the queue." }, { status: 409 });
    return NextResponse.json({ verification: result }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Review could not be saved." }, { status: 503 });
  }
}
