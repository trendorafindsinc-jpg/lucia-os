import "server-only";

import { and, desc, eq, ne, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { getOrganizationMembershipsForUser } from "@/lib/access/guards";
import { hasOrganizationPermission } from "@/lib/access/policy";
import { hasOrganizationEntitlement } from "@/lib/subscriptions/entitlements";
import { commerceProducts, websites } from "@/lib/db/schema";

export class CommerceError extends Error {
  constructor(message: string, public status = 422) { super(message); }
}

export type ProductInput = {
  name: string; slug: string; description: string; currency: string;
  priceMinor: number; compareAtPriceMinor: number | null;
};

export async function listCommerceProducts(userId: string, websiteId: string) {
  for (const org of await getOrganizationMembershipsForUser(userId)) {
    if (!hasOrganizationPermission({ role: org.role, status: org.membershipStatus }, "website.read")) continue;
    const result = await getDb().transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.current_user_id', ${userId}, true), set_config('app.current_organization_id', ${org.id}, true)`);
      const [site] = await tx.select({ id: websites.id }).from(websites)
        .where(and(eq(websites.id, websiteId), eq(websites.organizationId, org.id), ne(websites.status, "deleted"))).limit(1);
      if (!site) return null;
      if (!(await hasOrganizationEntitlement(tx, org.id, "commerce"))) throw new CommerceError("An active Commerce entitlement is required for this website.", 403);
      const products = await tx.select().from(commerceProducts)
        .where(and(eq(commerceProducts.organizationId, org.id), eq(commerceProducts.websiteId, websiteId)))
        .orderBy(desc(commerceProducts.updatedAt)).limit(200);
      return products;
    });
    if (result !== null) return result;
  }
  throw new CommerceError("Website not found or access denied.", 404);
}

export async function createCommerceProduct(userId: string, websiteId: string, input: ProductInput) {
  for (const org of await getOrganizationMembershipsForUser(userId)) {
    if (!hasOrganizationPermission({ role: org.role, status: org.membershipStatus }, "website.edit")) continue;
    const result = await getDb().transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.current_user_id', ${userId}, true), set_config('app.current_organization_id', ${org.id}, true)`);
      const [site] = await tx.select({ id: websites.id }).from(websites)
        .where(and(eq(websites.id, websiteId), eq(websites.organizationId, org.id), ne(websites.status, "deleted"))).limit(1);
      if (!site) return null;
      if (!(await hasOrganizationEntitlement(tx, org.id, "commerce"))) throw new CommerceError("An active Commerce entitlement is required before managing products.", 403);
      const [product] = await tx.insert(commerceProducts).values({
        organizationId: org.id, websiteId, createdByUserId: userId, name: input.name,
        slug: input.slug, description: input.description, currency: input.currency,
        priceMinor: input.priceMinor, compareAtPriceMinor: input.compareAtPriceMinor, status: "draft",
      }).returning();
      return product;
    });
    if (result !== null) return result;
  }
  throw new CommerceError("Website not found or product editing denied.", 404);
}
