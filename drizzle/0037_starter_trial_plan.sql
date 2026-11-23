-- Seed one non-priced evaluation plan so the trial workflow is usable.
-- Commercial prices and paid tiers remain intentionally unconfigured until approved.
INSERT INTO subscription_plans(product_key,plan_key,name,active)
VALUES('lucia_os','starter_trial','LUCIA OS Starter Trial',true)
ON CONFLICT(product_key,plan_key) DO NOTHING;
--> statement-breakpoint
INSERT INTO subscription_plan_entitlements(plan_id,entitlement_key,value)
SELECT p.id,v.entitlement_key,v.value::jsonb
FROM subscription_plans p
CROSS JOIN (VALUES
 ('blogging','{"enabled":true}'),
 ('custom_domains','{"enabled":false}'),
 ('commerce','{"enabled":false}')
) AS v(entitlement_key,value)
WHERE p.product_key='lucia_os' AND p.plan_key='starter_trial'
ON CONFLICT(plan_id,entitlement_key) DO NOTHING;
