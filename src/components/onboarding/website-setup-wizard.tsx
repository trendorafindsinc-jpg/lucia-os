"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { websiteGoals } from "@/lib/onboarding/website-setup";
import { allCanonicalWebsiteLayouts, recommendWebsiteLayouts } from "@/lib/website-first/recommendations";
import { isPremiumStartingLayout, getStartingLayoutById, getLayoutPreviewHref } from "@/lib/templates/starting-layouts";

export function WebsiteSetupWizard({ userId }: { userId: string }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [purpose, setPurpose] = useState<(typeof websiteGoals)[number]>("Get enquiries or bookings");
  const [contact, setContact] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [subdomainCheck, setSubdomainCheck] = useState<{ state: string; message?: string } | null>(null);
  const [style, setStyle] = useState("No preference");
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const all = useMemo(() => allCanonicalWebsiteLayouts(), []);
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("template");
    if (requested && getStartingLayoutById(requested)) setSelected(requested);
  }, []);
  const recommended = useMemo(() => recommendWebsiteLayouts(description, purpose, style), [description, purpose, style]);
  const chosenId = selected || recommended[0]?.id || "";
  const suggestedSubdomain = name.trim().toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 63).replace(/-+$/g, "");
  const subdomainValue = (subdomain || suggestedSubdomain).toLowerCase();
  const candidates = showAll ? all : recommended;
  const valid = name.trim().length >= 2 && description.trim().length >= 2 &&
    Boolean(getStartingLayoutById(chosenId)) && subdomainCheck?.state === "available";

  async function checkSubdomain() {
    if (!subdomainValue) {
      setSubdomainCheck({ state: "invalid", message: "Enter a website name to suggest an address." });
      return;
    }
    setSubdomainCheck({ state: "checking", message: "Checking availability…" });
    try {
      const response = await fetch("/api/websites/new/domains?subdomain=" + encodeURIComponent(subdomainValue), { cache: "no-store" });
      const data = await response.json() as { available?: boolean; state?: string; message?: string };
      setSubdomainCheck({ state: data.state || "unavailable", message: data.available ? "Available — " + subdomainValue + ".lucia.name.ng" : data.message || (data.state === "taken" ? "That address is already taken." : "This address cannot be used.") });
    } catch {
      setSubdomainCheck({ state: "unavailable", message: "Availability could not be checked. Try again before creating your website." });
    }
  }

  async function createWebsite() {
    if (!valid || saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/onboarding/website", {
        method: "POST",
        headers: { "content-type": "application/json", "x-lucia-workspace-account": userId },
        body: JSON.stringify({
          kind: "website-first", websiteName: name.trim(), whatDoYouDo: description.trim(),
          purpose, contact: contact.trim(), style, layoutId: chosenId, subdomain: subdomainValue,
        }),
      });
      const data = (await response.json()) as { website?: { id: string }; error?: string; requestId?: string };
      if (!response.ok || !data.website?.id) {
        setError(data.requestId ? `${data.error || "Website could not be created. Your answers are still here."} Reference: ${data.requestId}` : data.error || "Website could not be created. Your answers are still here.");
        return;
      }
      window.location.assign("/editor?websiteId=" + encodeURIComponent(data.website.id));
    } catch {
      setError("Connection interrupted. Your answers remain here; retry safely when online.");
    } finally {
      setSaving(false);
    }
  }

  return <main className="website-first">
    <header className="website-first-top"><Link href="/workspace/websites">← Your websites</Link><span>LUCIA OS · Layout Studio</span></header>
    <div className="website-first-heading"><p className="website-first-eyebrow">CREATE NEW WEBSITE</p>
      <h1>Tell us what you want to create.</h1>
      <p>Choose your website details and free LUCIA address, then select a real website design. No technical setup required.</p></div>
    <section className="website-first-form" aria-label="Website details">
      <label><span>1. What is the name of your business or website? <b>*</b></span>
        <input required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Riverside Barbers" autoComplete="organization"/></label>
      <label><span>2. What do you do? <b>*</b></span>
        <input required minLength={2} maxLength={160} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Haircuts and grooming for local customers"/></label>
      <label><span>3. What is the main purpose of your website? <b>*</b></span>
        <select value={purpose} onChange={(e) => setPurpose(e.target.value as (typeof websiteGoals)[number])}>
          {websiteGoals.map((goal) => <option key={goal} value={goal}>{goal}</option>)}</select></label>
      <label><span>4. Choose your free LUCIA website address</span>
        <div className="website-first-subdomain-input"><input required minLength={3} maxLength={63} value={subdomainValue} onChange={(e) => { setSubdomain(e.target.value); setSubdomainCheck(null); }} placeholder="your-business-name" autoComplete="off"/><span>.lucia.name.ng</span></div>
        <button type="button" onClick={() => void checkSubdomain()} disabled={!subdomainValue || subdomainCheck?.state === "checking"}>Check availability</button>
        {subdomainCheck?.message && <p role="status" className="website-first-subdomain-status">{subdomainCheck.message}</p>}
      </label>
      <details className="website-first-optional"><summary>Optional: contact details and preferred style</summary>
        <div className="website-first-optional-fields">
          <label><span>5. How should people contact you?</span><input maxLength={254} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Email address or telephone number"/></label>
          <label><span>5. Do you have a preferred style?</span><select value={style} onChange={(e) => setStyle(e.target.value)}>
            {["No preference", "Modern", "Classic", "Bold", "Warm"].map((value) => <option key={value}>{value}</option>)}</select></label>
        </div>
      </details>
    </section>
    {selected && !isPremiumStartingLayout(selected) && <p role="status">
      Your earlier registered design is selected. It will open in the compatible classic website editor.
      <button type="button" onClick={() => setSelected("")}>Choose a premium Layout instead</button>
    </p>}
    <section className="website-first-results" aria-labelledby="recommended-layouts">
      <div className="website-first-heading-row"><div><p className="website-first-eyebrow">YOUR DESIGNS</p>
        <h2 id="recommended-layouts">{showAll ? "All 48 premium Layouts" : "Three designs to start with"}</h2>
        <p>Preview the registered pages before creating. You can change content after selection.</p></div>
        <button type="button" onClick={() => setShowAll((current) => !current)}>{showAll ? "Show recommended" : "View all 48 Layouts"}</button>
      </div>
      <div className="website-first-grid">
        {candidates.map((layout) => <article key={layout.id} className={"website-first-layout" + (chosenId === layout.id ? " selected" : "")}>
          <div className="website-first-layout-art">
            <iframe title={layout.name + " actual website preview"} src={"/templates/thumbnail/" + layout.id}
              loading="lazy" sandbox="" tabIndex={-1} />
          </div>
          <div className="website-first-layout-description"><h3>{layout.name}</h3><p>{("reason" in layout && typeof layout.reason === "string") ? layout.reason : layout.description}</p>
            <div className="website-first-layout-actions">
              <a href={getLayoutPreviewHref(layout.id)} target="_blank" rel="noopener noreferrer">Preview actual pages</a>
              <button type="button" aria-pressed={chosenId === layout.id} onClick={() => setSelected(layout.id)}>
                {chosenId === layout.id ? "Selected ✓" : "Choose Layout"}</button>
            </div></div>
        </article>)}
      </div>
    </section>
    <footer className="website-first-action">
      <div><strong>{valid ? "Ready to create your website" : "Complete the required questions to continue"}</strong>
        <p>Your free address is reserved with this private draft. It becomes public when you publish.</p>
        {error && <p role="alert" className="website-first-error">{error}</p>}</div>
      <button type="button" disabled={!valid || saving} onClick={createWebsite}>{saving ? "Creating website…" : "Create website & edit →"}</button>
    </footer>
  </main>;
}
