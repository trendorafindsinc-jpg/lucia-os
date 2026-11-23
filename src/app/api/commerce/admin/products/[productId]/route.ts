import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { commerceProducts } from "@/lib/db/schema";
import { requireCommerceAdmin } from "@/lib/commerce/admin";
import { assertCommerceEntitlement } from "@/lib/commerce/service";
import { json } from "@/lib/commerce/http";
import { websiteMutationAllowed } from "@/lib/websites/draft-revision";
export const runtime="nodejs";export const dynamic="force-dynamic";
type Context={params:Promise<{productId:string}>};
const schema=z.object({organizationId:z.string().uuid(),websiteId:z.string().uuid(),name:z.string().trim().min(1).max(180).optional(),slug:z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),sku:z.string().trim().min(1).max(80).optional(),description:z.string().max(5000).optional(),currency:z.string().length(3).transform(v=>v.toUpperCase()).optional(),unitAmountMinor:z.number().int().safe().nonnegative().optional(),inventoryQuantity:z.number().int().nonnegative().nullable().optional(),status:z.enum(["draft","active","archived"]).optional()}).strict();
export async function PATCH(request:Request,context:Context){
 if(!websiteMutationAllowed(request))return json({error:"Request origin denied."},403);
 const {productId}=await context.params;
 if(!z.uuid().safeParse(productId).success)return json({error:"Invalid product."},400);
 let body:unknown;try{body=await request.json();}catch{return json({error:"Invalid JSON."},400);}
 const parsed=schema.safeParse(body);if(!parsed.success)return json({error:"Invalid product update.",issues:parsed.error.flatten()},422);
 const {organizationId,websiteId,...changes}=parsed.data;
 if(!Object.keys(changes).length)return json({error:"No changes supplied."},422);
 const access=await requireCommerceAdmin(organizationId,websiteId,"website.edit");
 if(!access)return json({error:"Not found or not authorized."},404);
 if(!access.enabled)return json({error:"Commerce entitlement is inactive."},403);
 try{const db=getDb();const [product]=await db.transaction(async tx=>{await tx.execute(sql`select set_config('app.current_user_id', ${access.user.id}, true),set_config('app.current_organization_id', ${organizationId}, true)`);
  return tx.update(commerceProducts).set({...changes,updatedAt:new Date()}).where(and(eq(commerceProducts.id,productId),eq(commerceProducts.organizationId,organizationId),eq(commerceProducts.websiteId,websiteId))).returning();});
  return product?json({product}):json({error:"Product not found."},404);
 }catch{return json({error:"SKU or slug already exists, or product could not be updated."},409);}
}
