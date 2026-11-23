import { z } from "zod";
import { listTenantOrders, updateOrderFulfillment } from "@/lib/commerce/service";
import { requireCommerceAdmin } from "@/lib/commerce/admin";
import { json } from "@/lib/commerce/http";
import { websiteMutationAllowed } from "@/lib/websites/draft-revision";
const params=(request:Request)=>new URL(request.url).searchParams;
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(request:Request){
 const q=params(request),organizationId=q.get("organizationId")??"",websiteId=q.get("websiteId")??"";
 const access=await requireCommerceAdmin(organizationId,websiteId,"website.read");
 if(!access)return json({error:"Not found or not authorized."},404);
 if(!access.enabled)return json({error:"Commerce entitlement is inactive."},403);
 return json({orders:await listTenantOrders(organizationId,websiteId)});
}
export async function PATCH(request:Request){
 if(!websiteMutationAllowed(request))return json({error:"Request origin denied."},403);
 let body:unknown;try{body=await request.json();}catch{return json({error:"Invalid JSON."},400);}
 const parsed=z.object({organizationId:z.string().uuid(),websiteId:z.string().uuid(),orderId:z.string().uuid(),status:z.enum(["processing","fulfilled","cancelled"])}).strict().safeParse(body);
 if(!parsed.success)return json({error:"Invalid order update."},422);
 const {organizationId,websiteId,orderId,status}=parsed.data;
 const access=await requireCommerceAdmin(organizationId,websiteId,"website.edit");
 if(!access)return json({error:"Not found or not authorized."},404);
 if(!access.enabled)return json({error:"Commerce entitlement is inactive."},403);
 try{return json(await updateOrderFulfillment(organizationId,websiteId,orderId,status));}
 catch(error){return json({error:error instanceof Error?error.message:"Order update failed."},422);}
}
