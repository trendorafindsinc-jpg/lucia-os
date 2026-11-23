import { sql } from "drizzle-orm";

/** Resolve persisted entitlements inside an organization-scoped transaction.
 * Subscription-linked grants require a live trial/period; manual grants are
 * permitted for verified one-time purchases and platform-issued exceptions.
 */
export async function hasOrganizationEntitlement(
  tx: { execute: (query: ReturnType<typeof sql>) => Promise<unknown> },
  organizationId: string,
  entitlementKey: string,
): Promise<boolean> {
  const rows = await tx.execute(sql`select exists (
    select 1
    from organization_entitlements e
    left join organization_subscriptions s
      on s.id=e.subscription_id and s.organization_id=e.organization_id
    where e.organization_id=${organizationId}::uuid
      and e.entitlement_key=${entitlementKey}
      and e.status='active'
      and e.effective_at <= now()
      and (e.expires_at is null or e.expires_at > now())
      and e.value->>'enabled' = 'true'
      and (
        e.subscription_id is null
        or (
          s.status in ('active','trialing')
          and (s.current_period_ends_at is null or s.current_period_ends_at > now())
          and (s.trial_ends_at is null or s.trial_ends_at > now())
        )
      )
  ) as allowed`);
  const row = (rows as Array<{allowed?:boolean}>)[0];
  return row?.allowed === true;
}
