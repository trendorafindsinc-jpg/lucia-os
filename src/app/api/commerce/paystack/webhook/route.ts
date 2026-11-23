import { recordPaystackWebhook } from "@/lib/commerce/service";
export const runtime="nodejs"; export const dynamic="force-dynamic";
export async function POST(request:Request) {
 const raw=await request.text();
 if(raw.length>1024*128) return Response.json({error:"Payload too large."},{status:413});
 try { await recordPaystackWebhook(raw,request.headers.get("x-paystack-signature")); return Response.json({received:true}); }
 catch { return Response.json({error:"Webhook rejected."},{status:400}); }
}
