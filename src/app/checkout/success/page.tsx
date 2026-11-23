export const dynamic="force-dynamic";
export default async function CheckoutSuccess({searchParams}:{searchParams:Promise<{order?:string}>}) {
 const {order}=await searchParams;
 return <main className="commerce-admin"><section className="commerce-admin-panel"><p className="commerce-eyebrow">PAYMENT VERIFIED</p><h1>Thank you for your order</h1><p>Your Paystack payment has been verified. Your order is now being prepared.</p>{order?<p>Order reference: <strong>{order}</strong></p>:null}<a href="/shop">Return to store</a></section></main>;
}
