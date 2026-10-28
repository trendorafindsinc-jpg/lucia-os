import { createHash } from "node:crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { appUsers, sessions } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const token = (await cookies()).get("lucia_os_session")?.value;
  if (!token) {
    return NextResponse.json({ user: null }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const db = getDb();
  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_session_token_hash', ${tokenHash}, true)`);
    const [user] = await tx
      .select({ id: appUsers.id, displayName: appUsers.displayName, coreSubjectId: appUsers.coreSubjectId })
      .from(sessions)
      .innerJoin(appUsers, eq(sessions.userId, appUsers.id))
      .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date()), eq(appUsers.active, true)))
      .limit(1);
    return user ?? null;
  });

  if (!result) {
    return NextResponse.json({ user: null }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json(
    { user: { id: result.id, displayName: result.displayName } },
    { headers: { "Cache-Control": "no-store" } },
  );
}
