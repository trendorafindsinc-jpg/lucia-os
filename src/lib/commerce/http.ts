import { createCommerceCustomerKey, hashCommerceKey } from "./service";
export const CART_COOKIE="lucia_commerce_cart";
export function customerCartIdentity(request:Request) {
 const cookies=(request.headers.get("cookie")??"").split(";").map(v=>v.trim());
 const entry=cookies.find(v=>v.startsWith(CART_COOKIE+"="));
 const existing=entry?.slice(CART_COOKIE.length+1);
 const valid=existing && /^[A-Za-z0-9_-]{40,80}$/.test(existing);
 const key=valid?existing:createCommerceCustomerKey();
 return {hash:hashCommerceKey(key),cookie:valid?null:`${CART_COOKIE}=${key}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`};
}
export function json(body:unknown,status=200,headers:Record<string,string>={}) {
 return Response.json(body,{status,headers:{"Cache-Control":"no-store",...headers}});
}
export function validJsonSize(request:Request,max=8192) {
 const length=Number(request.headers.get("content-length")??0);
 return !Number.isFinite(length)||length<=max;
}
