import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { hasOrganizationPermission } from "@/lib/access/policy";
import { getDb } from "@/lib/db/client";
import { commerceCartItems, commerceCarts, commerceEntitlements, commerceOrderItems, commerceOrders, commercePaymentAttempts, commerceProducts, commerceWebhookEvents, memberships, websiteDomains, websites } from "@/lib/db/schema";
import { calculateCartTotals } from "./totals";
import { initializePaystackCheckout, verifyPaystackCheckout } from "./paystack-gateway";
import { verifyProviderTransaction } from "@/lib/billing/verify-transaction";
import { normalizeHostname } from "@/lib/domains/hostname";

type CommerceTx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

export const hashCommerceKey = (value:string) => createHash("sha256").update(value).digest("hex");
export function createCommerceCustomerKey() { return randomBytes(32).toString("base64url"); }
async function tenantTx<T>(organizationId:string, fn:(tx:CommerceTx)=>Promise<T>, userId?:string):Promise<T> {
 const db=getDb();
 return db.transaction(async tx=>{
  await tx.execute(sql`select set_config('app.current_organization_id', ${organizationId}, true)`);
  if(userId) await tx.execute(sql`select set_config('app.current_user_id', ${userId}, true)`);
  return fn(tx);
 });
}
async function assertCommerceMembership(tx:CommerceTx,userId:string,organizationId:string,permission:"website.read"|"website.edit") {
 const [membership]=await tx.select({role:memberships.role,status:memberships.status}).from(memberships)
  .where(and(eq(memberships.organizationId,organizationId),eq(memberships.userId,userId),eq(memberships.status,"active"))).limit(1);
 if(!hasOrganizationPermission(membership,permission)) throw new Error("Organization access changed; refresh and try again.");
}
export async function assertCommerceEntitlement(tx:CommerceTx,organizationId:string,websiteId:string) {
 const [row]=await tx.select({id:commerceEntitlements.id}).from(commerceEntitlements)
  .where(and(eq(commerceEntitlements.organizationId,organizationId),eq(commerceEntitlements.websiteId,websiteId),eq(commerceEntitlements.status,"active"),sql`(expires_at IS NULL OR expires_at > now())`)).limit(1);
 if(!row) throw new Error("Commerce entitlement is inactive");
}
export async function resolveStorefront(host:string) {
 let hostname:string;
 try { hostname=normalizeHostname(new URL(`http://${host}`).hostname); } catch { return null; }
 const db=getDb();
 const [site]=await db.select({websiteId:websites.id,organizationId:websites.organizationId,name:websites.name,status:websites.status})
  .from(websiteDomains).innerJoin(websites,and(eq(websites.id,websiteDomains.websiteId),eq(websites.organizationId,websiteDomains.organizationId)))
  .where(and(eq(websiteDomains.hostname,hostname),eq(websiteDomains.status,"active"),eq(websites.status,"published"))).limit(1);
 if(!site) return null;
 const enabled=await tenantTx(site.organizationId,tx=>tx.select({id:commerceEntitlements.id}).from(commerceEntitlements)
  .where(and(eq(commerceEntitlements.organizationId,site.organizationId),eq(commerceEntitlements.websiteId,site.websiteId),eq(commerceEntitlements.status,"active"),sql`(expires_at IS NULL OR expires_at > now())`)).limit(1));
 return enabled.length ? site : null;
}
export async function listStoreProducts(site:{organizationId:string;websiteId:string}) {
 return tenantTx(site.organizationId,async tx=>{
  await assertCommerceEntitlement(tx,site.organizationId,site.websiteId);
  return tx.select({id:commerceProducts.id,slug:commerceProducts.slug,name:commerceProducts.name,description:commerceProducts.description,sku:commerceProducts.sku,currency:commerceProducts.currency,unitAmountMinor:commerceProducts.unitAmountMinor})
   .from(commerceProducts).where(and(eq(commerceProducts.organizationId,site.organizationId),eq(commerceProducts.websiteId,site.websiteId),eq(commerceProducts.status,"active"))).orderBy(desc(commerceProducts.createdAt));
 });
}
async function loadCart(tx:CommerceTx, site:{organizationId:string;websiteId:string}, customerHash:string) {
 let [cart]=await tx.select().from(commerceCarts).where(and(eq(commerceCarts.organizationId,site.organizationId),eq(commerceCarts.websiteId,site.websiteId),eq(commerceCarts.customerKeyHash,customerHash),eq(commerceCarts.status,"active"))).limit(1);
 if(!cart) {
  [cart]=await tx.insert(commerceCarts).values({organizationId:site.organizationId,websiteId:site.websiteId,customerKeyHash:customerHash}).onConflictDoNothing().returning();
  if(!cart) [cart]=await tx.select().from(commerceCarts).where(and(eq(commerceCarts.organizationId,site.organizationId),eq(commerceCarts.websiteId,site.websiteId),eq(commerceCarts.customerKeyHash,customerHash),eq(commerceCarts.status,"active"))).limit(1);
 }
 if(!cart) throw new Error("Unable to create cart");
 return cart;
}
export async function readCart(site:{organizationId:string;websiteId:string}, customerHash:string) {
 return tenantTx(site.organizationId,async tx=>{
  await assertCommerceEntitlement(tx,site.organizationId,site.websiteId);
  const cart=await loadCart(tx,site,customerHash);
  const rows=await tx.select({productId:commerceProducts.id,name:commerceProducts.name,sku:commerceProducts.sku,currency:commerceProducts.currency,unitAmountMinor:commerceProducts.unitAmountMinor,quantity:commerceCartItems.quantity})
   .from(commerceCartItems).innerJoin(commerceProducts,and(eq(commerceProducts.id,commerceCartItems.productId),eq(commerceProducts.organizationId,commerceCartItems.organizationId),eq(commerceProducts.websiteId,commerceCartItems.websiteId)))
   .where(and(eq(commerceCartItems.cartId,cart.id),eq(commerceProducts.status,"active")));
  if(!rows.length) return {cartId:cart.id,items:[],currency:cart.currency,subtotalMinor:0,itemCount:0};
  return {cartId:cart.id,...calculateCartTotals(rows)};
 });
}
export async function mutateCart(site:{organizationId:string;websiteId:string}, customerHash:string, input:{productId:string;quantity:number|null}) {
 if(!/^[0-9a-f-]{36}$/i.test(input.productId)) throw new Error("Invalid product");
 if(input.quantity!==null && (!Number.isInteger(input.quantity)||input.quantity<1||input.quantity>99)) throw new Error("Quantity must be between 1 and 99");
 return tenantTx(site.organizationId,async tx=>{
  await assertCommerceEntitlement(tx,site.organizationId,site.websiteId);
  const cart=await loadCart(tx,site,customerHash);
  const [product]=await tx.select({id:commerceProducts.id,currency:commerceProducts.currency}).from(commerceProducts)
   .where(and(eq(commerceProducts.id,input.productId),eq(commerceProducts.organizationId,site.organizationId),eq(commerceProducts.websiteId,site.websiteId),eq(commerceProducts.status,"active"))).limit(1);
  if(input.quantity!==null && !product) throw new Error("Product is unavailable");
  if(input.quantity===null) await tx.delete(commerceCartItems).where(and(eq(commerceCartItems.cartId,cart.id),eq(commerceCartItems.productId,input.productId)));
  else {
   if(product!.currency!==cart.currency && (await tx.select({id:commerceCartItems.id}).from(commerceCartItems).where(eq(commerceCartItems.cartId,cart.id)).limit(1)).length) throw new Error("A cart cannot contain multiple currencies");
   await tx.insert(commerceCartItems).values({organizationId:site.organizationId,websiteId:site.websiteId,cartId:cart.id,productId:input.productId,quantity:input.quantity})
    .onConflictDoUpdate({target:[commerceCartItems.cartId,commerceCartItems.productId],set:{quantity:input.quantity,updatedAt:new Date()}});
  }
  await tx.update(commerceCarts).set({currency:product?.currency??cart.currency,updatedAt:new Date()}).where(eq(commerceCarts.id,cart.id));
  return true;
 });
}
export async function createStoreOrder(site:{organizationId:string;websiteId:string}, customerHash:string, email:string, callbackUrl:string) {
 if(!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Enter a valid email address");
 const created=await tenantTx(site.organizationId,async tx=>{
  await assertCommerceEntitlement(tx,site.organizationId,site.websiteId);
  const [cart]=await tx.select().from(commerceCarts).where(and(eq(commerceCarts.organizationId,site.organizationId),eq(commerceCarts.websiteId,site.websiteId),eq(commerceCarts.customerKeyHash,customerHash),eq(commerceCarts.status,"active"))).limit(1).for("update");
  if(!cart) throw new Error("Cart is empty");
  const rows=await tx.select({productId:commerceProducts.id,name:commerceProducts.name,sku:commerceProducts.sku,description:commerceProducts.description,currency:commerceProducts.currency,unitAmountMinor:commerceProducts.unitAmountMinor,inventoryQuantity:commerceProducts.inventoryQuantity,quantity:commerceCartItems.quantity})
   .from(commerceCartItems).innerJoin(commerceProducts,and(eq(commerceProducts.id,commerceCartItems.productId),eq(commerceProducts.organizationId,commerceCartItems.organizationId),eq(commerceProducts.websiteId,commerceCartItems.websiteId)))
   .where(and(eq(commerceCartItems.cartId,cart.id),eq(commerceProducts.status,"active"))).for("update");
  const totals=calculateCartTotals(rows);
  if(totals.subtotalMinor<=0) throw new Error("Order total must be greater than zero");
  for (const line of totals.lines) {
   const product=rows.find((row)=>row.productId===line.productId);
   if(product?.inventoryQuantity!==null && product?.inventoryQuantity!==undefined && product.inventoryQuantity<line.quantity) throw new Error("Insufficient stock for "+line.name);
   if(product?.inventoryQuantity!==null && product?.inventoryQuantity!==undefined) {
    const changed=await tx.update(commerceProducts).set({inventoryQuantity:sql`inventory_quantity - ${line.quantity}`,updatedAt:new Date()}).where(and(eq(commerceProducts.id,line.productId),eq(commerceProducts.organizationId,site.organizationId),eq(commerceProducts.websiteId,site.websiteId),sql`inventory_quantity >= ${line.quantity}`)).returning({id:commerceProducts.id});
    if(!changed.length) throw new Error("Insufficient stock for "+line.name);
   }
  }
  const orderNumber=`LUC-${Date.now().toString(36).toUpperCase()}-${randomBytes(4).toString("hex").toUpperCase()}`;
  const [order]=await tx.insert(commerceOrders).values({organizationId:site.organizationId,websiteId:site.websiteId,orderNumber,customerKeyHash:customerHash,customerEmail:email,currency:totals.currency,subtotalMinor:totals.subtotalMinor,totalMinor:totals.subtotalMinor,status:"pending_payment",paymentStatus:"pending"}).returning();
  await tx.insert(commerceOrderItems).values(totals.lines.map(line=>({organizationId:site.organizationId,websiteId:site.websiteId,orderId:order.id,productId:line.productId,productName:line.name,sku:line.sku,quantity:line.quantity,unitAmountMinor:line.unitAmountMinor,lineTotalMinor:line.lineTotalMinor,currency:line.currency,snapshot:{name:line.name,sku:line.sku,description:rows.find((r)=>r.productId===line.productId)?.description??"",unitAmountMinor:line.unitAmountMinor,quantity:line.quantity,currency:line.currency}})));
  const reference=`lucia_${randomBytes(18).toString("hex")}`;
  const [attempt]=await tx.insert(commercePaymentAttempts).values({organizationId:site.organizationId,websiteId:site.websiteId,orderId:order.id,reference,amountMinor:totals.subtotalMinor,currency:totals.currency,status:"initialized"}).returning();
  await tx.update(commerceCarts).set({status:"converted",updatedAt:new Date()}).where(eq(commerceCarts.id,cart.id));
  return {order,attempt};
 });
 try {
  const checkout=await initializePaystackCheckout({email,amountMinor:created.attempt.amountMinor,currency:created.attempt.currency,reference:created.attempt.reference,callbackUrl,metadata:{order_id:created.order.id,order_number:created.order.orderNumber}});
  await tenantTx(site.organizationId,tx=>tx.update(commercePaymentAttempts).set({checkoutUrl:checkout.authorization_url,status:"pending",updatedAt:new Date()}).where(and(eq(commercePaymentAttempts.id,created.attempt.id),sql`status IN ('initialized','pending')`)));
  return {orderNumber:created.order.orderNumber,checkoutUrl:checkout.authorization_url,reference:created.attempt.reference};
 } catch(error) {
  // A timeout can occur after Paystack created a live checkout session. Keep
  // the reservation and pending state until a verified provider event resolves it.
  await tenantTx(site.organizationId,tx=>tx.update(commercePaymentAttempts).set({status:"pending",updatedAt:new Date()}).where(and(eq(commercePaymentAttempts.id,created.attempt.id),eq(commercePaymentAttempts.status,"initialized"))));
  throw error;
 }}
export async function settlePaystackReference(reference:string) {
 const db=getDb();
 const lookup=await db.execute(sql`select organization_id, payment_attempt_id from commerce_lookup_payment_reference(${reference})`);
 const located=(lookup as unknown as Array<{organization_id:string;payment_attempt_id:string}>)[0];
 if(!located) throw new Error("Payment reference not found");
 const [attempt]=await tenantTx(located.organization_id,tx=>tx.select().from(commercePaymentAttempts).where(and(eq(commercePaymentAttempts.id,located.payment_attempt_id),eq(commercePaymentAttempts.provider,"paystack"),eq(commercePaymentAttempts.reference,reference))).limit(1));
 if(!attempt) throw new Error("Payment reference not found");
 const actual=await verifyPaystackCheckout(reference);
 const result=verifyProviderTransaction({reference:attempt.reference,amountMinor:attempt.amountMinor,currency:attempt.currency},actual);
 if(!result.ok) throw new Error(`Payment verification failed: ${result.reason}`);
 return tenantTx(attempt.organizationId,async tx=>{
  const [locked]=await tx.select().from(commercePaymentAttempts).where(eq(commercePaymentAttempts.id,attempt.id)).limit(1).for("update");
  if(!locked) throw new Error("Payment attempt not found");
  if(locked.status==="success") return {paid:true,alreadySettled:true};
  const [order]=await tx.select().from(commerceOrders).where(eq(commerceOrders.id,locked.orderId)).limit(1).for("update");
  if(!order) throw new Error("Order not found");
  if(order.totalMinor!==result.amountMinor||order.currency!==result.currency) throw new Error("Order amount does not match verified payment");
  await tx.update(commercePaymentAttempts).set({status:"success",transactionId:result.transactionId,verifiedAt:new Date(),updatedAt:new Date()}).where(eq(commercePaymentAttempts.id,locked.id));
  // A late success after a verified failure/cancellation must never re-enter
  // fulfilment automatically; it requires a separate refund/review workflow.
  const lateAfterCancellation=order.status==="cancelled";
  await tx.update(commerceOrders).set({paymentStatus:"paid",status:lateAfterCancellation?"cancelled":"processing",updatedAt:new Date()}).where(eq(commerceOrders.id,order.id));
  return {paid:true,alreadySettled:false,orderNumber:order.orderNumber,manualReview:lateAfterCancellation};
 });
}
export async function recordPaystackWebhook(rawBody:string,signature:string|null) {
 const {verifyPaystackWebhookSignature}=await import("@/lib/billing/paystack");
 const secret=process.env.PAYSTACK_SECRET_KEY;
 if(!secret||!verifyPaystackWebhookSignature(rawBody,signature,secret)) throw new Error("Invalid webhook signature");
 const payload=JSON.parse(rawBody) as {event?:string;data?:{reference?:string}};
 if((payload.event!=="charge.success"&&payload.event!=="charge.failed")||typeof payload.data?.reference!=="string") return {ignored:true};
 const reference=payload.data.reference, eventKey=hashCommerceKey(rawBody);
 const db=getDb();
 const [existing]=await db.select().from(commerceWebhookEvents).where(and(eq(commerceWebhookEvents.provider,"paystack"),eq(commerceWebhookEvents.eventKey,eventKey))).limit(1);
 if(existing?.status==="processed") return {duplicate:true};
 if(!existing) await db.insert(commerceWebhookEvents).values({provider:"paystack",eventKey,reference,payloadHash:eventKey,status:"received"}).onConflictDoNothing();
 try {
  let settled: { paid?:boolean; alreadySettled?:boolean; orderNumber?:string; manualReview?:boolean; failed?:boolean; ignored?:boolean; duplicate?:boolean } | undefined;
  if(payload.event==="charge.success") settled=await settlePaystackReference(reference);
  else {
   const actual=await verifyPaystackCheckout(reference);
   if(actual.status.trim().toLowerCase()!=="failed" || actual.reference!==reference) throw new Error("Paystack failure event did not verify as failed");
   const lookup=await db.execute(sql`select organization_id, payment_attempt_id from commerce_lookup_payment_reference(${reference})`);
   const located=(lookup as unknown as Array<{organization_id:string;payment_attempt_id:string}>)[0];
   if(!located) throw new Error("Payment reference not found");
   const [attempt]=await tenantTx(located.organization_id,tx=>tx.select().from(commercePaymentAttempts).where(and(eq(commercePaymentAttempts.id,located.payment_attempt_id),eq(commercePaymentAttempts.provider,"paystack"),eq(commercePaymentAttempts.reference,reference))).limit(1));
   if(!attempt) throw new Error("Payment reference not found");
   if(actual.amountMinor!==attempt.amountMinor || actual.currency.trim().toUpperCase()!==attempt.currency.trim().toUpperCase()) throw new Error("Failed transaction amount/currency mismatch");
   settled=await tenantTx(attempt.organizationId,async tx=>{
    const [order]=await tx.select().from(commerceOrders).where(eq(commerceOrders.id,attempt.orderId)).limit(1).for("update");
    if(order?.paymentStatus==="paid" || attempt.status==="success") return {ignored:true,alreadyPaid:true};
    if(order && order.paymentStatus!=="paid" && order.status!=="cancelled") {
     const lines=await tx.select({productId:commerceOrderItems.productId,quantity:commerceOrderItems.quantity}).from(commerceOrderItems).where(eq(commerceOrderItems.orderId,order.id));
     for(const line of lines) if(line.productId) await tx.update(commerceProducts).set({inventoryQuantity:sql`CASE WHEN inventory_quantity IS NULL THEN NULL ELSE inventory_quantity + ${line.quantity} END`,updatedAt:new Date()}).where(eq(commerceProducts.id,line.productId));
     await tx.update(commerceOrders).set({status:"cancelled",paymentStatus:"failed",updatedAt:new Date()}).where(eq(commerceOrders.id,order.id));
    }
    await tx.update(commercePaymentAttempts).set({status:"failed",updatedAt:new Date()}).where(eq(commercePaymentAttempts.id,attempt.id));
    return {failed:true};
   });
  }
  await db.update(commerceWebhookEvents).set({status:"processed",processedAt:new Date()}).where(and(eq(commerceWebhookEvents.provider,"paystack"),eq(commerceWebhookEvents.eventKey,eventKey)));
  return settled;
 } catch(error) {
  await db.update(commerceWebhookEvents).set({status:"failed"}).where(and(eq(commerceWebhookEvents.provider,"paystack"),eq(commerceWebhookEvents.eventKey,eventKey)));
  throw error;
 }
}
export async function listTenantOrders(organizationId:string,websiteId:string,userId:string) {
 return tenantTx(organizationId,async tx=>{
  await assertCommerceMembership(tx,userId,organizationId,"website.read");
  await assertCommerceEntitlement(tx,organizationId,websiteId);
  return tx.select().from(commerceOrders).where(and(eq(commerceOrders.organizationId,organizationId),eq(commerceOrders.websiteId,websiteId))).orderBy(desc(commerceOrders.createdAt)).limit(100);
 },userId);
}
export async function updateOrderFulfillment(organizationId:string,websiteId:string,orderId:string,userId:string,status:"processing"|"fulfilled"|"cancelled") {
 return tenantTx(organizationId,async tx=>{
  await assertCommerceMembership(tx,userId,organizationId,"website.edit");
  await assertCommerceMembership(tx,userId,organizationId,"website.read");
  await assertCommerceEntitlement(tx,organizationId,websiteId);
  const [order]=await tx.select().from(commerceOrders).where(and(eq(commerceOrders.id,orderId),eq(commerceOrders.organizationId,organizationId),eq(commerceOrders.websiteId,websiteId))).limit(1).for("update");
  if(!order) throw new Error("Order not found");
  if(order.paymentStatus!=="paid" && status!=="cancelled") throw new Error("Only paid orders can be fulfilled");
  if(status==="cancelled" && order.paymentStatus!=="failed") throw new Error("Orders can only be cancelled after a verified failed payment");
  if(order.status==="cancelled") throw new Error("Order is already cancelled");
  await tx.update(commerceOrders).set({status,updatedAt:new Date()}).where(eq(commerceOrders.id,orderId));
  return {id:orderId,status};
 },userId);
}
export async function getTenantOrder(organizationId:string,websiteId:string,orderId:string,userId:string) {
 return tenantTx(organizationId,async tx=>{
  await assertCommerceEntitlement(tx,organizationId,websiteId);
  const [order]=await tx.select().from(commerceOrders).where(and(eq(commerceOrders.id,orderId),eq(commerceOrders.organizationId,organizationId),eq(commerceOrders.websiteId,websiteId))).limit(1);
  if(!order) return null;
  const items=await tx.select().from(commerceOrderItems).where(and(eq(commerceOrderItems.orderId,orderId),eq(commerceOrderItems.organizationId,organizationId),eq(commerceOrderItems.websiteId,websiteId))).orderBy(asc(commerceOrderItems.createdAt));
  return {order,items};
 },userId);
}
