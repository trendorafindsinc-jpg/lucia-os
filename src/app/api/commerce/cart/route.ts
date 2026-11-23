import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { customerCartIdentity, json, validJsonSize } from "@/lib/commerce/http";
import { websiteMutationAllowed } from "@/lib/websites/draft-revision";
import { mutateCart, readCart, resolveStorefront } from "@/lib/commerce/service";
import { z } from "zod";
export const runtime="nodejs"; export const dynamic="force-dynamic";
async function context(request:Request) {
 const host=(await headers()).get("host")??request.headers.get("host")??"";
 const site=await resolveStorefront(host);
 return site;
}
export async function GET(request:Request) {
 const site=await context(request); if(!site) return json({error:"Storefront unavailable."},404);
 const identity=customerCartIdentity(request);
 try { const response=NextResponse.json(await readCart(site,identity.hash),{headers:{"Cache-Control":"no-store"}});
  if(identity.cookie) response.headers.append("Set-Cookie",identity.cookie); return response;
 } catch { return json({error:"Cart unavailable."},503); }
}
export async function POST(request:Request) {
 if(!websiteMutationAllowed(request)) return json({error:"Request origin denied."},403);
 if(!validJsonSize(request)) return json({error:"Request too large."},413);
 const site=await context(request); if(!site) return json({error:"Storefront unavailable."},404);
 let body:unknown; try { body=await request.json(); } catch { return json({error:"Invalid JSON."},400); }
 const parsed=z.object({productId:z.string().uuid(),quantity:z.number().int().min(1).max(99)}).strict().safeParse(body);
 if(!parsed.success) return json({error:"Product and quantity are required."},422);
 const {productId,quantity}=parsed.data;
 const identity=customerCartIdentity(request);
 try { await mutateCart(site,identity.hash,{productId,quantity});
  const response=NextResponse.json(await readCart(site,identity.hash),{headers:{"Cache-Control":"no-store"}});
  if(identity.cookie) response.headers.append("Set-Cookie",identity.cookie); return response;
 } catch(error) { return json({error:error instanceof Error?error.message:"Cart update failed."},422); }
}
export async function DELETE(request:Request) {
 if(!websiteMutationAllowed(request)) return json({error:"Request origin denied."},403);
 const site=await context(request); if(!site) return json({error:"Storefront unavailable."},404);
 let body:unknown; try { body=await request.json(); } catch { return json({error:"Invalid JSON."},400); }
 const parsed=z.object({productId:z.string().uuid()}).strict().safeParse(body);
 if(!parsed.success) return json({error:"Product is required."},422);
 const identity=customerCartIdentity(request);
 try { await mutateCart(site,identity.hash,{productId:parsed.data.productId,quantity:null}); return json(await readCart(site,identity.hash)); }
 catch { return json({error:"Cart update failed."},422); }
}
