import "server-only";

import { z } from "zod";
import {
  checkCoreEntitlement,
  checkCorePermission,
  CoreConsumerError,
} from "@/lib/core/consumer-client";

const authorizationDecision = z.object({ allowed: z.boolean() }).strict();
const entitlementDecision = z.object({ active: z.boolean() }).strict();

/**
 * A tenant ID is only a locator, never proof of access. This helper delegates
 * the decision to Core and rejects malformed/ambiguous responses.
 */
export async function requireCorePermission(
  assertion: string,
  tenantId: string,
  permission: string,
): Promise<void> {
  const payload = await checkCorePermission(assertion, tenantId, permission);
  const parsed = authorizationDecision.safeParse(payload);
  if (!parsed.success) {
    throw new CoreConsumerError(
      "LUCIA Core returned an invalid authorization decision.",
      502,
      "CORE_AUTHORIZATION_INVALID",
    );
  }
  if (!parsed.data.allowed) {
    throw new CoreConsumerError("You do not have permission to perform this action.", 403, "PERMISSION_DENIED");
  }
}

/** Premium capabilities require an explicit active entitlement from Core. */
export async function requireCoreEntitlement(
  assertion: string,
  tenantId: string,
  productKey: string,
): Promise<void> {
  const payload = await checkCoreEntitlement(assertion, tenantId, productKey);
  const parsed = entitlementDecision.safeParse(payload);
  if (!parsed.success) {
    throw new CoreConsumerError(
      "LUCIA Core returned an invalid entitlement decision.",
      502,
      "CORE_ENTITLEMENT_INVALID",
    );
  }
  if (!parsed.data.active) {
    throw new CoreConsumerError("This capability is not enabled for the workspace.", 403, "ENTITLEMENT_REQUIRED");
  }
}
