import {createHmac} from "node:crypto";
import {describe,expect,it,vi} from "vitest";
import {acceptWebhook,initiateCheckout,isPaymentProviderConfigured,PaymentConfigurationError,PaymentProviderError,verifyWebhookSignature} from "./providers";
const env={PAYSTACK_SECRET_KEY:"paystack-test-secret",FLUTTERWAVE_SECRET_KEY:"flutterwave-test-secret",FLUTTERWAVE_WEBHOOK_SECRET_HASH:"known-hash"};
const input={email:"buyer@example.com",amountMinor:125000,currency:"NGN",reference:"order_12345678",callbackUrl:"https://lucia.name.ng/billing/callback"};
describe("provider configuration",()=>{it("requires server credentials",()=>{expect(isPaymentProviderConfigured("paystack",env)).toBe(true);expect(isPaymentProviderConfigured("flutterwave",{FLUTTERWAVE_SECRET_KEY:"key"})).toBe(false);expect(isPaymentProviderConfigured("paystack",{})).toBe(false);});it("fails closed without credentials",async()=>{await expect(initiateCheckout("paystack",input,{env:{},fetchImpl:vi.fn()})).rejects.toBeInstanceOf(PaymentConfigurationError);});});
describe("checkout initialization",()=>{it("uses Paystack minor units and trusted redirect",async()=>{const fetchImpl=vi.fn().mockResolvedValue(new Response(JSON.stringify({status:true,data:{reference:input.reference,authorization_url:"https://checkout.paystack.com/abc"}}),{status:200}));const result=await initiateCheckout("paystack",input,{env,fetchImpl});expect(result.checkoutUrl).toBe("https://checkout.paystack.com/abc");expect(JSON.parse(fetchImpl.mock.calls[0][1].body as string).amount).toBe(125000);});it("converts Flutterwave amount and rejects untrusted redirects",async()=>{const fetchImpl=vi.fn().mockResolvedValue(new Response(JSON.stringify({status:"success",data:{tx_ref:input.reference,link:"https://checkout.flutterwave.com/pay/abc"}}),{status:200}));await initiateCheckout("flutterwave",input,{env,fetchImpl});expect(JSON.parse(fetchImpl.mock.calls[0][1].body as string).amount).toBe(1250);const bad=vi.fn().mockResolvedValue(new Response(JSON.stringify({status:true,data:{reference:input.reference,authorization_url:"https://evil.example/pay"}}),{status:200}));await expect(initiateCheckout("paystack",input,{env,fetchImpl:bad})).rejects.toBeInstanceOf(PaymentProviderError);});});
describe("webhook verification",()=>{it("verifies Paystack HMAC against exact raw body",()=>{const raw=JSON.stringify({event:"charge.success",data:{id:77,reference:input.reference,status:"success",amount:125000,currency:"NGN"}});const signature=createHmac("sha512",env.PAYSTACK_SECRET_KEY).update(raw).digest("hex");expect(verifyWebhookSignature("paystack",raw,signature,env)).toBe(true);expect(verifyWebhookSignature("paystack",raw,"bad",env)).toBe(false);expect(acceptWebhook("paystack",raw,signature,env)).toMatchObject({status:"succeeded",amountMinor:125000});});it("validates Flutterwave secret hash and converts major units",()=>{const raw=JSON.stringify({event:"charge.completed",data:{id:99,tx_ref:input.reference,status:"successful",amount:1250,currency:"NGN"}});expect(acceptWebhook("flutterwave",raw,"known-hash",env)).toMatchObject({status:"succeeded",amountMinor:125000});expect(()=>acceptWebhook("flutterwave",raw,"wrong",env)).toThrow(PaymentProviderError);});it("rejects unsupported events and malformed JSON",()=>{expect(()=>acceptWebhook("paystack","not json","bad",env)).toThrow(PaymentProviderError);const raw=JSON.stringify({event:"transfer.success",data:{}});const signature=createHmac("sha512",env.PAYSTACK_SECRET_KEY).update(raw).digest("hex");expect(()=>acceptWebhook("paystack",raw,signature,env)).toThrow(PaymentProviderError);});});


describe("security and failure recovery regressions",()=> {
 it("rejects invalid checkout inputs before contacting a provider",async()=> {
  const fetchImpl=vi.fn();
  await expect(initiateCheckout("paystack",{...input,callbackUrl:"http://lucia.name.ng/callback"},{env,fetchImpl})).rejects.toThrow();
  await expect(initiateCheckout("paystack",{...input,amountMinor:0},{env,fetchImpl})).rejects.toThrow();
  await expect(initiateCheckout("paystack",{...input,email:"not-an-email"},{env,fetchImpl})).rejects.toThrow();
  await expect(initiateCheckout("paystack",{...input,extra:"untrusted"} as typeof input,{env,fetchImpl})).rejects.toThrow();
  expect(fetchImpl).not.toHaveBeenCalled();
 });
 it("rejects provider responses that change the requested reference",async()=> {
  const paystack=vi.fn().mockResolvedValue(new Response(JSON.stringify({status:true,data:{reference:"different_reference",authorization_url:"https://checkout.paystack.com/pay"}}),{status:200}));
  await expect(initiateCheckout("paystack",input,{env,fetchImpl:paystack})).rejects.toBeInstanceOf(PaymentProviderError);
  const flutterwave=vi.fn().mockResolvedValue(new Response(JSON.stringify({status:"success",data:{tx_ref:"different_reference",link:"https://checkout.flutterwave.com/pay"}}),{status:200}));
  await expect(initiateCheckout("flutterwave",input,{env,fetchImpl:flutterwave})).rejects.toBeInstanceOf(PaymentProviderError);
 });
 it("rejects missing webhook signatures and raw-body tampering",()=> {
  const raw=JSON.stringify({event:"charge.success",data:{id:77,reference:input.reference,status:"success",amount:125000,currency:"NGN"}});
  const signature=createHmac("sha512",env.PAYSTACK_SECRET_KEY).update(raw).digest("hex");
  expect(()=>acceptWebhook("paystack",raw,undefined,env)).toThrow(PaymentProviderError);
  expect(()=>acceptWebhook("paystack",raw+" ",signature,env)).toThrow(PaymentProviderError);
  expect(verifyWebhookSignature("flutterwave",raw,undefined,env)).toBe(false);
 });
 it("rejects non-HTTPS and lookalike checkout hosts",async()=> {
  for (const url of ["http://checkout.paystack.com/pay","https://checkout.paystack.com.evil.example/pay","https://evil.example/checkout.paystack.com"]) {
   const fetchImpl=vi.fn().mockResolvedValue(new Response(JSON.stringify({status:true,data:{reference:input.reference,authorization_url:url}}),{status:200}));
   await expect(initiateCheckout("paystack",input,{env,fetchImpl})).rejects.toBeInstanceOf(PaymentProviderError);
  }
 });
});
