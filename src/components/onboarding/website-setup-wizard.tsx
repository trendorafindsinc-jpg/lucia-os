"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getTemplateById, websiteTemplates } from "@/lib/templates/catalogue";
import { makeSiteSlug, organisationTypes, websiteGoals, websiteSetupSchema, type WebsiteSetup } from "@/lib/onboarding/website-setup";

const steps = ["Your organisation", "Your website", "Review setup"] as const;

export function WebsiteSetupWizard() {
  const [step, setStep] = useState(0);
  const [organisationName, setOrganisationName] = useState("");
  const [websiteName, setWebsiteName] = useState("");
  const [organisationType, setOrganisationType] = useState<(typeof organisationTypes)[number]>(organisationTypes[0]);
  const [goal, setGoal] = useState<(typeof websiteGoals)[number]>(websiteGoals[0]);
  const [templateId, setTemplateId] = useState("northstar-consulting");
  const [country, setCountry] = useState("Nigeria");
  const [siteSlug, setSiteSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    const requestedTemplate = new URLSearchParams(window.location.search).get("template");
    if (requestedTemplate && getTemplateById(requestedTemplate)) setTemplateId(requestedTemplate);
  }, []);

  useEffect(() => {
    if (!slugEdited) setSiteSlug(makeSiteSlug(websiteName));
  }, [websiteName, slugEdited]);

  const setup = useMemo(() => ({
    organisationName, websiteName, organisationType, goal, templateId, country, siteSlug,
  }), [organisationName, websiteName, organisationType, goal, templateId, country, siteSlug]);
  const validation = websiteSetupSchema.safeParse(setup);
  const template = getTemplateById(templateId);
  const fieldError = (field: keyof WebsiteSetup) => {
    if (!attempted || validation.success) return undefined;
    const issue = validation.error.issues.find((item) => item.path[0] === field);
    return issue?.message;
  };

  function nextStep() {
    setAttempted(true);
    if (step === 0 && (!organisationName.trim() || organisationName.trim().length < 2 || organisationName.length > 80)) return;
    if (step === 1 && !validation.success) return;
    setAttempted(false);
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  return (
    <main className="setup-page">
      <header className="setup-topbar">
        <Link className="wordmark" href="/" aria-label="LUCIA OS home"><span className="brand-mark" aria-hidden="true">L</span><span>LUCIA <span className="muted-word">OS</span></span></Link>
        <Link className="setup-back" href="/templates">Back to templates</Link>
      </header>
      <section className="setup-intro">
        <p className="eyebrow">PHASE 8 · GUIDED SETUP</p>
        <h1>Let’s build your<br /><span>starting point.</span></h1>
        <p>Tell us a little about your organisation. We’ll shape a website setup that fits your goals, without technical jargon.</p>
      </section>
      <section className="setup-card" aria-labelledby="setup-step-title">
        <nav className="setup-progress" aria-label="Setup progress">
          {steps.map((label, index) => <div key={label} className={index === step ? "setup-progress-step is-current" : index < step ? "setup-progress-step is-complete" : "setup-progress-step"}><span>{index < step ? "✓" : index + 1}</span><small>{label}</small></div>)}
        </nav>
        {submitted ? (
          <div className="setup-complete" role="status">
            <span className="setup-success-mark" aria-hidden="true">✓</span>
            <p className="eyebrow">SETUP SUMMARY READY</p>
            <h2 id="setup-step-title">Your starting point is planned.</h2>
            <p>Your choices are shown below. They have not been saved to an account yet; secure workspace creation and persistence will be connected after the LUCIA Core tenant-creation contract is available.</p>
            <div className="setup-summary">
              <div><span>Organisation</span><strong>{organisationName}</strong></div>
              <div><span>Website</span><strong>{websiteName}</strong></div>
              <div><span>Website address suggestion</span><strong>{siteSlug}.lucia.site</strong></div>
              <div><span>Template</span><strong>{template?.name}</strong></div>
              <div><span>Main goal</span><strong>{goal}</strong></div>
              <div><span>Country</span><strong>{country}</strong></div>
            </div>
            <div className="setup-actions"><button className="setup-button setup-button--primary" type="button" onClick={() => { setSubmitted(false); setStep(0); setAttempted(false); }}>Edit setup</button><Link className="setup-button setup-button--secondary" href="/templates">Browse other templates</Link></div>
          </div>
        ) : (
          <>
            <div className="setup-form-heading"><span>STEP 0{step + 1} OF 03</span><h2 id="setup-step-title">{steps[step]}</h2><p>{step === 0 ? "Start with the people and purpose behind your website." : step === 1 ? "Choose a look and how people should use your website." : "Check your choices before moving forward."}</p></div>
            {step === 0 && <div className="setup-fields">
              <label>Organisation name<input autoComplete="organization" value={organisationName} onChange={(event) => setOrganisationName(event.target.value)} placeholder="e.g. Bright Future Academy" maxLength={80} required />{attempted && organisationName.trim().length < 2 && <small className="setup-error">Enter an organisation name with at least 2 characters.</small>}</label>
              <label>What best describes you?<select value={organisationType} onChange={(event) => setOrganisationType(event.target.value as (typeof organisationTypes)[number])}>{organisationTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Country or region<input autoComplete="country-name" value={country} onChange={(event) => setCountry(event.target.value)} maxLength={56} required /></label>
            </div>}
            {step === 1 && <div className="setup-fields">
              <label>Website name<input value={websiteName} onChange={(event) => setWebsiteName(event.target.value)} placeholder="e.g. Bright Future Academy" maxLength={80} required />{fieldError("websiteName") && <small className="setup-error">{fieldError("websiteName")}</small>}</label>
              <label>What should your website help you do?<select value={goal} onChange={(event) => setGoal(event.target.value as (typeof websiteGoals)[number])}>{websiteGoals.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Choose a starting design<select value={templateId} onChange={(event) => setTemplateId(event.target.value)}>{websiteTemplates.map((item) => <option key={item.id} value={item.id}>{item.name} — {item.category}</option>)}</select></label>
              <label>Suggested website address<input value={siteSlug} onChange={(event) => { setSiteSlug(event.target.value.toLowerCase()); setSlugEdited(true); }} placeholder="your-organisation" maxLength={48} autoCapitalize="none" autoCorrect="off" required />{fieldError("siteSlug") && <small className="setup-error">{fieldError("siteSlug")}</small>}<small className="setup-help">Your suggested address: {siteSlug || "your-name"}.lucia.site. Availability will be checked when website creation is connected.</small></label>
              {template && <div className="setup-template-preview"><div style={{ background: template.colors[2] }}><span style={{ background: template.colors[0] }} /><span style={{ background: template.colors[1] }} /></div><section><span>{template.category} · {template.style}</span><strong>{template.name}</strong><p>{template.description}</p></section></div>}
              {attempted && !validation.success && <p className="setup-error setup-validation-summary">Please fix the highlighted fields before continuing.</p>}
            </div>}
            {step === 2 && <div className="setup-review">
              <p>Review the information below. You can go back and change any answer.</p>
              <div className="setup-summary">
                <div><span>Organisation</span><strong>{organisationName}</strong></div>
                <div><span>Type</span><strong>{organisationType}</strong></div>
                <div><span>Country / region</span><strong>{country}</strong></div>
                <div><span>Website name</span><strong>{websiteName}</strong></div>
                <div><span>Main goal</span><strong>{goal}</strong></div>
                <div><span>Address suggestion</span><strong>{siteSlug}.lucia.site</strong></div>
                <div><span>Starting design</span><strong>{template?.name}</strong></div>
                <div><span>Suggested sections</span><strong>{template?.sections.join(" · ")}</strong></div>
              </div>
              <p className="setup-notice"><strong>Not saved yet.</strong> This is a setup preview only. Account sign-in, workspace authorisation and durable website creation will be wired to the documented LUCIA Core contract before customer launch.</p>
            </div>}
            <div className="setup-actions">
              {step > 0 && <button className="setup-button setup-button--secondary" type="button" onClick={() => { setAttempted(false); setStep((current) => current - 1); }}>Back</button>}
              <span className="setup-actions-spacer" />
              {step < 2 ? <button className="setup-button setup-button--primary" type="button" onClick={nextStep}>Continue <span aria-hidden="true">→</span></button> : <button className="setup-button setup-button--primary" type="button" onClick={() => setSubmitted(true)} disabled={!validation.success}>Finish setup preview <span aria-hidden="true">✓</span></button>}
            </div>
          </>
        )}
      </section>
      <footer className="setup-footer"><span>Designed for non-technical teams.</span><span>Your setup stays in this browser session only.</span></footer>
    </main>
  );
}
