import {describe,expect,it} from "vitest";
import {createTrialWindow,discountCodeSchema,getTrialState,priceSchema,subscriptionSchema,validateDiscount} from "./billing";
describe("trial windows",()=>{
 it("defaults to a 14-day window",()=>expect(createTrialWindow(new Date("2026-10-01T00:00:00.000Z"))).toEqual({startsAt:"2026-10-01T00:00:00.000Z",endsAt:"2026-10-15T00:00:00.000Z",durationDays:14}));
 it("rejects invalid durations",()=>expect(()=>createTrialWindow(new Date(),0)).toThrow());
 it("calculates remaining trial days safely",()=>expect(getTrialState("2026-10-15T00:00:00.000Z",new Date("2026-10-14T12:00:00.000Z"))).toEqual({status:"trialing",daysRemaining:1}));
 it("marks elapsed trials ended",()=>expect(getTrialState("2026-10-01T00:00:00.000Z",new Date("2026-10-02T00:00:00.000Z")).status).toBe("ended"));
});
describe("billing schemas",()=>{
 it("requires positive configured price amounts",()=>expect(priceSchema.safeParse({id:"price-monthly",planKey:"website",cadence:"monthly",currency:"NGN",amountMinor:0,active:true,effectiveFrom:"2026-10-01T00:00:00.000Z"}).success).toBe(false));
 it("rejects trial end before trial start",()=>expect(subscriptionSchema.safeParse({id:"sub-demo",tenantId:"tenant-a",productKey:"lucia_os",planKey:"website",cadence:"monthly",status:"trialing",trialStartsAt:"2026-10-15T00:00:00.000Z",trialEndsAt:"2026-10-01T00:00:00.000Z"}).success).toBe(false));
 it("normalizes discount codes and caps percentages",()=>{
  expect(discountCodeSchema.parse({code:" save10 ",kind:"percent",value:10,startsAt:"2026-10-01T00:00:00.000Z",endsAt:"2026-11-01T00:00:00.000Z",redemptionCount:0,active:true}).code).toBe("SAVE10");
  expect(discountCodeSchema.safeParse({code:"OVER",kind:"percent",value:120,startsAt:"2026-10-01T00:00:00.000Z",endsAt:"2026-11-01T00:00:00.000Z",redemptionCount:0,active:true}).success).toBe(false);
 });
 it("checks discount validity, currency and redemption cap",()=>{
  const code=discountCodeSchema.parse({code:"SAVE10",kind:"percent",value:10,startsAt:"2026-10-01T00:00:00.000Z",endsAt:"2026-11-01T00:00:00.000Z",maxRedemptions:2,redemptionCount:1,active:true});
  expect(validateDiscount("save10",[code],10000,"NGN",new Date("2026-10-18T00:00:00.000Z"))).toMatchObject({valid:true,discountMinor:1000,totalMinor:9000});
  expect(validateDiscount("save10",[code],10000,"NGN",new Date("2026-12-01T00:00:00.000Z")).valid).toBe(false);
  expect(validateDiscount("unknown",[code],10000,"NGN").valid).toBe(false);
 });
});
