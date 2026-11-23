import { headers } from "next/headers";
import { customerCartIdentity, json, validJsonSize } from "@/lib/commerce/http";
import { createStoreOrder, resolveStorefront } from "@/lib/commerce/service";
export const runtime="nodejs"; export const dynamic="force-dynamic";
export async function POST(request:Request) {
 if(!validJsonSize(request,4096)) return json({error:"Request too large."},413);
 let body:any; try { body=await request.json(); } catch { return json({error:"Invalid JSON."},400); }
 if(typeof body?.email!=="string"||body.email.length>254) return json({error:"A valid email is required."},422);
 const host=(await headers()).get("host")??"";
 const site=await resolveStorefront(host); if(!site) return json({error:"Storefront unavailable."},404);
 const identity=customerCartIdentity(request);
 try {
  const checkout=await createStoreOrder(site,identity.hash,body.email,`https://${host}/api/commerce/checkout/return`);
  return json(checkout,201,identity.cookie?{"Set-Cookie":identity.cookie}:{});
 } catch(error) { return json({error:error instanceof Error?error.message:"Checkout could not be started."},422); }
}
