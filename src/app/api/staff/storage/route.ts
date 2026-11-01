import { getCurrentStaffUser } from "@/lib/access/guards";
import { withPlatformStaffScope } from "@/lib/db/tenant-scope";
import { sql } from "drizzle-orm";
import { websiteMutationAllowed } from "@/lib/websites/draft-revision";
import { platformAuditEvents } from "@/lib/db/schema";
import { boundedQuota } from "@/lib/media/service";
import { z } from "zod";
export const dynamic = "force-dynamic";
async function readStorage() {
  const user = await getCurrentStaffUser("storage.manage");
  if (!user) return Response.json({ error: "Access denied." }, { status: 403 });
  const [usage] = await withPlatformStaffScope(user.id, (tx) => tx.execute(sql`select reserved_bytes from media_storage_budget where product='lucia-os'`));
  const used = Number(usage?.reserved_bytes ?? 0), budget = boundedQuota(process.env.MEDIA_PRODUCT_BUDGET_BYTES, 2_000_000_000);
  return Response.json({ product: "lucia-os", reservedBytes: used, budgetBytes: budget, warning: used >= budget * .8, accountPlanningBudgetBytes: 10_000_000_000, scope: "LUCIA OS bucket reservations only. Other product buckets and provider billing require the shared account inventory; storage is distinct from monthly bandwidth." }, { headers: { "Cache-Control": "no-store" } });
}
async function updateQuota(request: Request) {
  if (!websiteMutationAllowed(request)) return Response.json({ error: "Origin denied." }, { status: 403 });
  const user = await getCurrentStaffUser("storage.manage");
  if (!user) return Response.json({ error: "Access denied." }, { status: 403 });
  const input = z.object({ websiteId: z.uuid(), quotaBytes: z.number().int().min(260000).max(100000000) }).strict().safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: "Choose a website and quota between 260 KB and 100 MB." }, { status: 422 });
  await withPlatformStaffScope(user.id, async (tx) => {
    await tx.execute(sql`insert into website_media_limits(website_id,quota_bytes) values(${input.data.websiteId},${input.data.quotaBytes}) on conflict(website_id) do update set quota_bytes=excluded.quota_bytes`);
    await tx.insert(platformAuditEvents).values({ actorUserId: user.id, actorKind: "staff", action: "media.quota.updated", targetType: "website", targetId: input.data.websiteId, result: "success", metadata: JSON.stringify({ quotaBytes: input.data.quotaBytes }) });
  });
  return Response.json({ saved: true });
}

export async function GET() { try { return await readStorage(); } catch { return Response.json({ error: "Storage monitoring is temporarily unavailable." }, { status: 503 }); } }
export async function PATCH(request: Request) { try { return await updateQuota(request); } catch { return Response.json({ error: "Quota was not saved. Verify the website exists and retry." }, { status: 503 }); } }
