import "server-only";

import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";

export type PublicWebsiteLocator = { id: string; organizationId: string };

/** Resolves only published websites through a narrow database function, not a cross-tenant table scan. */
export async function resolvePublicWebsiteBySlug(slug: string): Promise<PublicWebsiteLocator | null> {
  const [row] = await getDb().execute<{ id: string; organization_id: string }>(
    sql`select id, organization_id from public.resolve_public_website_by_slug(${slug})`,
  );
  return row ? { id: row.id, organizationId: row.organization_id } : null;
}

/** Resolves only active hostnames belonging to published websites. */
export async function resolvePublicWebsiteByHostname(hostname: string): Promise<PublicWebsiteLocator | null> {
  const [row] = await getDb().execute<{ id: string; organization_id: string }>(
    sql`select id, organization_id from public.resolve_public_website_by_hostname(${hostname})`,
  );
  return row ? { id: row.id, organizationId: row.organization_id } : null;
}
