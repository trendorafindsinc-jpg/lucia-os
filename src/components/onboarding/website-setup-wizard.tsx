"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { websiteGoals } from "@/lib/onboarding/website-setup";
import { allCanonicalWebsiteLayouts, recommendWebsiteLayouts } from "@/lib/website-first/recommendations";
import { isPremiumStartingLayout, getLayoutPreviewHref } from "@/lib/templates/starting-layouts";

export function WebsiteSetupWizard({ userId }: { userId: string }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [purpose, setPurpose] = useState<(typeof websiteGoals)[number]>("Get enquiries or bookings");
  const [contact, setContact] = useState("");
  const [style, setStyle] = useState("No preference");
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const all = useMemo(() => allCanonicalWebsiteLayouts(), []);
  const recommended = useMemo(() => recommendWebsiteLayouts(description, purpose, style), [description, purpose, style]);
  const chosenId = selected || recommended[0]?.id || "";
  const candidates = showAll ? all : recommended;
  const valid = name.trim().length >= 2 && description.trim().length >= 2 &&
    isPremiumStartingLayout(chosenId);

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
          purpose, contact: contact.trim(), style, layoutId: chosenId,
        }),
      });
      const data = (await response.json()) as { website?: { id: string }; error?: string };
      if (!response.ok || !data.website?.id) {
        setError(data.error || "Website could not be created. Your answers are still here.");
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
      <p>Three answers, then choose a real website design. No technical setup required.</p></div>
    <section className="website-first-form" aria-label="Website details">
      <label><span>1. What is the name of your business or website? <b>*</b></span>
        <input required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Riverside Barbers" autoComplete="organization"/></label>
      <label><span>2. What do you do? <b>*</b></span>
        <input required minLength={2} maxLength={160} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Haircuts and grooming for local customers"/></label>
      <label><span>3. What is the main purpose of your website? <b>*</b></span>
        <select value={purpose} onChange={(e) => setPurpose(e.target.value as (typeof websiteGoals)[number])}>
          {websiteGoals.map((goal) => <option key={goal} value={goal}>{goal}</option>)}</select></label>
      <details className="website-first-optional"><summary>Optional: contact details and preferred style</summary>
        <div className="website-first-optional-fields">
          <label><span>4. How should people contact you?</span><input maxLength={254} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Email address or telephone number"/></label>
          <label><span>5. Do you have a preferred style?</span><select value={style} onChange={(e) => setStyle(e.target.value)}>
            {["No preference", "Modern", "Classic", "Bold", "Warm"].map((value) => <option key={value}>{value}</option>)}</select></label>
        </div>
      </details>
    </section>
    <section className="website-first-results" aria-labelledby="recommended-layouts">
      <div className="website-first-heading-row"><div><p className="website-first-eyebrow">YOUR DESIGNS</p>
        <h2 id="recommended-layouts">{showAll ? "All 48 premium Layouts" : "Three designs to start with"}</h2>
        <p>Preview the registered pages before creating. You can change content after selection.</p></div>
        <button type="button" onClick={() => setShowAll((current) => !current)}>{showAll ? "Show recommended" : "View all 48 Layouts"}</button>
      </div>
      <div className="website-first-grid">
        {candidates.map((layout) => <article key={layout.id} className={"website-first-layout" + (chosenId === layout.id ? " selected" : "")}>
          <div className="website-first-layout-art" style={{ background: layout.colors[2] }} aria-hidden="true">
            <div style={{ background: layout.colors[0] }} /><strong style={{ color: layout.colors[0] }}>{layout.name}</strong><i style={{ background: layout.colors[1] }}/><small style={{ color: layout.colors[0] }}>{layout.category}</small>
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
        <p>This creates a private saved draft. It will not publish until you choose Publish.</p>
        {error && <p role="alert" className="website-first-error">{error}</p>}</div>
      <button type="button" disabled={!valid || saving} onClick={createWebsite}>{saving ? "Creating website…" : "Create website & edit →"}</button>
    </footer>
  </main>;
}
