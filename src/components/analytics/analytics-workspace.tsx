"use client";
import Link from "next/link";
import {useMemo,useState} from "react";
import {createAnalyticsEvent,summarizeAnalytics,type AnalyticsEvent,type AnalyticsEventName} from "@/lib/analytics/analytics";
export function AnalyticsWorkspace(){
 const [events,setEvents]=useState<AnalyticsEvent[]>([]);
 const [status,setStatus]=useState("No tracking data connected. Metrics appear only after you record demo events.");
 const summary=useMemo(()=>summarizeAnalytics(events),[events]);
 function record(name:AnalyticsEventName,path="/",conversionKey?:string){
  const input={tenantId:"demo-tenant",websiteId:"demo-website",sessionId:"demo_session_0001",name,path,occurredAt:new Date().toISOString(),...(conversionKey?{conversionKey}:{})};
  setEvents(current=>[...current,createAnalyticsEvent(input,`evt-${Date.now().toString(36)}-${events.length.toString(36)}`)]);
  setStatus("Demo event recorded in this browser session only. Nothing was sent to a server.");
 }
 return <main className="analytics-shell">
  <header className="analytics-topbar"><Link href="/" className="analytics-brand">← LUCIA OS</Link><span className="analytics-state">Phase 16 · Analytics</span></header>
  <section className="analytics-hero"><p className="analytics-eyebrow">UNDERSTAND WHAT WORKS</p><h1>From visits<br/><span>to meaningful action.</span></h1><p>Measure page interest and conversion events without collecting names, email addresses, or query-string data. Real tenant-isolated tracking requires a connected production data pipeline.</p></section>
  <section className="analytics-notice" role="status"><span aria-hidden="true">ⓘ</span><div><strong>Prototype data only</strong><p>{status} This dashboard is not connected to live customer traffic.</p></div></section>
  <section className="analytics-actions"><div><p className="analytics-eyebrow">TRY THE EVENT FLOW</p><h2>Record a demo event</h2><p>Use the buttons to test aggregation. Refreshing clears sample events.</p></div><div className="analytics-buttons"><button type="button" onClick={()=>record("page_view","/")}>Record homepage view</button><button type="button" onClick={()=>record("page_view","/about")}>Record about-page view</button><button type="button" onClick={()=>record("form_submit","/","contact")}>Record contact conversion</button><button type="button" className="analytics-secondary" onClick={()=>{setEvents([]);setStatus("Demo events cleared. No live data was affected.");}}>Clear demo data</button></div></section>
  <section className="analytics-metrics" aria-label="Analytics summary"><article><span>Page views</span><strong>{summary.pageViews}</strong><small>Recorded demo events</small></article><article><span>Unique visitors</span><strong>{summary.uniqueVisitors}</strong><small>Distinct demo sessions with views</small></article><article><span>Conversions</span><strong>{summary.conversions}</strong><small>Contact form submissions</small></article><article><span>Conversion rate</span><strong>{summary.conversionRate}%</strong><small>Demo sessions converted</small></article></section>
  <section className="analytics-table-panel"><div className="analytics-panel-head"><div><p className="analytics-eyebrow">CONTENT PERFORMANCE</p><h2>Most viewed pages</h2></div><span>{summary.topPages.length} paths</span></div>
  {summary.topPages.length?<div className="analytics-table">{summary.topPages.map(page=><div className="analytics-table-row" key={page.path}><span>{page.path}</span><strong>{page.views} {page.views===1?"view":"views"}</strong><div className="analytics-bar"><span style={{width:`${page.views/summary.topPages[0].views*100}%`}}/></div></div>)}</div>:<div className="analytics-empty"><span aria-hidden="true">↗</span><h3>No analytics yet</h3><p>Real measurements appear only after an approved tracking endpoint and tenant-scoped storage are connected.</p></div>}</section>
  <footer className="analytics-footer"><span>Privacy-first event contract · No cookies or external analytics SDK added</span><span>Session-only prototype · Not live reporting</span></footer>
 </main>;
}
