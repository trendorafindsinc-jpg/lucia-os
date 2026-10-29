import "server-only";

import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { loomActionLimits } from "@/lib/db/schema";

export async function consumeLoomRateLimit(userId: string, action: string, limit: number, windowMs: number) {
  const now = new Date();
  const windowFloor = new Date(now.getTime() - windowMs);
  // Raw sql fragments bypass Drizzle column encoders; postgres-js cannot bind Date objects there.
  const nowParam = now.toISOString();
  const windowFloorParam = windowFloor.toISOString();
  const limitKey = userId + ":" + action;
  const [record] = await getDb().insert(loomActionLimits).values({
    limitKey,
    windowStartedAt: now,
    requestCount: 1,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: loomActionLimits.limitKey,
    set: {
      windowStartedAt: sql`case when ${loomActionLimits.windowStartedAt} <= ${windowFloorParam} then ${nowParam} else ${loomActionLimits.windowStartedAt} end`,
      requestCount: sql`case when ${loomActionLimits.windowStartedAt} <= ${windowFloorParam} then 1 else ${loomActionLimits.requestCount} + 1 end`,
      updatedAt: now,
    },
  }).returning({ windowStartedAt: loomActionLimits.windowStartedAt, requestCount: loomActionLimits.requestCount });

  if (!record || record.requestCount <= limit) return { allowed: true as const, retryAfterSeconds: 0 };
  const retryAfterSeconds = Math.max(1, Math.ceil((record.windowStartedAt.getTime() + windowMs - now.getTime()) / 1000));
  return { allowed: false as const, retryAfterSeconds };
}
