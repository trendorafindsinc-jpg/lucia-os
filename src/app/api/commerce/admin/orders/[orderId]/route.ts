import { z } from "zod";
import { getTenantOrder } from "@/lib/commerce/service";
import { requireCommerceAdmin } from "@/lib/commerce/admin";
import { json } from "@/lib/commerce/http";
export const runtime="nodejs";export const dynamic="force-dynamic";
type Context={params:Promise<{orderId:string}>};
export async function GET(request:Request,context:Context){
 const {orderId}=await context.params;
 if(!z.uuid().safeParse(orderId).success)return json({error:"Invalid order."},400);
 const q=new URL(request.url).searchParams,organizationId=q.get("organizationId")??"",websiteId=q.get("websiteId")??"";
 const access=await requireCommerceAdmin(organizationId,websiteId,"website.read");
 if(!access)return json({error:"Not found or not authorized."},404);
 if(!access.enabled)return json({error:"Commerce entitlement is inactive."},403);
 const result=await getTenantOrder(organizationId,websiteId,orderId);
 return result?json(result):json({error:"Order not found."},404);
}
