import assert from "node:assert/strict";

/** Isolated subscription and entitlement lifecycle acceptance. */
export async function checkPhase6SubscriptionAcceptance({ api, admin, f, bpass }) {
  const route = "/api/organizations/" + f.orgA + "/entitlements";
  let subscriptionId = null;
  try {
    const catalogResponse = await api("a", route);
    const catalog = await catalogResponse.json();
    assert.equal(catalogResponse.status, 200, catalog.error);
    assert(catalog.plans.some((plan) => plan.plan_key === "starter_trial"));
    const denied = await api("b", route);
    assert([403, 404].includes(denied.status), "A different tenant must not read subscriptions");
    const started = await api("a", route, "POST", { planKey: "starter_trial", cadence: "monthly" });
    const created = await started.json();
    assert.equal(started.status, 201, created.error);
    subscriptionId = created.subscription.id;
    assert.equal(created.subscription.status, "trialing");
    assert(created.subscription.trial_ends_at);
    const duplicate = await api("a", route, "POST", { planKey: "starter_trial", cadence: "monthly" });
    assert.equal(duplicate.status, 409, "An organization must not start a second introductory trial");
    const currentResponse = await api("a", route);
    const current = await currentResponse.json();
    const blogging = current.entitlements.find((entry) => entry.entitlement_key === "blogging");
    const customDomains = current.entitlements.find((entry) => entry.entitlement_key === "custom_domains");
    assert(blogging?.effective, "The trial must provision its enabled blogging entitlement");
    assert.equal(customDomains?.effective, false, "The starter trial must not grant custom domains");
    assert(current.subscriptions.some((item) => item.id === subscriptionId && item.status === "trialing"));
    bpass("Persisted subscription trial: plan catalogue, tenant authorization, one-time trial guard and feature entitlement provisioning");
  } finally {
    if (subscriptionId) {
      await admin`DELETE FROM organization_entitlements WHERE organization_id=${f.orgA} AND subscription_id=${subscriptionId}`;
      await admin`DELETE FROM organization_subscriptions WHERE organization_id=${f.orgA} AND id=${subscriptionId}`;
    }
  }
}
