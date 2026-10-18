import { z } from "zod";

export const billingCadences = ["weekly", "monthly", "annual"] as const;
export type BillingCadence = (typeof billingCadences)[number];
export const subscriptionStatuses = ["trialing", "active", "past_due", "cancelled", "expired"] as const;
export const paymentStatuses = ["pending", "succeeded", "failed", "refunded"] as const;

export const priceSchema = z.object({
  id: z.string().regex(/^price-[a-z0-9-]{1,50}$/),
  planKey: z.string().regex(/^[a-z0-9_-]{1,60}$/),
  cadence: z.enum(billingCadences),
  currency: z.string().regex(/^[A-Z]{3}$/),
  amountMinor: z.number().int().positive(),
  active: z.boolean(),
  effectiveFrom: z.string().datetime(),
}).strict();

export const discountCodeSchema = z.object({
  code: z.string().trim().min(3).max(40).regex(/^[A-Za-z0-9_-]+$/).transform((code) => code.toUpperCase()),
  kind: z.enum(["percent", "fixed"]),
  value: z.number().positive(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  maxRedemptions: z.number().int().positive().optional(),
  redemptionCount: z.number().int().nonnegative(),
  active: z.boolean(),
}).strict().superRefine((discount, context) => {
  if (Date.parse(discount.endsAt) <= Date.parse(discount.startsAt)) context.addIssue({code:z.ZodIssueCode.custom,path:["endsAt"],message:"Discount end must be after its start."});
  if (discount.kind === "percent" && discount.value > 100) context.addIssue({code:z.ZodIssueCode.custom,path:["value"],message:"Percentage discounts cannot exceed 100%."});
  if (discount.kind === "fixed" && !discount.currency) context.addIssue({code:z.ZodIssueCode.custom,path:["currency"],message:"Fixed discounts require a currency."});
});

export const subscriptionSchema = z.object({
  id: z.string().regex(/^sub-[a-z0-9-]{1,50}$/),
  tenantId: z.string().min(1).max(120),
  productKey: z.string().regex(/^[a-z0-9_-]{1,60}$/),
  planKey: z.string().regex(/^[a-z0-9_-]{1,60}$/),
  cadence: z.enum(billingCadences),
  status: z.enum(subscriptionStatuses),
  trialStartsAt: z.string().datetime(),
  trialEndsAt: z.string().datetime(),
  currentPeriodEndsAt: z.string().datetime().optional(),
}).strict().superRefine((subscription, context) => {
  if (Date.parse(subscription.trialEndsAt) <= Date.parse(subscription.trialStartsAt)) context.addIssue({code:z.ZodIssueCode.custom,path:["trialEndsAt"],message:"Trial must end after it starts."});
});

export const paymentRecordSchema = z.object({
  id: z.string().regex(/^pay-[a-z0-9-]{1,50}$/),
  tenantId: z.string().min(1).max(120),
  subscriptionId: z.string().regex(/^sub-[a-z0-9-]{1,50}$/),
  amountMinor: z.number().int().positive(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  status: z.enum(paymentStatuses),
  providerReference: z.string().max(160).optional(),
  createdAt: z.string().datetime(),
}).strict();

export type Price = z.infer<typeof priceSchema>;
export type DiscountCode = z.infer<typeof discountCodeSchema>;
export type Subscription = z.infer<typeof subscriptionSchema>;
export type PaymentRecord = z.infer<typeof paymentRecordSchema>;

export function createTrialWindow(start: Date, durationDays = 14) {
  if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 90) throw new Error("Trial duration must be 1–90 whole days.");
  const end = new Date(start.getTime() + durationDays * 24 * 60 * 60 * 1000);
  return { startsAt: start.toISOString(), endsAt: end.toISOString(), durationDays };
}

export function getTrialState(trialEndsAt: string, now = new Date()) {
  const remainingMs = Date.parse(trialEndsAt) - now.getTime();
  if (!Number.isFinite(remainingMs)) return { status: "invalid" as const, daysRemaining: 0 };
  if (remainingMs <= 0) return { status: "ended" as const, daysRemaining: 0 };
  return { status: "trialing" as const, daysRemaining: Math.ceil(remainingMs / (24 * 60 * 60 * 1000)) };
}

export function validateDiscount(code: string, configuredCodes: DiscountCode[], amountMinor: number, currency: string, now = new Date()) {
  const normalized = code.trim().toUpperCase();
  const discount = configuredCodes.find((item) => item.code === normalized);
  if (!discount || !discount.active) return { valid: false as const, message: "This code is not active." };
  const timestamp = now.getTime();
  if (timestamp < Date.parse(discount.startsAt) || timestamp > Date.parse(discount.endsAt)) return { valid: false as const, message: "This code is outside its valid period." };
  if (discount.maxRedemptions !== undefined && discount.redemptionCount >= discount.maxRedemptions) return { valid: false as const, message: "This code has reached its redemption limit." };
  if (discount.kind === "fixed" && discount.currency !== currency) return { valid: false as const, message: "This code is not valid for the selected currency." };
  const reduction = discount.kind === "percent" ? Math.floor(amountMinor * discount.value / 100) : Math.min(amountMinor, Math.round(discount.value));
  return { valid: true as const, code: discount.code, discountMinor: reduction, totalMinor: Math.max(0, amountMinor - reduction) };
}
