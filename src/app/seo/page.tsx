import type { Metadata } from "next";
import Link from "next/link";
import { SeoWorkspace } from "@/components/seo/seo-workspace";
import "./seo.css";

export const metadata: Metadata = { title: "SEO and social sharing", description: "Prepare search snippets, canonical URLs, indexing preferences, and social preview metadata." };

export default function SeoPage() {
  return <main className="seo-shell">
    <header className="seo-topbar"><Link className="wordmark" href="/"><span className="brand-mark" aria-hidden="true">L</span><span>LUCIA <span className="muted-word">OS</span></span></Link><div className="seo-top-actions"><span className="seo-local-pill">Local draft · Not saved</span><Link href="/content" className="seo-back-link">Blog &amp; media ↗</Link></div></header>
    <section className="seo-intro"><p className="eyebrow">PHASE 12 · DISCOVERABILITY</p><h1>Help the right people find you.</h1><p>Shape how a page appears in search results and when it is shared. Checks offer practical guidance, not a guarantee of rankings or how search platforms will display your page.</p></section>
    <SeoWorkspace />
    <footer className="seo-footer"><span>Metadata preview only · Nothing is published</span><span>Search engines control final display and indexing.</span></footer>
  </main>;
}
