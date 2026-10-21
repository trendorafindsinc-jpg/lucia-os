"use client";

import { useState } from "react";
import type { FormEvent } from "react";

type Website = { id: string; name: string; slug: string; status: string; organizationId: string; organizationName: string };
type Domain = { id: string; websiteId: string; hostname: string; domainType: string; status: string; isPrimary: boolean; createdAt: string | Date; organizationId: string; organizationName: string; websiteName: string; websiteStatus: string };
type Props = { websites: Website[]; domains: Domain[]; siteDomain: string; initialWebsiteId?: string };

function statusLabel(status: string) {
  return ({ active: "Live", verified: "Verified · awaiting activation", pending: "DNS verification needed", verifying: "Checking DNS", suspended: "Suspended", removed: "Removed" } as Record<string, string>)[status] || status;
}

export function DomainManagementClient({ websites, domains: initialDomains, siteDomain, initialWebsiteId }: Props) {
  const [domains, setDomains] = useState(initialDomains);
  const [websiteId, setWebsiteId] = useState(websites.some((website) => website.id === initialWebsiteId) ? initialWebsiteId! : (websites[0]?.id || ""));
  const [hostname, setHostname] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [verification, setVerification] = useState<{ domainId: string; hostname: string; recordName: string; recordValue: string } | null>(null);

  async function registerDomain(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!websiteId || busy) return;
    setBusy(true); setMessage(""); setVerification(null);
    try {
      const response = await fetch("/api/domains", { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify({ websiteId, hostname }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "The domain could not be registered.");
      setDomains((current) => [payload.domain, ...current.filter((domain) => domain.id !== payload.domain.id)]);
      setVerification(payload.verification);
      setHostname("");
      setMessage("Domain registered. Add the DNS TXT record below to prove ownership.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "The domain could not be registered."); }
    finally { setBusy(false); }
  }

  async function verifyDomain(domainId: string) {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/domains/verify", { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify({ domainId }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "DNS verification has not succeeded yet.");
      setDomains((current) => current.map((domain) => domain.id === domainId ? { ...domain, status: "verified" } : domain));
      setMessage("Domain ownership verified. It is not live yet; paid activation and domain/TLS activation must complete first.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "DNS verification has not succeeded yet."); }
    finally { setBusy(false); }
  }

  async function setPrimaryDomain(domainId: string) {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/domains/${encodeURIComponent(domainId)}`, { method: "PATCH", cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "The primary domain could not be changed.");
      const target = domains.find((domain) => domain.id === domainId);
      setDomains((current) => current.map((domain) => domain.websiteId === target?.websiteId ? { ...domain, isPrimary: domain.id === domainId } : domain));
      setMessage("Primary domain updated.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "The primary domain could not be changed."); }
    finally { setBusy(false); }
  }

  async function disconnectDomain(domainId: string) {
    if (busy || !window.confirm("Disconnect this custom domain? Its LUCIA subdomain will remain unchanged.")) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/domains/${encodeURIComponent(domainId)}`, { method: "DELETE", cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "The domain could not be disconnected.");
      setDomains((current) => current.filter((domain) => domain.id !== domainId));
      setVerification((current) => current?.domainId === domainId ? null : current);
      setMessage("Custom domain disconnected. Your LUCIA subdomain is unchanged.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "The domain could not be disconnected."); }
    finally { setBusy(false); }
  }

  return <>
    <section className="workspace-panel domains-addresses-panel">\n      <div className="workspace-panel-heading"><div><h2>LUCIA subdomains</h2><p>Every website has its own address. Publishing activates that exact hostname.</p></div><span className="workspace-count">{websites.length} websites</span></div>\n      {websites.length ? <div className="workspace-org-list">{websites.map((website) => { const subdomainIsLive = website.status === "published" && domains.some((domain) => domain.websiteId === website.id && domain.domainType === "lucia_subdomain" && domain.status === "active"); return <article className="workspace-org-card domains-card" key={website.id}><div className="workspace-org-avatar">L</div><div className="workspace-org-info"><h3>{website.slug}.{siteDomain}</h3><p>{website.name} · {website.organizationName}</p><div className="workspace-org-meta"><span>LUCIA subdomain</span><span>{subdomainIsLive ? "Published website" : "Publish to activate"}</span></div></div><span className={`workspace-status ${subdomainIsLive ? "workspace-status-success" : "workspace-status-neutral"}`}>{subdomainIsLive ? "Live" : "Not live"}</span><a className="workspace-button workspace-button-secondary domains-website-link" href={subdomainIsLive ? `https://${website.slug}.${siteDomain}` : `/publish?websiteId=${encodeURIComponent(website.id)}`} target={subdomainIsLive ? "_blank" : undefined} rel={subdomainIsLive ? "noreferrer" : undefined}>{subdomainIsLive ? "Open website ↗" : "Publish website"}</a></article>; })}</div> : <div className="workspace-empty"><h3>No websites yet</h3><p>Create a website to get its own LUCIA subdomain.</p><a className="workspace-button workspace-button-secondary" href="/create">Create a website</a></div>}\n    </section>\n\n    <section className="workspace-panel domains-register-panel">
      <div className="workspace-panel-heading"><div><h2>Register a domain</h2><p>Choose the website it belongs to. The same hostname cannot be registered twice.</p></div><span className="workspace-count">Custom domain</span></div>
      {websites.length ? <form className="domains-register-form" onSubmit={registerDomain}>
        <label>Website<select value={websiteId} onChange={(event) => setWebsiteId(event.target.value)} required>{websites.map((website) => <option key={website.id} value={website.id}>{website.name} · {website.organizationName}</option>)}</select></label>
        <label>Domain hostname<input value={hostname} onChange={(event) => setHostname(event.target.value)} placeholder="www.yourdomain.com" autoComplete="url" required maxLength={253} /></label>
        <button className="workspace-button workspace-button-primary" type="submit" disabled={busy}>{busy ? "Registering…" : "Register domain"}</button>
      </form> : <div className="workspace-empty"><h3>No websites available</h3><p>Create a website, or ask an organisation owner for website publishing permission.</p><a className="workspace-button workspace-button-secondary" href="/create">Create a website</a></div>}
      <p className="domains-note">Registration does not purchase or activate a domain. LUCIA OS records the hostname and gives you a DNS ownership check; activation remains a separate step.</p>
    </section>

    {verification ? <section className="workspace-panel domains-verification-panel" aria-live="polite">
      <div className="workspace-panel-heading"><div><h2>Verify {verification.hostname}</h2><p>Add this TXT record at your DNS provider, then return and check it.</p></div><span className="workspace-status workspace-status-neutral">Awaiting DNS</span></div>
      <dl className="domains-dns-record"><div><dt>Record type</dt><dd>TXT</dd></div><div><dt>Name / host</dt><dd><code>{verification.recordName}</code></dd></div><div><dt>Value</dt><dd><code>{verification.recordValue}</code></dd></div></dl>
      <button className="workspace-button workspace-button-secondary" type="button" disabled={busy} onClick={() => void verifyDomain(verification.domainId)}>{busy ? "Checking…" : "Verify DNS record"}</button>
      <p className="domains-note">DNS updates may take time to appear. Keep this value until verification succeeds.</p>
    </section> : null}

    <section className="workspace-panel domains-list-panel">
      <div className="workspace-panel-heading"><div><h2>Your registered domains</h2><p>Domain ownership and live status, grouped by the website you selected.</p></div><span className="workspace-count">{domains.length} total</span></div>
      {domains.length ? <div className="workspace-org-list">{domains.map((domain) => <article className="workspace-org-card domains-card" key={domain.id}>
        <div className="workspace-org-avatar">{domain.domainType === "custom" ? "↗" : "L"}</div>
        <div className="workspace-org-info"><h3>{domain.hostname}</h3><p>{domain.websiteName} · {domain.organizationName}</p><div className="workspace-org-meta"><span>{domain.domainType === "custom" ? "Custom domain" : "LUCIA subdomain"}</span>{domain.isPrimary ? <span>Primary</span> : null}</div></div>
        <span className={`workspace-status ${domain.status === "active" ? "workspace-status-success" : "workspace-status-neutral"}`}>{statusLabel(domain.status)}</span>
        {domain.domainType === "custom" && domain.status === "pending" ? <button className="workspace-button workspace-button-secondary domains-verify-button" type="button" disabled={busy} onClick={() => { setVerification(null); void verifyDomain(domain.id); }}>Check DNS</button> : null}
        {domain.status === "active" && !domain.isPrimary ? <button className="workspace-button workspace-button-secondary domains-verify-button" type="button" disabled={busy} onClick={() => void setPrimaryDomain(domain.id)}>Set primary</button> : null}
        {domain.domainType === "custom" ? <button className="workspace-button workspace-button-secondary domains-disconnect-button" type="button" disabled={busy} onClick={() => void disconnectDomain(domain.id)}>Disconnect</button> : null}
        {domain.domainType === "custom" && domain.status === "verified" ? <span className="domains-pending-note">Activation required before this domain can go live.</span> : null}
      </article>)}</div> : <div className="workspace-empty"><span className="workspace-empty-icon">⌘</span><h3>No registered domains yet</h3><p>Published websites receive their unique LUCIA subdomain automatically. Register a custom domain above when you’re ready.</p></div>}
    </section>
    {message ? <p className={`domains-feedback ${message.toLowerCase().includes("could not") || message.toLowerCase().includes("not succeeded") || message.toLowerCase().includes("not found") || message.toLowerCase().includes("does not match") || message.toLowerCase().includes("already") ? "domains-feedback-error" : ""}`} role="status">{message}</p> : null}
  </>;
}
