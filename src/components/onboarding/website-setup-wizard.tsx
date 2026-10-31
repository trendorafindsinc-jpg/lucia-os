"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getStartingLayoutById as getTemplateById, startingWebsiteDesigns as websiteTemplates } from "@/lib/templates/starting-layouts";
import {
  makeSiteSlug,
  organisationTypes,
  websiteGoals,
  websiteSetupSchema,
  websiteSetupRecoverySchema,
  type WebsiteSetup,
} from "@/lib/onboarding/website-setup";
import { getPreferredTemplateId } from "@/lib/templates/navigation";

const steps = ["Your organisation", "Your website", "Review setup"] as const;

export function WebsiteSetupWizard({ userId }: { userId: string }) {
  const storageKey = `lucia-os:website-setup:v2:${userId}`;
  const [storageNotice, setStorageNotice] = useState("");
  const [step, setStep] = useState(0);
  const [organisationName, setOrganisationName] = useState("");
  const [websiteName, setWebsiteName] = useState("");
  const [organisationType, setOrganisationType] = useState<
    (typeof organisationTypes)[number]
  >(organisationTypes[0]);
  const [goal, setGoal] = useState<(typeof websiteGoals)[number]>(
    websiteGoals[0],
  );
  const [templateId, setTemplateId] = useState("northstar-consulting");
  const [country, setCountry] = useState("Nigeria");
  const [siteSlug, setSiteSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedWebsite, setSavedWebsite] = useState<{
    id: string;
    name: string;
    slug: string;
  } | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);

  useEffect(() => {
    if (!slugEdited) setSiteSlug(makeSiteSlug(websiteName));
  }, [websiteName, slugEdited]);

  const setup = useMemo(
    () => ({
      organisationName,
      websiteName,
      organisationType,
      goal,
      templateId,
      country,
      siteSlug,
    }),
    [
      organisationName,
      websiteName,
      organisationType,
      goal,
      templateId,
      country,
      siteSlug,
    ],
  );
  useEffect(() => {
    let restoredTemplateId = "northstar-consulting";
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      if (raw) {
        const parsed =
          raw.length <= 8192
            ? websiteSetupRecoverySchema.safeParse(JSON.parse(raw))
            : null;
        if (parsed?.success) {
          setOrganisationName(parsed.data.organisationName);
          setWebsiteName(parsed.data.websiteName);
          setOrganisationType(parsed.data.organisationType);
          setGoal(parsed.data.goal);
          restoredTemplateId = parsed.data.templateId;
          setTemplateId(parsed.data.templateId);
          setCountry(parsed.data.country);
          setSiteSlug(parsed.data.siteSlug);
          setSlugEdited(true);
        }
      }
      // A template selected from Loom Library must win over an older saved setup draft.
      const requestedTemplate = new URLSearchParams(window.location.search).get(
        "template",
      );
      setTemplateId(
        getPreferredTemplateId(requestedTemplate, restoredTemplateId, (id) =>
          Boolean(getTemplateById(id)),
        ),
      );
    } catch {
      setStorageNotice(
        "Browser recovery is unavailable. Keep this page open until the project is saved.",
      );
    } finally {
      setDraftLoaded(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (draftLoaded && !submitted) {
      try {
        window.sessionStorage.setItem(storageKey, JSON.stringify(setup));
      } catch {
        setStorageNotice(
          "Browser recovery is unavailable. Keep this page open until the project is saved.",
        );
      }
    }
  }, [draftLoaded, setup, submitted, storageKey]);

  const validation = websiteSetupSchema.safeParse(setup);
  const template = getTemplateById(templateId);
  const fieldError = (field: keyof WebsiteSetup) => {
    if (!attempted || validation.success) return undefined;
    const issue = validation.error.issues.find(
      (item) => item.path[0] === field,
    );
    return issue?.message;
  };

  async function saveSetup() {
    if (!validation.success || saving) return;
    setSaving(true);
    setSaveError("");
    try {
      const response = await fetch("/api/onboarding/website", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-LUCIA-Workspace-Account": userId,
        },
        body: JSON.stringify(setup),
      });
      const payload = (await response.json()) as {
        error?: string;
        website?: { id: string; name: string; slug: string };
      };
      if (response.status === 401) {
        setSaveError(
          "Your session expired. Sign in again; cached setup choices remain scoped to this account.",
        );
        return;
      }
      if (!response.ok || !payload.website) {
        setSaveError(
          payload.error ?? "We couldn’t save your setup. Please try again.",
        );
        return;
      }
      setSavedWebsite(payload.website);
      try {
        window.sessionStorage.removeItem(storageKey);
      } catch {
        /* A local cache failure must not turn a committed project into a failed save. */
      }
      setSubmitted(true);
    } catch {
      setSaveError(
        "We couldn’t reach LUCIA OS. Check your connection and try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  function nextStep() {
    setAttempted(true);
    if (
      step === 0 &&
      (!organisationName.trim() ||
        organisationName.trim().length < 2 ||
        organisationName.length > 80)
    )
      return;
    if (step === 1 && !validation.success) return;
    setAttempted(false);
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  return (
    <main className="setup-page">
      <header className="setup-topbar">
        <Link className="wordmark" href="/" aria-label="LUCIA OS home">
          <span className="brand-mark" aria-hidden="true">
            L
          </span>
          <span>
            LUCIA <span className="muted-word">OS</span>
          </span>
        </Link>
        <Link className="setup-back" href="/templates">
          Back to Layouts
        </Link>
      </header>
      <section className="setup-intro">
        <p className="eyebrow">WEBSITE SETUP</p>
        <h1>
          Let’s build your
          <br />
          <span>starting point.</span>
        </h1>
        <p>
          Tell us a little about your organisation. We’ll shape a website setup
          that fits your goals, without technical jargon.
        </p>
      </section>
      {storageNotice && <p role="status">{storageNotice}</p>}
      <section className="setup-card" aria-labelledby="setup-step-title">
        <nav className="setup-progress" aria-label="Setup progress">
          {steps.map((label, index) => (
            <div
              key={label}
              className={
                index === step
                  ? "setup-progress-step is-current"
                  : index < step
                    ? "setup-progress-step is-complete"
                    : "setup-progress-step"
              }
            >
              <span>{index < step ? "✓" : index + 1}</span>
              <small>{label}</small>
            </div>
          ))}
        </nav>
        {submitted ? (
          <div className="setup-complete" role="status">
            <span className="setup-success-mark" aria-hidden="true">
              ✓
            </span>
            <p className="eyebrow">SETUP SUMMARY READY</p>
            <h2 id="setup-step-title">Your starting point is planned.</h2>
            <p>
              Your organisation workspace and draft website have been saved to
              LUCIA OS. Your website is still a draft and has not been
              published.
            </p>
            <div className="setup-summary">
              <div>
                <span>Organisation</span>
                <strong>{organisationName}</strong>
              </div>
              <div>
                <span>Website</span>
                <strong>{websiteName}</strong>
              </div>
              <div>
                <span>Website address</span>
                <strong>
                  {savedWebsite
                    ? `${savedWebsite.slug}.lucia.name.ng`
                    : `${siteSlug}.lucia.name.ng`}
                </strong>
              </div>
              <div>
                <span>Layout</span>
                <strong>{template?.name}</strong>
              </div>
              {savedWebsite && (
                <div>
                  <span>Saved website</span>
                  <strong>{savedWebsite.name}</strong>
                </div>
              )}
              <div>
                <span>Status</span>
                <strong>Draft — not published</strong>
              </div>
              <div>
                <span>Main goal</span>
                <strong>{goal}</strong>
              </div>
              <div>
                <span>Country</span>
                <strong>{country}</strong>
              </div>
            </div>
            <div className="setup-actions">
              {savedWebsite && (
                <Link
                  className="setup-button setup-button--primary"
                  href={`/editor?websiteId=${encodeURIComponent(savedWebsite.id)}`}
                >
                  Open Layout Studio
                </Link>
              )}
              <Link
                className="setup-button setup-button--secondary"
                href="/workspace/websites"
              >
                Open saved websites
              </Link>
              <button
                className="setup-button setup-button--secondary"
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setStep(0);
                  setAttempted(false);
                }}
              >
                Edit setup
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="setup-form-heading">
              <span>STEP 0{step + 1} OF 03</span>
              <h2 id="setup-step-title">{steps[step]}</h2>
              <p>
                {step === 0
                  ? "Start with the people and purpose behind your website."
                  : step === 1
                    ? "Choose a look and how people should use your website."
                    : "Check your choices before moving forward."}
              </p>
            </div>
            {step === 0 && (
              <div className="setup-fields">
                <label>
                  Organisation name
                  <input
                    autoComplete="organization"
                    value={organisationName}
                    onChange={(event) =>
                      setOrganisationName(event.target.value)
                    }
                    placeholder="e.g. Bright Future Academy"
                    maxLength={80}
                    required
                  />
                  {attempted && organisationName.trim().length < 2 && (
                    <small className="setup-error">
                      Enter an organisation name with at least 2 characters.
                    </small>
                  )}
                </label>
                <label>
                  What best describes you?
                  <select
                    value={organisationType}
                    onChange={(event) =>
                      setOrganisationType(
                        event.target
                          .value as (typeof organisationTypes)[number],
                      )
                    }
                  >
                    {organisationTypes.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Country or region
                  <input
                    autoComplete="country-name"
                    value={country}
                    onChange={(event) => setCountry(event.target.value)}
                    maxLength={56}
                    required
                  />
                </label>
              </div>
            )}
            {step === 1 && (
              <div className="setup-fields">
                <label>
                  Website name
                  <input
                    value={websiteName}
                    onChange={(event) => setWebsiteName(event.target.value)}
                    placeholder="e.g. Bright Future Academy"
                    maxLength={80}
                    required
                  />
                  {fieldError("websiteName") && (
                    <small className="setup-error">
                      {fieldError("websiteName")}
                    </small>
                  )}
                </label>
                <label>
                  What should your website help you do?
                  <select
                    value={goal}
                    onChange={(event) =>
                      setGoal(
                        event.target.value as (typeof websiteGoals)[number],
                      )
                    }
                  >
                    {websiteGoals.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Choose a starting design
                  <select
                    value={templateId}
                    onChange={(event) => setTemplateId(event.target.value)}
                  >
                    {websiteTemplates.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} — {item.category}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Suggested website address
                  <input
                    value={siteSlug}
                    onChange={(event) => {
                      setSiteSlug(event.target.value.toLowerCase());
                      setSlugEdited(true);
                    }}
                    placeholder="your-organisation"
                    maxLength={48}
                    autoCapitalize="none"
                    autoCorrect="off"
                    required
                  />
                  {fieldError("siteSlug") && (
                    <small className="setup-error">
                      {fieldError("siteSlug")}
                    </small>
                  )}
                  <small className="setup-help">
                    Your suggested address: {siteSlug || "your-name"}
                    .lucia.name.ng. This is a draft suggestion. The server
                    confirms availability when publishing.
                  </small>
                </label>
                {template && (
                  <div className="setup-template-preview">
                    <div style={{ background: template.colors[2] }}>
                      <span style={{ background: template.colors[0] }} />
                      <span style={{ background: template.colors[1] }} />
                    </div>
                    <section>
                      <span>
                        {template.category} · {template.style}
                      </span>
                      <strong>{template.name}</strong>
                      <p>{template.description}</p>
                    </section>
                  </div>
                )}
                {attempted && !validation.success && (
                  <p className="setup-error setup-validation-summary">
                    Please fix the highlighted fields before continuing.
                  </p>
                )}
              </div>
            )}
            {step === 2 && (
              <div className="setup-review">
                <p>
                  Review the information below. You can go back and change any
                  answer.
                </p>
                <div className="setup-summary">
                  <div>
                    <span>Organisation</span>
                    <strong>{organisationName}</strong>
                  </div>
                  <div>
                    <span>Type</span>
                    <strong>{organisationType}</strong>
                  </div>
                  <div>
                    <span>Country / region</span>
                    <strong>{country}</strong>
                  </div>
                  <div>
                    <span>Website name</span>
                    <strong>{websiteName}</strong>
                  </div>
                  <div>
                    <span>Main goal</span>
                    <strong>{goal}</strong>
                  </div>
                  <div>
                    <span>Address suggestion</span>
                    <strong>{siteSlug}.lucia.name.ng</strong>
                  </div>
                  <div>
                    <span>Starting design</span>
                    <strong>{template?.name}</strong>
                  </div>
                  <div>
                    <span>Suggested sections</span>
                    <strong>{template?.sections.join(" · ")}</strong>
                  </div>
                </div>
                <p className="setup-notice">
                  <strong>Ready to save.</strong> You must sign in with LUCIA
                  ID. Saving creates an authorized website draft. Existing
                  organization roles stay unchanged; this does not publish the
                  website.
                </p>
              </div>
            )}
            {saveError && (
              <div className="setup-error" role="alert">
                {saveError}{" "}
                {saveError.startsWith("Sign in") && (
                  <Link href="/api/auth/login?returnTo=%2Fcreate">
                    Sign in with LUCIA ID
                  </Link>
                )}
              </div>
            )}
            <div className="setup-actions">
              {step > 0 && (
                <button
                  className="setup-button setup-button--secondary"
                  type="button"
                  onClick={() => {
                    setAttempted(false);
                    setStep((current) => current - 1);
                  }}
                >
                  Back
                </button>
              )}
              <span className="setup-actions-spacer" />
              {step < 2 ? (
                <button
                  className="setup-button setup-button--primary"
                  type="button"
                  onClick={nextStep}
                >
                  Continue <span aria-hidden="true">→</span>
                </button>
              ) : (
                <button
                  className="setup-button setup-button--primary"
                  type="button"
                  onClick={saveSetup}
                  disabled={!validation.success || saving}
                >
                  {saving ? "Saving…" : "Create workspace"}{" "}
                  <span aria-hidden="true">✓</span>
                </button>
              )}
            </div>
          </>
        )}
      </section>
      <footer className="setup-footer">
        <span>Designed for non-technical teams.</span>
        <span>Your setup stays in this browser session only.</span>
      </footer>
    </main>
  );
}
