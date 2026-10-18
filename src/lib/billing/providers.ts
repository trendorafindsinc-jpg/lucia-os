import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const paymentProviders=["paystack","flutterwave"] as const;
export type PaymentProvider=(typeof paymentProviders)[number];
export type PaymentEnvironment={PAYSTACK_SECRET_KEY?:string;FLUTTERWAVE_SECRET_KEY?:string;FLUTTERWAVE_WEBHOOK_SECRET_HASH?:string};
export class PaymentConfigurationError extends Error { constructor(message:string){super(message);this.name="PaymentConfigurationError";} }
export class PaymentProviderError extends Error { constructor(message:string){super(message);this.name="PaymentProviderError";} }

const checkoutSchema=z.object({email:z.string().email().max(254),amountMinor:z.number().int().positive().max(100_000_000_000),currency:z.string().regex(/^[A-Z]{3}$/),reference:z.string().regex(/^[A-Za-z0-9_-]{8,100}$/),callbackUrl:z.string().url().refine(v=>new URL(v).protocol==="https:"),metadata:z.record(z.string(),z.union([z.string(),z.number(),z.boolean()])).optional()}).strict();
export const verifiedPaymentSchema=z.object({provider:z.enum(paymentProviders),event:z.string().min(1).max(100),reference:z.string().min(1).max(160),providerTransactionId:z.string().min(1).max(160),status:z.enum(["succeeded","failed","pending"]),amountMinor:z.number().int().nonnegative(),currency:z.string().regex(/^[A-Z]{3}$/)}).strict();
export type VerifiedPayment=z.infer<typeof verifiedPaymentSchema>;
const secureEqual=(a:string,b:string)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);};
export function isPaymentProviderConfigured(provider:PaymentProvider,env:PaymentEnvironment=process.env){return provider==="paystack"?Boolean(env.PAYSTACK_SECRET_KEY):Boolean(env.FLUTTERWAVE_SECRET_KEY&&env.FLUTTERWAVE_WEBHOOK_SECRET_HASH);}
function requireSecret(provider:PaymentProvider,env:PaymentEnvironment){const key=provider==="paystack"?env.PAYSTACK_SECRET_KEY:env.FLUTTERWAVE_SECRET_KEY;if(!key)throw new PaymentConfigurationError(provider+" is not configured on the server.");return key;}
function trustedCheckoutUrl(provider:PaymentProvider,value:unknown){if(typeof value!=="string")throw new PaymentProviderError("Provider returned no checkout URL.");let url:URL;try{url=new URL(value);}catch{throw new PaymentProviderError("Provider returned an invalid checkout URL.");}const host=provider==="paystack"?"checkout.paystack.com":"checkout.flutterwave.com";if(url.protocol!=="https:"||url.hostname!==host)throw new PaymentProviderError("Provider returned an untrusted checkout URL.");return url.toString();}

export async function initiateCheckout(provider:PaymentProvider,input:z.input<typeof checkoutSchema>,options:{env?:PaymentEnvironment;fetchImpl?:typeof fetch}={}){
 const safe=checkoutSchema.parse(input),env=options.env??process.env,fetcher=options.fetchImpl??fetch,secret=requireSecret(provider,env);
 const paystack=provider==="paystack";
 const endpoint=paystack?"https://api.paystack.co/transaction/initialize":"https://api.flutterwave.com/v3/payments";
 const payload=paystack?{email:safe.email,amount:safe.amountMinor,currency:safe.currency,reference:safe.reference,callback_url:safe.callbackUrl,metadata:safe.metadata}:{tx_ref:safe.reference,amount:safe.amountMinor/100,currency:safe.currency,redirect_url:safe.callbackUrl,customer:{email:safe.email},meta:safe.metadata};
 const response=await fetcher(endpoint,{method:"POST",headers:{Authorization:"Bearer "+secret,"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify(payload),cache:"no-store"});
 let body:unknown;try{body=await response.json();}catch{throw new PaymentProviderError("Provider returned unreadable JSON.");}
 if(!response.ok||!body||typeof body!=="object")throw new PaymentProviderError("Provider could not initialize checkout.");
 const root=body as Record<string,unknown>,data=root.data as Record<string,unknown>|undefined;
 if(paystack){if(root.status!==true||!data||data.reference!==safe.reference)throw new PaymentProviderError("Paystack did not confirm the checkout reference.");return{provider,reference:safe.reference,checkoutUrl:trustedCheckoutUrl(provider,data.authorization_url)};}
 if(root.status!=="success"||!data||data.tx_ref!==safe.reference)throw new PaymentProviderError("Flutterwave did not confirm the checkout reference.");
 return{provider,reference:safe.reference,checkoutUrl:trustedCheckoutUrl(provider,data.link)};
}

export function verifyWebhookSignature(provider:PaymentProvider,rawBody:string,signature:string|undefined,env:PaymentEnvironment=process.env){
 if(!signature)return false;
 if(provider==="paystack"){if(!env.PAYSTACK_SECRET_KEY)return false;return secureEqual(createHmac("sha512",env.PAYSTACK_SECRET_KEY).update(rawBody,"utf8").digest("hex"),signature);}
 return Boolean(env.FLUTTERWAVE_WEBHOOK_SECRET_HASH&&secureEqual(env.FLUTTERWAVE_WEBHOOK_SECRET_HASH,signature));
}
export function normalizeVerifiedPayment(provider:PaymentProvider,rawBody:string):VerifiedPayment{
 let parsed:unknown;try{parsed=JSON.parse(rawBody);}catch{throw new PaymentProviderError("Webhook body is not valid JSON.");}
 if(!parsed||typeof parsed!=="object")throw new PaymentProviderError("Webhook body is invalid.");
 const root=parsed as Record<string,unknown>,data=root.data as Record<string,unknown>|undefined;if(!data)throw new PaymentProviderError("Webhook event has no payment data.");
 if(provider==="paystack"){
  if(root.event!=="charge.success"&&root.event!=="charge.failed")throw new PaymentProviderError("Unsupported Paystack event.");
  return verifiedPaymentSchema.parse({provider,event:root.event,reference:data.reference,providerTransactionId:String(data.id??""),status:data.status==="success"?"succeeded":data.status==="failed"?"failed":"pending",amountMinor:data.amount,currency:data.currency});
 }
 if(root.event!=="charge.completed")throw new PaymentProviderError("Unsupported Flutterwave event.");
 return verifiedPaymentSchema.parse({provider,event:root.event,reference:data.tx_ref,providerTransactionId:String(data.id??""),status:data.status==="successful"?"succeeded":data.status==="failed"?"failed":"pending",amountMinor:typeof data.amount==="number"?Math.round(data.amount*100):data.amount,currency:data.currency});
}
/** Verify raw-body signature before parsing. Callers must also verify provider transaction and persist idempotently. */
export function acceptWebhook(provider:PaymentProvider,rawBody:string,signature:string|undefined,env:PaymentEnvironment=process.env){
 if(!verifyWebhookSignature(provider,rawBody,signature,env))throw new PaymentProviderError("Webhook signature verification failed.");
 return normalizeVerifiedPayment(provider,rawBody);
}
