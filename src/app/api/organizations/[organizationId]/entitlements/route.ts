import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentOrganizationAccess } from "@/lib/access/guards";
import { getDb } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ organizationId: string }> };

export async function GET(_request: Request, context: Context) {
  const { organizationId } = await context.params;
  const access = await getCurrentOrganizationAccess(organizationId, "website.read");
  if (!access) return NextResponse.json({ error: "Organisation access denied." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  const result = await getDb().transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_organization_id', ${access.membership.organizationId}, true)`);
    const subscriptions = await tx.execute(sql`select s.id,s.status,s.cadence,s.starts_at,s.current_period_ends_at,s.trial_ends_at,s.cancel_at_period_end,p.plan_key,p.name as plan_name
      from organization_subscriptions s join subscription_plans p on p.id=s.plan_id
      where s.organization_id=${access.membership.organizationId}::uuid
      order by s.created_at desc limit 20`);
    const entitlements = await tx.execute(sql`select e.entitlement_key,e.value,e.status,e.effective_at,e.expires_at,
      (e.status='active' and e.effective_at<=now() and (e.expires_at is null or e.expires_at>now())
       and e.value->>'enabled'='true'
       and (e.subscription_id is null or exists (
         select 1 from organization_subscriptions s where s.id=e.subscription_id
          and s.organization_id=e.organization_id and s.status in ('active','trialing')
          and (s.current_period_ends_at is null or s.current_period_ends_at>now())
          and (s.trial_ends_at is null or s.trial_ends_at>now())
       ))) as effective
      from organization_entitlements e where e.organization_id=${access.membership.organizationId}::uuid
      order by e.entitlement_key limit 200`);
    return { subscriptions, entitlements };
  });
  return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
}
