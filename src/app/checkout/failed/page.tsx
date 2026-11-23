export const dynamic="force-dynamic";
export default function CheckoutFailed() {
 return <main className="commerce-admin"><section className="commerce-admin-panel"><p className="commerce-eyebrow">PAYMENT NOT CONFIRMED</p><h1>We could not confirm your payment</h1><p>No order will be marked paid unless Paystack verification succeeds. If your bank or Paystack shows a debit, contact the store with your payment reference before trying again.</p><a href="/shop">Return to store</a></section></main>;
}
