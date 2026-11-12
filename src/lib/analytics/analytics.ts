import { z } from "zod";
export const analyticsEventNames = ["page_view", "cta_click", "form_start", "form_submit"] as const;
export type AnalyticsEventName = (typeof analyticsEventNames)[number];
export const analyticsEventSchema = z.object({
 id:z.string().regex(/^evt-[a-z0-9-]{1,60}$/), tenantId:z.string().min(1).max(120), websiteId:z.string().min(1).max(120),
 sessionId:z.string().regex(/^[a-zA-Z0-9_-]{8,100}$/), name:z.enum(analyticsEventNames),
 path:z.string().regex(/^\/(?:[a-zA-Z0-9/_-]*)$/).max(240), occurredAt:z.string().datetime(),
 conversionKey:z.string().regex(/^[a-z0-9_-]{1,60}$/).optional()
}).strict().superRefine((event,ctx)=>{
 if(event.name==="form_submit"&&!event.conversionKey)ctx.addIssue({code:z.ZodIssueCode.custom,path:["conversionKey"],message:"Form submissions need a conversion key."});
 if(event.name!=="form_submit"&&event.conversionKey)ctx.addIssue({code:z.ZodIssueCode.custom,path:["conversionKey"],message:"Conversion keys are only valid for form submissions."});
});
export type AnalyticsEvent=z.infer<typeof analyticsEventSchema>;
const inputSchema=z.object({tenantId:z.string().min(1).max(120),websiteId:z.string().min(1).max(120),sessionId:z.string().regex(/^[a-zA-Z0-9_-]{8,100}$/),name:z.enum(analyticsEventNames),path:z.string().regex(/^\/(?:[a-zA-Z0-9/_-]*)$/).max(240),occurredAt:z.string().datetime(),conversionKey:z.string().regex(/^[a-z0-9_-]{1,60}$/).optional()}).strict();
export function createAnalyticsEvent(input:z.input<typeof inputSchema>,id:string):AnalyticsEvent{return analyticsEventSchema.parse({...inputSchema.parse(input),id});}
export function summarizeAnalytics(events:AnalyticsEvent[]){
 const views=events.filter(e=>e.name==="page_view"), conversions=events.filter(e=>e.name==="form_submit");
 const pages=new Map<string,number>(); for(const e of views)pages.set(e.path,(pages.get(e.path)??0)+1);
 const sessions=new Set(views.map(e=>e.sessionId));
 return {pageViews:views.length,uniqueVisitors:sessions.size,conversions:conversions.length,conversionRate:sessions.size?Math.min(100,Number((new Set(conversions.map(e=>e.sessionId)).size/sessions.size*100).toFixed(1))):0,topPages:[...pages.entries()].map(([path,count])=>({path,views:count})).sort((a,b)=>b.views-a.views||a.path.localeCompare(b.path))};
}
