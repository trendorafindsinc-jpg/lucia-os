import { NextRequest,NextResponse } from "next/server";
import { settlePaystackReference } from "@/lib/commerce/service";
export const runtime="nodejs"; export const dynamic="force-dynamic";
export async function GET(request:NextRequest) {
 const reference=request.nextUrl.searchParams.get("reference")??request.nextUrl.searchParams.get("trxref");
 if(!reference) return NextResponse.redirect(new URL("/checkout/failed",request.url));
 try { const result=await settlePaystackReference(reference);
  return NextResponse.redirect(new URL(`/checkout/${"manualReview" in result && result.manualReview ? "review" : "success"}?order=${encodeURIComponent("orderNumber" in result?result.orderNumber:"")}`,request.url));
 } catch { return NextResponse.redirect(new URL("/checkout/failed",request.url)); }
}
