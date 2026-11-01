import "server-only";

import { createHash } from "node:crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db/client";
import { appUsers, sessions } from "@/lib/db/schema";

export async function getCurrentUser() {
  const token = (await cookies()).get("lucia_os_session")?.value;
  if (!token || token.length < 40) return null;

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const db = getDb();
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_session_token_hash', ${tokenHash}, true)`);
    const [user] = await tx
      .select({ id: appUsers.id, displayName: appUsers.displayName })
      .from(sessions)
      .innerJoin(appUsers, eq(sessions.userId, appUsers.id))
      .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date()), eq(appUsers.active, true)))
      .limit(1);
    return user ?? null;
  });
}
