import { describe, expect, it } from "vitest";
import { calculateCartTotals } from "./totals";
const line = { productId:"p1", name:"Shirt", sku:"SHIRT-1", quantity:2, unitAmountMinor:125000, currency:"NGN" };
describe("calculateCartTotals", () => {
 it("calculates server-side integer minor-unit totals", () => expect(calculateCartTotals([line])).toMatchObject({currency:"NGN",subtotalMinor:250000,itemCount:2,lines:[{lineTotalMinor:250000}]}));
 it("rejects empty, mixed currency, invalid quantity and unsafe money", () => {
  expect(()=>calculateCartTotals([])).toThrow("Cart is empty");
  expect(()=>calculateCartTotals([line,{...line,productId:"p2",currency:"USD"}])).toThrow("mixed-currency");
  expect(()=>calculateCartTotals([{...line,quantity:0}])).toThrow("quantity");
  expect(()=>calculateCartTotals([{...line,unitAmountMinor:Number.MAX_SAFE_INTEGER}])).toThrow("line total");
 });
});
