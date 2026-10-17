import "server-only";

import { getCoreIssuer } from "@/lib/auth/oauth";

export class CoreConsumerError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = "CoreConsumerError";
  }
}

async function requestCore(
  path: string,
  assertion: string,
  init?: RequestInit,
): Promise<unknown> {
  if (!assertion || assertion.length > 16_384) {
    throw new CoreConsumerError("A valid Core assertion is required.", 401, "CORE_ASSERTION_REQUIRED");
  }

  const response = await fetch(new URL(path, getCoreIssuer()), {
    ...init,
    headers: {
      Authorization: `Bearer ${assertion}`,
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(8000),
  });

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const code = payload && typeof payload === "object" &&
      typeof (payload as Record<string, unknown>).error === "string"
      ? (payload as Record<string, string>).error
      : "CORE_REQUEST_FAILED";
    throw new CoreConsumerError("LUCIA Core could not authorize this request.", response.status, code);
  }
  return payload;
}

/**
 * Resolves tenant context directly from Core. Never use local organization
 * rows, a hostname, or client state as evidence of tenant membership.
 */
export function getCoreTenantContext(assertion: string, tenantId: string): Promise<unknown> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tenantId)) {
    throw new CoreConsumerError("A valid tenant ID is required.", 400, "INVALID_TENANT_ID");
  }
  return requestCore(`/api/v1/consumer/tenants/${encodeURIComponent(tenantId)}/context`, assertion);
}

export function checkCorePermission(
  assertion: string,
  tenantId: string,
  permission: string,
): Promise<unknown> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tenantId)) {
    throw new CoreConsumerError("A valid tenant ID is required.", 400, "INVALID_TENANT_ID");
  }
  if (!/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/.test(permission) || permission.length > 120) {
    throw new CoreConsumerError("A valid permission key is required.", 400, "INVALID_PERMISSION");
  }
  return requestCore("/api/v1/consumer/authorization/check", assertion, {
    method: "POST",
    body: JSON.stringify({ tenantId, permission }),
  });
}

export function checkCoreEntitlement(
  assertion: string,
  tenantId: string,
  productKey: string,
): Promise<unknown> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tenantId)) {
    throw new CoreConsumerError("A valid tenant ID is required.", 400, "INVALID_TENANT_ID");
  }
  if (!/^[a-z][a-z0-9_]{1,63}$/.test(productKey)) {
    throw new CoreConsumerError("A valid product key is required.", 400, "INVALID_PRODUCT_KEY");
  }
  return requestCore("/api/v1/consumer/entitlements/check", assertion, {
    method: "POST",
    body: JSON.stringify({ tenantId, productKey }),
  });
}
