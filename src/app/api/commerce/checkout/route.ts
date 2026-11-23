import { headers } from "next/headers";
import { customerCartIdentity, json, validJsonSize } from "@/lib/commerce/http";
import { createStoreOrder, resolveStorefront } from "@/lib/commerce/service";
import { websiteMutationAllowed } from "@/lib/websites/draft-revision";
import { z } from "zod";
export const runtime="nodejs"; export const dynamic="force-dynamic";
export async function POST(request:Request) {
 if(!websiteMutationAllowed(request)) return json({error:"Request origin denied."},403);
 if(!validJsonSize(request,4096)) return json({error:"Request too large."},413);
 let body:unknown; try { body=await request.json(); } catch { return json({error:"Invalid JSON."},400); }
 const parsed=z.object({email:z.string().email().max(254)}).strict().safeParse(body);
 if(!parsed.success) return json({error:"A valid email is required."},422);
 const host=(await headers()).get("host")??"";
 const site=await resolveStorefront(host); if(!site) return json({error:"Storefront unavailable."},404);
 const identity=customerCartIdentity(request);
 try {
  const checkout=await createStoreOrder(site,identity.hash,parsed.data.email,`https://${host}/api/commerce/checkout/return`);
  return json(checkout,201,identity.cookie?{"Set-Cookie":identity.cookie}:{});
 } catch(error) { return json({error:error instanceof Error?error.message:"Checkout could not be started."},422); }
}
