export const dynamic="force-dynamic";
export default async function CheckoutReview({searchParams}:{searchParams:Promise<{order?:string}>}) {
 const {order}=await searchParams;
 return <main className="commerce-admin"><section className="commerce-admin-panel"><p className="commerce-eyebrow">PAYMENT REVIEW</p><h1>Your payment needs a manual review</h1><p>Paystack confirmed a payment after this order had already been cancelled. The order has not been sent to fulfilment. Please contact the store to arrange the next step, including any required refund.</p>{order?<p>Order reference: <strong>{order}</strong></p>:null}</section></main>;
}
