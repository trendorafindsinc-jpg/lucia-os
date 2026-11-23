import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { getCurrentOrganizationAccess } from "@/lib/access/guards";
import { hasOrganizationPermission } from "@/lib/access/policy";
import { getDb } from "@/lib/db/client";
import { commerceEntitlements, memberships, websites } from "@/lib/db/schema";
type AdminTx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];
export async function assertCommerceAdminMembership(tx:AdminTx,userId:string,organizationId:string,permission:"website.read"|"website.edit"|"website.publish") {
 const [membership]=await tx.select({role:memberships.role,status:memberships.status}).from(memberships).where(and(eq(memberships.organizationId,organizationId),eq(memberships.userId,userId),eq(memberships.status,"active"))).limit(1);
 if(!hasOrganizationPermission(membership,permission)) throw new Error("Organization access changed; refresh and try again.");
}
export async function requireCommerceAdmin(organizationId:string,websiteId:string,permission:"website.read"|"website.edit"|"website.publish"="website.read") {
 const access=await getCurrentOrganizationAccess(organizationId,permission);
 if(!access) return null;
 const db=getDb();
 return db.transaction(async tx=>{
  await tx.execute(sql`select set_config('app.current_user_id', ${access.user.id}, true), set_config('app.current_organization_id', ${organizationId}, true)`);
  await assertCommerceAdminMembership(tx,access.user.id,organizationId,permission);
  const [site]=await tx.select({id:websites.id,name:websites.name,status:websites.status}).from(websites)
   .where(and(eq(websites.id,websiteId),eq(websites.organizationId,organizationId))).limit(1);
  if(!site) return null;
  const [entitlement]=await tx.select({status:commerceEntitlements.status}).from(commerceEntitlements)
   .where(and(eq(commerceEntitlements.organizationId,organizationId),eq(commerceEntitlements.websiteId,websiteId),eq(commerceEntitlements.status,"active"),sql`(expires_at IS NULL OR expires_at > now())`)).limit(1);
  if(!entitlement) return {user:access.user,site,enabled:false as const};
  return {user:access.user,site,enabled:true as const};
 });
}
