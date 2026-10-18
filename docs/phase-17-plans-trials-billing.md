# Phase 17 — Plans, trials, and billing foundation

## Included
- Strict schemas for price records, subscriptions, discount codes, and payment records.
- Weekly, monthly, and annual billing cadences with positive configured price requirements.
- A 14-day trial-window helper, elapsed-trial state calculation, and bounded trial duration.
- Discount validation for active periods, percentage limits, currency matching, and redemption caps.
- Responsive `/billing` planning workspace, cadence selection, trial preview, and promotion-code validation state.
- Automated tests for trial dates, invalid price/trial records, discount normalization, date windows, and redemption limits.

## Prototype boundary
No actual prices are configured. The trial preview is client-only and does not activate or persist a subscription. No promo codes are configured. There is no checkout, payment provider, webhook, invoice, receipt, or subscription persistence in this phase. The payment-record schema is a contract only; it does not prove a payment occurred.

## Required before commercial use
- Store plans/prices and subscription state durably with effective-date history and tenant isolation.
- Resolve tenant and product membership through verified LUCIA Core authorization; do not trust client-supplied IDs.
- Define authorized price editing, audit events, tax/discount stacking rules, and price-change grandfathering.
- Integrate a selected payment provider server-side, verify signed webhooks, make processing idempotent, and reconcile provider transactions.
- Add trial eligibility/abuse controls, reminders, cancellation/grace periods, dunning, receipts, refunds, and privacy/retention policies.
- Test the complete subscription lifecycle end-to-end before any customer charges.

## Safety
No production deployment, database migrations, provider credentials, invented Core endpoints, or School OS changes.
