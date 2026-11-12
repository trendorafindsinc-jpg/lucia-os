import type { Metadata } from "next";
import Link from "next/link";
import { ContentLibraryWorkspace } from "@/components/content/content-library-workspace";
import "./content.css";

export const metadata: Metadata = { title: "Blog and media library", description: "Prepare blog drafts and organise media for a LUCIA OS website." };

export default function ContentPage() {
  return <main className="content-shell">
    <header className="content-topbar"><Link className="wordmark" href="/"><span className="brand-mark" aria-hidden="true">L</span><span>LUCIA <span className="muted-word">OS</span></span></Link><div className="content-top-actions"><span className="content-local-pill">Local draft · Not saved</span><Link href="/pages" className="content-back-link">Pages &amp; navigation ↗</Link></div></header>
    <section className="content-intro"><p className="eyebrow">PHASE 11 · CONTENT</p><h1>Stories and media, organised.</h1><p>Draft blog posts, prepare featured images, and keep media details together. This workspace is a prototype: nothing is uploaded, saved to a server, or published yet.</p></section>
    <ContentLibraryWorkspace />
    <footer className="content-footer"><span>Content stays in this browser session.</span><span>No files uploaded · Nothing published</span></footer>
  </main>;
}
