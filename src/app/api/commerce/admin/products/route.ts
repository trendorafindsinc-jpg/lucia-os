import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { commerceProducts } from "@/lib/db/schema";
import { assertCommerceAdminMembership, requireCommerceAdmin } from "@/lib/commerce/admin";
import { assertCommerceEntitlement } from "@/lib/commerce/service";
import { json } from "@/lib/commerce/http";
import { websiteMutationAllowed } from "@/lib/websites/draft-revision";
export const runtime="nodejs"; export const dynamic="force-dynamic";
const query=(request:Request)=>new URL(request.url).searchParams;
const schema=z.object({organizationId:z.string().uuid(),websiteId:z.string().uuid(),sku:z.string().trim().min(1).max(80),slug:z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),name:z.string().trim().min(1).max(180),description:z.string().max(5000).default(""),currency:z.string().length(3).transform(v=>v.toUpperCase()),unitAmountMinor:z.number().int().safe().nonnegative(),inventoryQuantity:z.number().int().nonnegative().nullable().optional(),status:z.enum(["draft","active","archived"]).default("draft")}).strict();
export async function GET(request:Request) {
 const q=query(request),organizationId=q.get("organizationId")??"",websiteId=q.get("websiteId")??"";
 const access=await requireCommerceAdmin(organizationId,websiteId,"website.read");
 if(!access) return json({error:"Not found or not authorized."},404);
 if(!access.enabled) return json({error:"Commerce entitlement is inactive."},403);
 const db=getDb();
 const products=await db.transaction(async tx=>{await tx.execute(sql`select set_config('app.current_user_id', ${access.user.id}, true),set_config('app.current_organization_id', ${organizationId}, true)`);
  await assertCommerceAdminMembership(tx,access.user.id,organizationId,"website.read");
  await assertCommerceEntitlement(tx,organizationId,websiteId);
  return tx.select().from(commerceProducts).where(and(eq(commerceProducts.organizationId,organizationId),eq(commerceProducts.websiteId,websiteId))).orderBy(desc(commerceProducts.createdAt));});
 return json({products});
}
export async function POST(request:Request) {
 if(!websiteMutationAllowed(request)) return json({error:"Request origin denied."},403);
 let raw:unknown;try{raw=await request.json();}catch{return json({error:"Invalid JSON."},400);}
 const parsed=schema.safeParse(raw);if(!parsed.success)return json({error:"Invalid product fields.",issues:parsed.error.flatten()},422);
 const {organizationId,websiteId,...product}=parsed.data;
 const access=await requireCommerceAdmin(organizationId,websiteId,"website.edit");
 if(!access) return json({error:"Not found or not authorized."},404);
 if(!access.enabled)return json({error:"Commerce entitlement is inactive."},403);
 try{const db=getDb();const [created]=await db.transaction(async tx=>{await tx.execute(sql`select set_config('app.current_user_id', ${access.user.id}, true),set_config('app.current_organization_id', ${organizationId}, true)`);
  await assertCommerceEntitlement(tx,organizationId,websiteId);
  return tx.insert(commerceProducts).values({organizationId,websiteId,...product}).returning();});
  return json({product:created},201);
 }catch{return json({error:"SKU or slug already exists, or product could not be saved."},409);}
}
