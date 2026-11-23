import { afterEach, describe, expect, it, vi } from "vitest";
import { initializePaystackCheckout, verifyPaystackCheckout } from "./paystack-gateway";

const oldSecret = process.env.PAYSTACK_SECRET_KEY;
afterEach(() => {
 vi.unstubAllGlobals();
 if (oldSecret === undefined) delete process.env.PAYSTACK_SECRET_KEY;
 else process.env.PAYSTACK_SECRET_KEY = oldSecret;
});
describe("Paystack gateway", () => {
 it("initializes checkout with server credentials and minor-unit amount", async () => {
  process.env.PAYSTACK_SECRET_KEY = "test_secret";
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({status:true,data:{authorization_url:"https://checkout.paystack.com/test",access_code:"abc",reference:"order_ref_123"}}),{status:200}));
  vi.stubGlobal("fetch",fetchMock);
  await expect(initializePaystackCheckout({email:"buyer@example.com",amountMinor:125000,currency:"NGN",reference:"order_ref_123",callbackUrl:"https://shop.example/checkout/return"})).resolves.toMatchObject({reference:"order_ref_123"});
  const [,init] = fetchMock.mock.calls[0] as [string,RequestInit];
  expect((init.headers as Record<string,string>).Authorization).toBe("Bearer test_secret");
  expect(JSON.parse(String(init.body)).amount).toBe(125000);
 });
 it("rejects missing secrets and invalid input before network access", async () => {
  delete process.env.PAYSTACK_SECRET_KEY;
  await expect(initializePaystackCheckout({email:"bad",amountMinor:0,currency:"NGN",reference:"x",callbackUrl:"https://shop.example"})).rejects.toThrow("Invalid Paystack checkout input");
  await expect(verifyPaystackCheckout("short")).rejects.toThrow("Invalid payment reference");
 });
 it("verifies by fetching Paystack's transaction endpoint server-to-server", async () => {
  process.env.PAYSTACK_SECRET_KEY = "test_secret";
  vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response(JSON.stringify({status:true,data:{reference:"order_ref_123",id:123,status:"success",amount:125000,currency:"NGN"}}),{status:200})));
  await expect(verifyPaystackCheckout("order_ref_123")).resolves.toMatchObject({reference:"order_ref_123",transactionId:"123",amountMinor:125000,status:"success"});
 });
});
