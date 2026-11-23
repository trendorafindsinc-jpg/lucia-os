import "server-only";
import { normalizePaystackTransaction } from "@/lib/billing/paystack";
import type { VerifiedProviderTransaction } from "@/lib/billing/verify-transaction";

const API = "https://api.paystack.co";
function secret() {
 const value = process.env.PAYSTACK_SECRET_KEY;
 if (!value) throw new Error("PAYSTACK_SECRET_KEY is not configured");
 return value;
}
async function request<T>(path: string, init?: RequestInit): Promise<T> {
 const response = await fetch(`${API}${path}`, {
  ...init, cache: "no-store", signal: AbortSignal.timeout(12_000),
  headers: { Authorization: `Bearer ${secret()}`, "Content-Type":"application/json", ...(init?.headers ?? {}) },
 });
 const body = await response.json().catch(()=>null) as { status?: boolean; message?: string; data?: T } | null;
 if (!response.ok || !body?.status || body.data === undefined) throw new Error(body?.message || `Paystack request failed (${response.status})`);
 return body.data;
}
export async function initializePaystackCheckout(input: { email:string; amountMinor:number; currency:string; reference:string; callbackUrl:string; metadata?:Record<string,unknown> }) {
 if (!/^\S+@\S+\.\S+$/.test(input.email) || !Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0 || !/^[A-Z]{3}$/.test(input.currency) || !/^[A-Za-z0-9_-]{8,100}$/.test(input.reference)) throw new Error("Invalid Paystack checkout input");
 const data = await request<{ authorization_url:string; access_code:string; reference:string }>("/transaction/initialize", {
  method:"POST", body:JSON.stringify({ email:input.email, amount:input.amountMinor, currency:input.currency, reference:input.reference, callback_url:input.callbackUrl, metadata:input.metadata }),
 });
 if (!data.authorization_url || data.reference !== input.reference) throw new Error("Paystack returned an invalid checkout session");
 return data;
}
export async function verifyPaystackCheckout(reference:string):Promise<VerifiedProviderTransaction> {
 if (!/^[A-Za-z0-9_-]{8,100}$/.test(reference)) throw new Error("Invalid payment reference");
 const data = await request<Record<string,unknown>>(`/transaction/verify/${encodeURIComponent(reference)}`);
 const normalized = normalizePaystackTransaction(data);
 if (!normalized) throw new Error("Paystack returned an invalid transaction");
 return normalized;
}
