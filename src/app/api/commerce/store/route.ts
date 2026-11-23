import { headers } from "next/headers";
import { json } from "@/lib/commerce/http";
import { listStoreProducts, resolveStorefront } from "@/lib/commerce/service";
export const runtime="nodejs"; export const dynamic="force-dynamic";
export async function GET() {
 try {
  const host=(await headers()).get("host")??"";
  const site=await resolveStorefront(host);
  if(!site) return json({error:"Storefront unavailable."},404);
  return json({products:await listStoreProducts(site)});
 } catch { return json({error:"Storefront unavailable."},404); }
}
