import { sql } from "drizzle-orm";
import { z } from "zod";
import { NextResponse } from "next/server";
import { getCurrentOrganizationAccess } from "@/lib/access/guards";
import { getDb } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ organizationId: string }> };

export async function GET(_request: Request, context: Context) {
  const { organizationId } = await context.params;
  const access = await getCurrentOrganizationAccess(organizationId, "billing.read");
  if (!access) return NextResponse.json({ error: "Organisation access denied." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  const result = await getDb().transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_organization_id', ${access.membership.organizationId}, true)`);
    const plans = await tx.execute(sql`select p.plan_key,p.name,p.product_key,
      coalesce(jsonb_agg(jsonb_build_object('key',pe.entitlement_key,'value',pe.value)) filter(where pe.id is not null),'[]'::jsonb) as entitlements
      from subscription_plans p left join subscription_plan_entitlements pe on pe.plan_id=p.id
      where p.active=true and p.product_key='lucia_os' group by p.id order by p.name limit 50`);
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
    return { plans, subscriptions, entitlements };
  });
  return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request, context: Context) {
  const { organizationId } = await context.params;
  const access = await getCurrentOrganizationAccess(organizationId, "billing.manage");
  if (!access) return NextResponse.json({ error: "Billing management permission required." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  const raw = await request.text();
  if (raw.length > 2048) return NextResponse.json({ error: "Request too large." }, { status: 413 });
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid trial request." }, { status: 400 }); }
  const parsed = z.object({ planKey: z.string().regex(/^[a-z0-9_-]{1,60}$/), cadence: z.enum(["weekly", "monthly", "annual"]).default("monthly") }).strict().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid plan and billing cadence." }, { status: 422 });
  const result = await getDb().transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_organization_id', ${access.membership.organizationId}, true)`);
    const [organization] = await tx.execute(sql`select id from organizations where id=${access.membership.organizationId}::uuid and status='active' for update`);
    if (!organization) return { kind: "missing" as const };
    const [previousTrial] = await tx.execute(sql`select id from organization_subscriptions where organization_id=${access.membership.organizationId}::uuid and trial_ends_at is not null limit 1`);
    if (previousTrial) return { kind: "trial_used" as const };
    const [existing] = await tx.execute(sql`select id from organization_subscriptions where organization_id=${access.membership.organizationId}::uuid and status in ('active','trialing') and (current_period_ends_at is null or current_period_ends_at>now()) limit 1`);
    if (existing) return { kind: "exists" as const };
    const [plan] = await tx.execute(sql`select id,plan_key,name from subscription_plans where product_key='lucia_os' and plan_key=${parsed.data.planKey} and active=true limit 1`);
    if (!plan) return { kind: "plan_missing" as const };
    const [subscription] = await tx.execute(sql`insert into organization_subscriptions(organization_id,plan_id,status,cadence,starts_at,current_period_ends_at,trial_ends_at) values(${access.membership.organizationId}::uuid,${plan.id}::uuid,'trialing',${parsed.data.cadence},now(),now()+interval '14 days',now()+interval '14 days') returning id,status,cadence,starts_at,current_period_ends_at,trial_ends_at`);
    await tx.execute(sql`insert into organization_entitlements(organization_id,subscription_id,entitlement_key,value,status,effective_at,expires_at) select ${access.membership.organizationId}::uuid,${subscription.id}::uuid,entitlement_key,value,'active',now(),now()+interval '14 days' from subscription_plan_entitlements where plan_id=${plan.id}::uuid on conflict do nothing`);
    return { kind: "created" as const, plan, subscription };
  });
  if (result.kind === "missing") return NextResponse.json({ error: "Organisation not found." }, { status: 404 });
  if (result.kind === "trial_used") return NextResponse.json({ error: "This organisation has already used its introductory trial." }, { status: 409 });
  if (result.kind === "exists") return NextResponse.json({ error: "An active subscription already exists." }, { status: 409 });
  if (result.kind === "plan_missing") return NextResponse.json({ error: "That plan is not available." }, { status: 404 });
  return NextResponse.json({ subscription: result.subscription, plan: result.plan }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
}