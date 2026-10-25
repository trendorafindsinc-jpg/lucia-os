"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formDefinitionSchema, formSubmissionSchema, getNotificationPlan, initialContactForm, initialNotificationSettings, notificationSettingsSchema, validateSubmission, type FormDefinition, type FormSubmission, type NotificationSettings } from "@/lib/forms/forms";

const starterValues: Record<string, string> = {
  "full-name": "",
  "email-address": "",
  reason: "General enquiry",
  message: "",
};

export function FormsWorkspace() {
  const [form, setForm] = useState<FormDefinition>(initialContactForm);
  const [websiteId, setWebsiteId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(initialNotificationSettings);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [values, setValues] = useState(starterValues);
  const [feedback, setFeedback] = useState("");
  const [filter, setFilter] = useState<"all" | "new" | "reviewed" | "archived">("all");
  const [activeTab, setActiveTab] = useState<"form" | "submissions" | "notifications">("form");
  const plan = useMemo(() => getNotificationPlan(form, notificationSettings), [form, notificationSettings]);
  const visibleSubmissions = submissions.filter((submission) => filter === "all" || submission.status === filter);
  const formValid = formDefinitionSchema.safeParse(form).success && notificationSettingsSchema.safeParse(notificationSettings).success;

  useEffect(() => {
    const requestedWebsiteId = new URLSearchParams(window.location.search).get("websiteId");
    if (!requestedWebsiteId) return;
    setWebsiteId(requestedWebsiteId);
    setIsLoading(true);
    fetch(`/api/websites/${encodeURIComponent(requestedWebsiteId)}/forms`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Couldn't load form settings.");
        const checkedForm = formDefinitionSchema.safeParse(payload.form);
        const checkedNotifications = notificationSettingsSchema.safeParse(payload.notificationSettings);
        const checkedSubmissions = Array.isArray(payload.submissions) ? payload.submissions.map((item: unknown) => formSubmissionSchema.parse(item)) : [];
        if (!checkedForm.success || !checkedNotifications.success) throw new Error("Saved form settings failed validation. Saving is disabled to protect them.");
        setForm(checkedForm.data);
        setNotificationSettings(checkedNotifications.data);
        setSubmissions(checkedSubmissions);
        setIsDirty(false);
        setLoadFailed(false);
      })
      .catch((error: unknown) => {
        setLoadFailed(true);
        setFeedback(error instanceof Error ? `${error.message} Saving is disabled until the form settings load safely.` : "Couldn't load saved forms. Saving is disabled to protect existing data.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function saveFormSettings() {
    if (!websiteId || isLoading || loadFailed || !formValid || isSaving) return;
    setIsSaving(true);
    setFeedback("");
    try {
      const response = await fetch(`/api/websites/${encodeURIComponent(websiteId)}/forms`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, cache: "no-store",
        body: JSON.stringify({ form, notificationSettings }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Couldn't save form settings.");
      setIsDirty(false);
      setFeedback("Form settings saved to the website workspace. Public submissions and email delivery are not connected yet.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Couldn't save form settings. The last saved settings remain unchanged.");
    } finally { setIsSaving(false); }
  }

  function updateForm(patch: Partial<FormDefinition>) { setForm((current) => ({ ...current, ...patch })); setIsDirty(true); }
  function updateNotifications(patch: Partial<NotificationSettings>) { setNotificationSettings((current) => ({ ...current, ...patch })); setIsDirty(true); }

  async function updateSubmissionStatus(id: string, status: FormSubmission["status"]) {
    if (websiteId && /^submission-[0-9a-f-]{36}$/i.test(id)) {
      try {
        const response = await fetch(`/api/websites/${encodeURIComponent(websiteId)}/forms/submissions/${encodeURIComponent(id)}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify({ status }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Couldn't update this submission.");
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Couldn't update submission status.");
        return;
      }
    }
    setSubmissions((current) => current.map((submission) => submission.id === id ? { ...submission, status } : submission));
    if (!/^submission-[0-9a-f-]{36}$/i.test(id)) setFeedback("Demo submission status changed in this session only.");
  }

  function submitDemo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateSubmission(form, values);
    if (!result.success) {
      setFeedback(result.message);
      return;
    }
    const submission: FormSubmission = {
      id: `submission-${Date.now().toString(36)}-${submissions.length.toString(36)}`,
      formId: form.id,
      submittedAt: new Date().toISOString(),
      values: result.values,
      status: "new",
    };
    setSubmissions((current) => [submission, ...current]);
    setValues(starterValues);
    setFeedback("Demo submission added to this session only. It has not been sent to a server or emailed.");
    setActiveTab("submissions");
  }

  return (
    <main className="forms-shell">
      <header className="forms-topbar"><Link href="/" className="forms-brand">← LUCIA OS</Link><span className="forms-state">FORMS &amp; ENQUIRIES</span></header>
      <section className="forms-delivery-state" aria-live="polite"><div><strong>{isLoading ? "Loading saved form settings…" : loadFailed ? "Saved form settings unavailable" : websiteId ? (isDirty ? "Unsaved form changes" : "Saved workspace form settings") : "Local prototype · not saved"}</strong><p>{websiteId ? "Save form settings explicitly. Public submission handling and email delivery remain disabled until their secure endpoints are connected." : "Open Forms with a saved website ID to persist form settings."}</p></div>{websiteId && <button type="button" onClick={saveFormSettings} disabled={isLoading || loadFailed || isSaving || !isDirty || !formValid}>{isSaving ? "Saving…" : "Save form settings"}</button>}</section>
      <section className="forms-hero"><p className="eyebrow">TURN VISITS INTO CONVERSATIONS</p><h1>Every enquiry,<br /><span>with a clear next step.</span></h1><p>Design a simple contact form, review demo submissions, and configure notification preferences. This workspace is a prototype; data stays in this browser session.</p></section>
      <nav className="forms-tabs" aria-label="Forms workspace sections">
        <button type="button" className={activeTab === "form" ? "active" : ""} onClick={() => setActiveTab("form")}>Form builder</button>
        <button type="button" className={activeTab === "submissions" ? "active" : ""} onClick={() => setActiveTab("submissions")}>Submissions <span>{submissions.length}</span></button>
        <button type="button" className={activeTab === "notifications" ? "active" : ""} onClick={() => setActiveTab("notifications")}>Notifications</button>
      </nav>
      {activeTab === "form" ? <div className="forms-grid">
        <section className="forms-panel"><div className="forms-panel-title"><div><p className="eyebrow">FORM SETTINGS</p><h2>Contact form</h2></div><label className="forms-toggle"><input type="checkbox" checked={form.enabled} onChange={(event) => updateForm({ enabled: event.target.checked })} /><span>Accept submissions</span></label></div>
          <label className="forms-field">Form name<input value={form.name} maxLength={80} onChange={(event) => updateForm({ name: event.target.value })} /></label>
          <label className="forms-field">Introductory text<textarea rows={2} maxLength={240} value={form.description} onChange={(event) => updateForm({ description: event.target.value })} /></label>
          <label className="forms-field">Button label<input value={form.submitLabel} maxLength={40} onChange={(event) => updateForm({ submitLabel: event.target.value })} /></label>
          <label className="forms-field">Success message<textarea rows={2} maxLength={200} value={form.successMessage} onChange={(event) => updateForm({ successMessage: event.target.value })} /></label>
          <p className="forms-note">Starter fields: name, email, enquiry type, and message. Field structure is a typed example; adding/removing custom fields and saving this configuration will be part of durable form management.</p>
        </section>
        <section className="forms-panel forms-preview-panel"><div className="forms-panel-title"><div><p className="eyebrow">VISITOR EXPERIENCE</p><h2>Preview your form</h2></div><span className="forms-preview-badge">Private demo</span></div>
          <form className="visitor-form" onSubmit={submitDemo}>
            <h3>{form.name || "Contact form"}</h3><p>{form.description}</p>
            {form.fields.map((field) => <label key={field.id}>{field.label}{field.required ? <span aria-hidden="true"> *</span> : null}
              {field.type === "textarea" ? <textarea required={field.required} value={values[field.id] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [field.id]: event.target.value }))} rows={4} /> : field.type === "select" ? <select required={field.required} value={values[field.id] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [field.id]: event.target.value }))}>{field.options.map((option) => <option key={option}>{option}</option>)}</select> : <input required={field.required} type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"} value={values[field.id] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [field.id]: event.target.value }))} />}</label>)}
            <button type="submit" disabled={!form.enabled}>{form.submitLabel}</button>
            {!form.enabled ? <p className="forms-disabled">This form is paused.</p> : null}
          </form>
          {feedback ? <p className="forms-feedback" role="status">{feedback}</p> : null}
        </section>
      </div> : null}
      {activeTab === "submissions" ? <section className="forms-panel submissions-panel"><div className="forms-panel-title"><div><p className="eyebrow">INBOX</p><h2>Form submissions</h2></div><span className="forms-count">{submissions.length} total</span></div>
        <div className="forms-inbox-tools"><label>Show<select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}><option value="all">All submissions</option><option value="new">New</option><option value="reviewed">Reviewed</option><option value="archived">Archived</option></select></label></div>
        {visibleSubmissions.length === 0 ? <div className="forms-empty"><span aria-hidden="true">✉</span><h3>No submissions yet</h3><p>Public submissions are not connected yet. Send a demo enquiry from the Form builder tab; it stays in this browser session.</p><button type="button" onClick={() => setActiveTab("form")}>Try a demo submission</button></div> : <div className="forms-submission-list">{visibleSubmissions.map((submission) => <article className="forms-submission" key={submission.id}><div className="forms-submission-head"><div><strong>{submission.values["full-name"] || "Visitor enquiry"}</strong><span>{submission.values["email-address"] || "No email provided"}</span></div><span className={`forms-status forms-status-${submission.status}`}>{submission.status}</span></div><p>{submission.values.message || "No message supplied"}</p><small>{new Date(submission.submittedAt).toLocaleString()}</small><div className="forms-submission-actions">{submission.status !== "reviewed" ? <button type="button" onClick={() => updateSubmissionStatus(submission.id, "reviewed")}>Mark reviewed</button> : null}{submission.status !== "archived" ? <button type="button" onClick={() => updateSubmissionStatus(submission.id, "archived")}>Archive</button> : null}{submission.status !== "new" ? <button type="button" onClick={() => updateSubmissionStatus(submission.id, "new")}>Mark new</button> : null}</div></article>)}</div>}
      </section> : null}
      {activeTab === "notifications" ? <section className="forms-panel notification-panel"><p className="eyebrow">EMAIL PREFERENCES</p><h2>Keep the right people informed.</h2><p className="forms-muted">Configure how notifications should work. Delivery is not connected, so saved preferences do not send emails.</p>
        <label className="forms-setting-row"><span><strong>Notify the website owner</strong><small>Prepare an owner notification for new submissions.</small></span><input type="checkbox" checked={notificationSettings.notifyOnSubmission} onChange={(event) => updateNotifications({ notifyOnSubmission: event.target.checked })} /></label>
        <label className="forms-field">Notification recipient<input type="email" placeholder="owner@example.com" value={notificationSettings.recipientEmail} onChange={(event) => updateNotifications({ recipientEmail: event.target.value })} /></label>
        <label className="forms-setting-row"><span><strong>Visitor confirmation</strong><small>Prepare a confirmation message after an enquiry.</small></span><input type="checkbox" checked={notificationSettings.sendVisitorConfirmation} onChange={(event) => updateNotifications({ sendVisitorConfirmation: event.target.checked })} /></label>
        <label className="forms-field">Email subject<input value={notificationSettings.confirmationSubject} maxLength={120} onChange={(event) => updateNotifications({ confirmationSubject: event.target.value })} /></label>
        <label className="forms-field">Confirmation message<textarea rows={4} maxLength={1000} value={notificationSettings.confirmationMessage} onChange={(event) => updateNotifications({ confirmationMessage: event.target.value })} /></label>
        <div className="forms-delivery-state"><span className="forms-delivery-dot" /><div><strong>Email delivery not connected</strong><p>{plan.ownerNotificationReady ? "Owner recipient format is valid." : "Add a valid recipient and enable owner notifications to prepare the setting."} {plan.visitorConfirmationConfigured ? "Visitor confirmation content is configured." : "Visitor confirmation is currently not configured."} No email is sent by this prototype.</p></div></div>
      </section> : null}
      <footer className="forms-footer"><span>{websiteId ? "Form settings saved separately · demo submissions remain session-only" : "Demo workspace · session-only data"}</span><Link href="/publish">Review publishing readiness ↗</Link></footer>
    </main>
  );
}
