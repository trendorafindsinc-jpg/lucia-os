"use client";
import Link from "next/link";
import {useState} from "react";
import {createTrialWindow, getTrialState, validateDiscount, type DiscountCode} from "@/lib/billing/billing";
const cadenceLabels=["Weekly","Monthly","Annual"] as const;
type Invoice = { id: string; invoiceNumber: string; organizationName: string; amountDueMinor: number; amountPaidMinor: number; currency: string; status: string; dueAt: string | null; createdAt: string };
export function BillingWorkspace({ invoices, signedIn }: { invoices: Invoice[]; signedIn: boolean }){
 const [cadence,setCadence]=useState<"weekly"|"monthly"|"annual">("monthly");
 const [trialStarted,setTrialStarted]=useState(false);
 const [trialEnd,setTrialEnd]=useState("");
 const [code,setCode]=useState("");
 const [codeMessage,setCodeMessage]=useState("No discount codes are configured for this prototype.");
 const [showCodeResult,setShowCodeResult]=useState(false);
 const trial=trialEnd?getTrialState(trialEnd):null;
 function beginTrial(){
  const trialWindow=createTrialWindow(new Date());
  setTrialEnd(trialWindow.endsAt);
  setTrialStarted(true);
 }
 function checkCode(){
  const configuredCodes:DiscountCode[]=[];
  const result=validateDiscount(code,configuredCodes,10000,"NGN");
  setCodeMessage(result.valid ? `Code ${result.code} would save ${result.discountMinor} minor currency units in this preview.` : result.message);
  setShowCodeResult(true);
 }
 return <main className="billing-shell">
  <header className="billing-topbar"><Link href="/" className="billing-brand">← LUCIA OS</Link><span className="billing-pill">Phase 17 · Billing foundation</span></header>
  <section className="billing-hero"><p className="billing-eyebrow">CLEAR PLANS. NO SURPRISES.</p><h1>Grow on your terms.</h1><p>Choose a billing cadence, understand the trial window, and prepare discounts before payments are enabled.</p></section>
  <section className="billing-notice" role="status"><strong>Payments are not connected</strong><p>Pricing and trial controls remain a planning prototype. No subscription is created and no payment is collected. Invoice records below are read from your organisation workspace.</p></section>
  <section className="billing-invoice-history"><div className="billing-plan-heading"><div><p className="billing-eyebrow">BILLING HISTORY</p><h2>Your invoices</h2><p>Records already saved to LUCIA OS, across your active organisations.</p></div><span className="billing-pill">{invoices.length} records</span></div>
    {!signedIn ? <p className="billing-empty">Sign in with LUCIA ID to view invoices linked to your organisations.</p> : invoices.length ? <div className="billing-invoice-list">{invoices.map((invoice) => { let amount = `${invoice.currency} ${(invoice.amountDueMinor / 100).toLocaleString()}`; try { amount = new Intl.NumberFormat("en-NG", { style: "currency", currency: invoice.currency }).format(invoice.amountDueMinor / 100); } catch {} return <article className="billing-invoice-row" key={invoice.id}><div><strong>{invoice.invoiceNumber}</strong><span>{invoice.organizationName} · {new Date(invoice.createdAt).toLocaleDateString()}</span></div><div><strong>{amount}</strong><span>{invoice.amountPaidMinor > 0 ? `Paid ${new Intl.NumberFormat("en-NG", { style: "currency", currency: invoice.currency }).format(invoice.amountPaidMinor / 100)}` : "No payment recorded"}</span></div><span className={`billing-invoice-status billing-invoice-${invoice.status.replace(/[^a-z0-9-]/gi, "")}`}>{invoice.status.replaceAll("_", " ")}</span></article>; })}</div> : <p className="billing-empty">No invoices have been recorded for your active organisations yet.</p>}
  </section>
  <section className="billing-plan"><div className="billing-plan-heading"><div><p className="billing-eyebrow">WEBSITE PLAN</p><h2>One plan. Flexible billing.</h2><p>Weekly, monthly, or annual billing without artificial feature tiers.</p></div><span className="billing-plan-mark" aria-hidden="true">L</span></div>
   <div className="billing-cadences" role="group" aria-label="Billing cadence">{cadenceLabels.map((label)=><button type="button" key={label} aria-pressed={cadence===label.toLowerCase()} onClick={()=>setCadence(label.toLowerCase() as typeof cadence)}>{label}</button>)}</div>
   <div className="billing-price"><strong>Price not set</strong><span>{cadence} billing · Currency and amount require authorized configuration</span></div>
   <ul className="billing-features"><li>Website builder foundation</li><li>Guided setup and templates</li><li>Publishing tools as features become production-ready</li></ul>
   <button className="billing-primary" type="button" onClick={beginTrial}>{trialStarted?"Refresh trial preview":"Preview 14-day free trial"}</button>
   {trialStarted&&trial&&<p className="billing-result">Preview only: {trial.daysRemaining} day(s) remaining. Ends {new Date(trialEnd).toLocaleString()} in your device timezone. This does not activate a subscription.</p>}
  </section>
  <section className="billing-lower"><article className="billing-card"><p className="billing-eyebrow">DISCOUNT CODES</p><h2>Validate a promotion</h2><p>Codes will need server-side configuration, date limits, currency rules, and redemption tracking.</p><form onSubmit={(event)=>{event.preventDefault();checkCode();}}><label htmlFor="promo-code">Promotion code</label><div className="billing-code-row"><input id="promo-code" value={code} onChange={(event)=>{setCode(event.target.value);setShowCodeResult(false);}} placeholder="Enter a code" maxLength={40}/><button type="submit">Check code</button></div></form>{showCodeResult&&<p className="billing-result" role="status">{codeMessage}</p>}</article>
  <article className="billing-card"><p className="billing-eyebrow">PAYMENT CONTROLS</p><h2>Ready for provider integration</h2><ul className="billing-checklist"><li>Paystack / Flutterwave selection</li><li>Verified server-side payment webhooks</li><li>Receipts and reconciliation</li><li>Cancellation, retries and refund handling</li></ul><p className="billing-muted">None of these actions are live in this phase.</p></article></section>
  <footer className="billing-footer"><span>Subscription and discount validation contracts</span><span>Prototype only · No live billing</span></footer>
 </main>;
}
