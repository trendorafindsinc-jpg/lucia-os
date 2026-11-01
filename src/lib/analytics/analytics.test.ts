import {describe,expect,it} from "vitest";
import {analyticsEventSchema,createAnalyticsEvent,summarizeAnalytics} from "./analytics";
const base={tenantId:"tenant-a",websiteId:"site-a",sessionId:"session_123456",path:"/",occurredAt:"2026-10-18T10:00:00.000Z"};
describe("analytics event contract",()=>{
 it("creates valid page views",()=>expect(createAnalyticsEvent({...base,name:"page_view"},"evt-view-1").name).toBe("page_view"));
 it("requires conversion keys only for form submissions",()=>{
  expect(analyticsEventSchema.safeParse({...base,id:"evt-submit-1",name:"form_submit"}).success).toBe(false);
  expect(analyticsEventSchema.safeParse({...base,id:"evt-view-1",name:"page_view",conversionKey:"contact"}).success).toBe(false);
 });
 it("rejects query strings and arbitrary URLs",()=>{
  expect(analyticsEventSchema.safeParse({...base,id:"evt-view-1",name:"page_view",path:"/?email=person@example.com"}).success).toBe(false);
  expect(analyticsEventSchema.safeParse({...base,id:"evt-view-2",name:"page_view",path:"https://example.com"}).success).toBe(false);
 });
});
describe("analytics summary",()=>{
 it("aggregates page views, distinct visitors, conversions and top pages",()=>{
  const events=[createAnalyticsEvent({...base,name:"page_view"},"evt-view-1"),createAnalyticsEvent({...base,name:"page_view"},"evt-view-2"),createAnalyticsEvent({...base,sessionId:"session_654321",name:"page_view",path:"/about"},"evt-view-3"),createAnalyticsEvent({...base,name:"form_submit",conversionKey:"contact"},"evt-submit-1")];
  expect(summarizeAnalytics(events)).toEqual({pageViews:3,uniqueVisitors:2,conversions:1,conversionRate:50,topPages:[{path:"/",views:2},{path:"/about",views:1}]});
 });
 it("handles empty data without inventing metrics",()=>expect(summarizeAnalytics([])).toMatchObject({pageViews:0,uniqueVisitors:0,conversions:0,conversionRate:0,topPages:[]}));
});
