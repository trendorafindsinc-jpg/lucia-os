"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { layoutBlueprintSchema, type LayoutBlueprint } from "@/lib/layout-blueprint/blueprint";
import { LayoutRenderer } from "@/components/layout-studio/layout-renderer";

type WebsiteOption = { id: string; name: string };

export function LoomifyAIWorkspace({ websites, initialWebsiteId = "" }: { websites: WebsiteOption[]; initialWebsiteId?: string }) {
  const router = useRouter();
  const [websiteId, setWebsiteId] = useState(initialWebsiteId);
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState<LayoutBlueprint | null>(null);
  const [error, setError] = useState("");
  const selectedWebsite = websites.find((website) => website.id === websiteId);

  async function createProposal() {
    if (!websiteId) { setError("Choose one of your saved websites first."); return; }
    if (brief.trim().length < 20) { setError("Describe your website in at least 20 characters."); return; }
    setBusy(true);
    setError("");
    setProposal(null);
    try {
      const response = await fetch("/api/loomify-ai/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ websiteId, brief: brief.trim() }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        const message = typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
          ? data.error : "loomifyAI couldn't create a proposal. Your draft is unchanged.";
        throw new Error(message);
      }
      const candidate = typeof data === "object" && data !== null && "proposal" in data ? data.proposal : null;
      const checked = layoutBlueprintSchema.safeParse(candidate);
      if (!checked.success) throw new Error("The proposal did not pass LUCIA's validation checks. Your draft is unchanged.");
      setProposal(checked.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "loomifyAI is temporarily unavailable. Your draft is unchanged.");
    } finally {
      setBusy(false);
    }
  }

  function sendToLayoutStudio() {
    if (!proposal || !selectedWebsite) return;
    try {
      sessionStorage.setItem("lucia.loomify.pending-proposal.v1", JSON.stringify({ websiteId, proposal }));
      router.push((`/editor?websiteId=${encodeURIComponent(websiteId)}&loomifyProposal=1`) as Parameters<typeof router.push>[0]);
    } catch {
      setError("This browser couldn't transfer the proposal safely. Your website draft is unchanged.");
    }
  }

  return (
    <main className="loomify-workspace">
      <header className="loomify-workspace-header">
        <Link href="/workspace" className="loomify-brand"><span aria-hidden="true">✳</span><span>LUCIA OS <small>loomifyAI</small></span></Link>
        <nav aria-label="loomifyAI navigation"><Link href="/workspace">Workspace</Link><Link href="/workspace/websites">Websites</Link><Link href="/templates">Layouts</Link></nav>
      </header>
      <section className="loomify-workspace-intro">
        <p className="loomify-workspace-kicker">AI DESIGN WORKSPACE</p>
        <h1>Imagine it. Shape it.</h1>
        <p>Describe what you need and review a design proposal before sending it to Layout Studio. Your website draft and live site stay unchanged until you apply the proposal there.</p>
      </section>
      <section className="loomify-workspace-panel" aria-labelledby="loomify-brief-title">
        <label htmlFor="loomify-website">Website to work on</label>
        <select id="loomify-website" value={websiteId} onChange={(event) => { setWebsiteId(event.target.value); setProposal(null); setError(""); }}>
          <option value="">Choose a saved website</option>
          {websites.map((website) => <option key={website.id} value={website.id}>{website.name}</option>)}
        </select>
        <label htmlFor="loomify-brief"><span id="loomify-brief-title">What should your website do?</span></label>
        <textarea id="loomify-brief" value={brief} maxLength={4000} rows={5} onChange={(event) => setBrief(event.target.value)} placeholder="E.g. A calm, premium website for a Lagos architecture studio, with a strong portfolio, services and a clear enquiry path…" />
        <div className="loomify-workspace-actions"><span>{brief.length.toLocaleString()}/4,000 characters</span><button type="button" onClick={createProposal} disabled={busy || !websiteId || brief.trim().length < 20}>{busy ? "Creating proposal…" : "Create proposal ↗"}</button></div>
        <p className="loomify-workspace-help">{!websites.length ? "No saved websites are available to this account yet. Create a website first." : !websiteId ? "Choose a website so access can be checked before a proposal is generated." : brief.trim().length < 20 ? "Enter at least 20 characters to create a proposal." : "The proposal is private and is not saved or published automatically."}</p>
        {error && <p className="loomify-workspace-error" role="alert">{error}</p>}
      </section>
      {proposal && <section className="loomify-workspace-proposal" aria-labelledby="loomify-proposal-title">
        <div className="loomify-workspace-proposal-heading"><div><p className="loomify-workspace-kicker">PROPOSAL PREVIEW</p><h2 id="loomify-proposal-title">{proposal.site.name}</h2><p>{selectedWebsite ? `For ${selectedWebsite.name}` : "Private design proposal"} · Not applied</p></div><button type="button" onClick={() => setProposal(null)} aria-label="Dismiss proposal">×</button></div>
        <div className="loomify-workspace-preview"><LayoutRenderer blueprint={proposal} preview /></div>
        <div className="loomify-workspace-proposal-footer"><p>Choose “Apply to Layout Studio” to review this proposal alongside your existing draft. It will not overwrite anything until you confirm the next step in Layout Studio.</p><button type="button" onClick={sendToLayoutStudio} disabled={!selectedWebsite}>Apply to Layout Studio</button></div>
      </section>}
    </main>
  );
}
