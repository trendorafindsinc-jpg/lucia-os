"use client";

import React, { useEffect, useId, useMemo, useState, useRef } from "react";
import {
  WorkspaceAppLink as Link,
  useAppSearch,
} from "@/components/workspace/app-navigation";
import { getTemplateById, websiteTemplates } from "@/lib/templates/catalogue";
import {
  siteDraftRecoverySchema,
  editorPalettes,
  makeInitialDraft,
  moveSection,
  siteDraftSchema,
  type EditorPaletteId,
  type SiteDraft,
} from "@/lib/editor/site-draft";
import {
  layoutBlueprintSchema,
  siteDraftToLayoutBlueprint,
  type LayoutBlueprint,
} from "@/lib/layout-blueprint/blueprint";
import { LayoutRenderer } from "@/components/layout-studio/layout-renderer";
import {
  websiteSnapshotSchema,
  type WebsiteSnapshot,
} from "@/lib/versions/version-history";
import { ContextLease } from "@/lib/workspace/continuity";
import {
  useWorkspaceAdapter,
  useWorkspaceTab,
} from "@/components/workspace/workspace-tab-shell";

type SavedWebsiteVersion = {
  id: string;
  label: string;
  notes: string;
  createdAt: string;
  snapshot: WebsiteSnapshot;
};

export function VisualSiteEditor({
  embedded = false,
}: { embedded?: boolean } = {}) {
  const Root = embedded ? "div" : "main";
  const versionHeadingId = useId();
  const appSearch = useAppSearch();
  const [draft, setDraft] = useState<SiteDraft>(() =>
    makeInitialDraft("northstar-consulting"),
  );
  const {
    accountId,
    recoveryReady,
    activeTabId,
    setActiveTabDirty,
    getSnapshot,
    setSnapshot,
    clearSnapshot,
  } = useWorkspaceTab();
  const contextEpoch = useRef(new ContextLease());
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const snapshotKey = activeTabId ? `editor-draft:${activeTabId}` : "";
  const [notice, setNotice] = useState("");
  const [websiteId, setWebsiteId] = useState("");
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [savedDraftUnavailable, setSavedDraftUnavailable] = useState(false);
  const [draftRevision, setDraftRevision] = useState<string | null>(null);
  const [saveConflict, setSaveConflict] = useState<{
    revision: string;
    draft: SiteDraft | null;
  } | null>(null);
  const [readyContext, setReadyContext] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveLabel, setSaveLabel] = useState("Preview only");
  const [aiProposal, setAiProposal] = useState<LayoutBlueprint | null>(null);
  const [aiError, setAiError] = useState("");
  const [versions, setVersions] = useState<SavedWebsiteVersion[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [versionLabel, setVersionLabel] = useState("Checkpoint");
  const [versionBusy, setVersionBusy] = useState(false);
  const [versionError, setVersionError] = useState("");
  const template = getTemplateById(draft.templateId);
  const validation = useMemo(() => siteDraftSchema.safeParse(draft), [draft]);
  const previewBlueprint = useMemo(
    () =>
      siteDraftToLayoutBlueprint(
        validation.success
          ? validation.data
          : makeInitialDraft(draft.templateId),
      ),
    [draft, validation],
  );

  useEffect(() => {
    if (!activeTabId) return;
    const lease = contextEpoch.current;
    const epoch = lease.start();
    let cancelled = false;
    const cachedCandidate = getSnapshot<unknown>(`editor-draft:${activeTabId}`);
    const cachedCheck = siteDraftRecoverySchema.safeParse(cachedCandidate);
    const cachedDraft = cachedCheck.success ? cachedCheck.data : undefined;
    if (cachedCandidate !== undefined && !cachedCheck.success)
      clearSnapshot(`editor-draft:${activeTabId}`);
    const params = new URLSearchParams(appSearch);
    const requested = params.get("template");
    const savedWebsiteId = params.get("websiteId");
    setIsSaving(false);
    setDraftRevision(null);
    setSaveConflict(null);
    setWebsiteId(savedWebsiteId || "");
    setSavedDraftUnavailable(false);
    setIsLoadingSaved(false);
    setIsLoadingVersions(false);
    setVersions([]);
    setVersionError("");
    setAiProposal(null);
    setAiError("");
    if (!cachedDraft && !requested)
      setDraft(makeInitialDraft("northstar-consulting"));
    if (cachedDraft && !savedWebsiteId) {
      setDraft(cachedDraft);
      setSaveLabel("Unsaved changes");
      setActiveTabDirty(true);
      setNotice("Your unsaved editor work was restored in this workspace tab.");
    } else if (requested && getTemplateById(requested)) {
      setDraft(makeInitialDraft(requested));
      setSaveLabel("Preview only");
    }
    if (!savedWebsiteId) {
      setReadyContext(activeTabId);
      return;
    }
    setDraft(makeInitialDraft(requested || "northstar-consulting"));
    setWebsiteId(savedWebsiteId);
    setIsLoadingSaved(true);
    setIsLoadingVersions(true);
    fetch(`/api/websites/${encodeURIComponent(savedWebsiteId)}/versions`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = await response.json();
        if (cancelled) return;
        if (!response.ok)
          throw new Error(payload.error || "Couldn't load version history.");
        setVersions(Array.isArray(payload.versions) ? payload.versions : []);
        setVersionError("");
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setVersionError(
            error instanceof Error
              ? error.message
              : "Version history is temporarily unavailable.",
          );
      })
      .finally(() => {
        if (!cancelled) setIsLoadingVersions(false);
      });
    fetch(`/api/websites/${encodeURIComponent(savedWebsiteId)}/draft`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const data = await response.json();
        if (cancelled) return;
        if (!response.ok)
          throw new Error(data.error || "Couldn't open this saved website.");
        const base = makeInitialDraft(
          data.draft?.templateId || requested || "northstar-consulting",
        );
        setDraft(
          cachedDraft ?? {
            ...base,
            ...(data.draft ?? {}),
            siteName:
              data.draft?.siteName || data.website?.name || base.siteName,
          },
        );
        const baseRevision = getSnapshot<string>(`editor-base:${activeTabId}`);
        setDraftRevision(cachedDraft ? (baseRevision ?? null) : data.revision);
        if (cachedDraft && baseRevision !== data.revision) {
          setSaveConflict({ revision: data.revision, draft: data.draft });
        }
        if (cachedDraft) {
          setSavedDraftUnavailable(false);
          setSaveLabel("Unsaved changes");
          setActiveTabDirty(true);
          setNotice(
            "Your unsaved editor work was restored in this workspace tab. Save draft to keep it in your website.",
          );
        } else if (data.draft) {
          setSavedDraftUnavailable(false);
          setSaveLabel("Saved draft loaded");
          setActiveTabDirty(false);
        } else {
          setSavedDraftUnavailable(true);
          setSaveLabel("Draft needs recovery");
          setNotice(
            "This website has no valid structured editor draft. Saving is disabled to protect its existing page content.",
          );
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setSavedDraftUnavailable(true);
        setSaveLabel("Couldn't load saved draft");
        setNotice(
          error instanceof Error
            ? `${error.message} Saving is disabled until the saved draft can be loaded.`
            : "Couldn't load this website draft. Saving is disabled until the saved draft can be loaded.",
        );
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingSaved(false);
          setReadyContext(activeTabId);
        }
      });
    return () => {
      cancelled = true;
      lease.cancel(epoch);
    };
  }, [activeTabId, appSearch, getSnapshot, clearSnapshot, setActiveTabDirty]);

  useEffect(() => {
    const params = new URLSearchParams(appSearch);
    if (!accountId || params.get("loomifyProposal") !== "1") return;
    try {
      const raw = sessionStorage.getItem(
        `lucia.loomify.pending-proposal.v2:${accountId}`,
      );
      if (!raw) return;
      if (raw.length > 262144) return;
      const pending: unknown = JSON.parse(raw);
      if (
        !pending ||
        typeof pending !== "object" ||
        !("expiresAt" in pending) ||
        typeof pending.expiresAt !== "number" ||
        pending.expiresAt < Date.now()
      )
        return;
      if (
        typeof pending !== "object" ||
        pending === null ||
        !("websiteId" in pending) ||
        !("proposal" in pending)
      )
        return;
      if (
        typeof pending.websiteId !== "string" ||
        pending.websiteId !== params.get("websiteId")
      )
        return;
      const checked = layoutBlueprintSchema.safeParse(pending.proposal);
      if (!checked.success) {
        setAiError(
          "The incoming loomifyAI proposal did not pass validation. Your draft is unchanged.",
        );
        return;
      }
      setAiProposal(checked.data);
      setAiError("");
      sessionStorage.removeItem(
        `lucia.loomify.pending-proposal.v2:${accountId}`,
      );
      setNotice(
        "loomifyAI proposal received. Review it in the preview, then explicitly apply it to your draft.",
      );
    } catch {
      setAiError(
        "The incoming loomifyAI proposal could not be read. Your draft is unchanged.",
      );
    }
  }, [appSearch, accountId]);

  function checkpointDraft(value: SiteDraft) {
    if (!snapshotKey) return;
    if (draftRevision) setSnapshot(`editor-base:${activeTabId}`, draftRevision);
    setSnapshot(snapshotKey, value);
  }

  function update<K extends keyof SiteDraft>(key: K, value: SiteDraft[K]) {
    const next = { ...draft, [key]: value };
    setDraft(next);
    checkpointDraft(next);
    setSaveLabel("Unsaved changes");
    setActiveTabDirty(true);
    setNotice("");
  }

  async function saveDraft(): Promise<boolean> {
    if (isSaving) return false;
    const epoch = contextEpoch.current.version;
    const submitted = JSON.stringify(draft);
    if (!websiteId) {
      setNotice("Open a saved website from Websites before saving changes.");
      return false;
    }
    if (
      isLoadingSaved ||
      savedDraftUnavailable ||
      !draftRevision ||
      saveConflict
    ) {
      setNotice(
        "The saved draft could not be safely loaded. Reload this website before trying to save.",
      );
      return false;
    }
    const checked = siteDraftSchema.safeParse(draft);
    if (!checked.success) {
      setNotice("Please correct the highlighted draft fields before saving.");
      return false;
    }
    setIsSaving(true);
    setNotice("");
    try {
      const response = await fetch(
        `/api/websites/${encodeURIComponent(websiteId)}/draft`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "If-Match": draftRevision,
            ...(accountId ? { "X-LUCIA-Workspace-Account": accountId } : {}),
          },
          body: JSON.stringify(checked.data),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 409 && data.conflict) {
          const latestResponse = await fetch(
            `/api/websites/${encodeURIComponent(websiteId)}/draft`,
            { cache: "no-store" },
          );
          const latest = await latestResponse.json();
          if (contextEpoch.current.matches(epoch) && latestResponse.ok)
            setSaveConflict({ revision: latest.revision, draft: latest.draft });
        }
        throw new Error(data.error || "Couldn't save your changes.");
      }
      if (!contextEpoch.current.matches(epoch)) return false;
      setDraftRevision(data.revision);
      if (JSON.stringify(draftRef.current) !== submitted) {
        if (activeTabId)
          setSnapshot(`editor-base:${activeTabId}`, data.revision);
        setNotice(
          "The submitted draft was saved. Your newer edits remain unsaved.",
        );
        return false;
      }
      setSaveLabel("Saved just now");
      if (snapshotKey) clearSnapshot(snapshotKey);
      if (activeTabId) clearSnapshot(`editor-base:${activeTabId}`);
      setActiveTabDirty(false);
      setNotice(
        "Your website draft is saved to your LUCIA OS workspace. It is not published.",
      );
      return true;
    } catch (error) {
      if (!contextEpoch.current.matches(epoch)) return false;
      setNotice(
        error instanceof Error
          ? error.message
          : "Couldn't save your changes. Please try again.",
      );
      return false;
    } finally {
      if (contextEpoch.current.matches(epoch)) setIsSaving(false);
    }
  }

  useWorkspaceAdapter({
    save:
      websiteId &&
      !isLoadingSaved &&
      !savedDraftUnavailable &&
      Boolean(draftRevision) &&
      !saveConflict &&
      !isSaving &&
      validation.success
        ? saveDraft
        : undefined,
    canSuspend: () =>
      Boolean(
        snapshotKey &&
        JSON.stringify(getSnapshot(snapshotKey)) ===
          JSON.stringify(draftRef.current),
      ),
    discard: () => {
      if (snapshotKey) clearSnapshot(snapshotKey);
      setActiveTabDirty(false);
    },
  });

  async function saveVersionCheckpoint() {
    if (!websiteId || !validation.success || versionBusy) return;
    const label = versionLabel.trim();
    if (!label || label.length > 80) {
      setVersionError("Give this checkpoint a name of 1–80 characters.");
      return;
    }
    setVersionBusy(true);
    setVersionError("");
    try {
      const endpoints = [
        `/api/websites/${encodeURIComponent(websiteId)}/structure`,
        `/api/websites/${encodeURIComponent(websiteId)}/content-library`,
        `/api/websites/${encodeURIComponent(websiteId)}/seo`,
      ];
      const responses = await Promise.all(
        endpoints.map((url) => fetch(url, { cache: "no-store" })),
      );
      const payloads = await Promise.all(
        responses.map((response) => response.json()),
      );
      const failed = responses.findIndex((response) => !response.ok);
      if (failed !== -1)
        throw new Error(
          payloads[failed]?.error ||
            "Could not read all website metadata for a complete checkpoint.",
        );
      const snapshot = websiteSnapshotSchema.safeParse({
        siteName: draft.siteName,
        headline: draft.headline,
        description: draft.description,
        palette: draft.palette,
        visibleSections: draft.visibleSections,
        pages: payloads[0].structure.pages,
        seoTitle: (payloads[2].settings.title || draft.siteName).slice(0, 70),
        seoDescription: (
          payloads[2].settings.description || draft.description
        ).slice(0, 200),
        contentPostCount: payloads[1].library.posts.length,
        templateId: draft.templateId,
        buttonLabel: draft.buttonLabel,
      });
      if (!snapshot.success)
        throw new Error(
          "This checkpoint did not pass validation. Your saved data is unchanged.",
        );
      const response = await fetch(
        `/api/websites/${encodeURIComponent(websiteId)}/versions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            label,
            notes: "Saved from Layout Studio",
            snapshot: snapshot.data,
          }),
        },
      );
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error || "Couldn't save this checkpoint.");
      setVersions((current) =>
        [
          {
            id: payload.id,
            label,
            notes: "Saved from Layout Studio",
            createdAt: payload.createdAt,
            snapshot: snapshot.data,
          },
          ...current,
        ].slice(0, 25),
      );
      setVersionLabel("Checkpoint");
    } catch (error) {
      setVersionError(
        error instanceof Error
          ? error.message
          : "Couldn't save a checkpoint. Your saved draft remains unchanged.",
      );
    } finally {
      setVersionBusy(false);
    }
  }

  function restoreVisualDraft(version: SavedWebsiteVersion) {
    const snapshot = version.snapshot;
    const base = makeInitialDraft(snapshot.templateId || draft.templateId);
    const checked = siteDraftSchema.safeParse({
      ...base,
      siteName: snapshot.siteName,
      headline: snapshot.headline,
      description: snapshot.description,
      palette: snapshot.palette,
      visibleSections: snapshot.visibleSections,
      buttonLabel: snapshot.buttonLabel || base.buttonLabel,
    });
    if (!checked.success) {
      setVersionError(
        "This checkpoint cannot be restored into the visual editor safely.",
      );
      return;
    }
    setDraft(checked.data);
    checkpointDraft(checked.data);
    setSaveLabel("Unsaved changes");
    setActiveTabDirty(true);
    setNotice(
      "Visual draft restored into the editor only. Choose Save draft to persist it; publishing is not triggered.",
    );
    setAiProposal(null);
    setVersionError("");
  }

  function applyAIProposalToEditor() {
    if (!aiProposal || isLoadingSaved || savedDraftUnavailable) return;
    const page =
      aiProposal.pages.find((item) => item.path === "/") ?? aiProposal.pages[0];
    const hero = page?.sections.find((section) => section.type === "hero");
    const labels =
      page?.sections
        .flatMap((section) => {
          if (section.type === "content-grid")
            return section.items.map((item) => item.title);
          if (section.type === "call-to-action" || section.type === "contact")
            return [section.heading];
          return [];
        })
        .filter(
          (label, index, all) =>
            label.trim().length > 0 && all.indexOf(label) === index,
        )
        .slice(0, 12) ?? [];
    const boundedText = (
      value: string | undefined,
      fallback: string,
      maxLength: number,
    ) => {
      const candidate = (value ?? "").trim().slice(0, maxLength).trim();
      return candidate.length >= 2 ? candidate : fallback;
    };
    const next: SiteDraft = {
      ...draft,
      siteName: boundedText(aiProposal.site.name, draft.siteName, 80),
      headline: boundedText(hero?.heading, draft.headline, 100),
      description: boundedText(
        hero?.body ?? aiProposal.site.description,
        draft.description,
        220,
      ),
      buttonLabel: boundedText(
        hero?.actionLabel,
        draft.buttonLabel || "Get in touch",
        32,
      ),
      palette: aiProposal.theme.palette,
      visibleSections: labels.length ? labels : ["Home"],
    };
    const checked = siteDraftSchema.safeParse(next);
    if (!checked.success) {
      setAiError(
        "This proposal can't be mapped safely into the visual editor. Your draft is unchanged.",
      );
      return;
    }
    setDraft(checked.data);
    checkpointDraft(checked.data);
    setSaveLabel("Unsaved changes");
    setActiveTabDirty(true);
    setNotice(
      "Proposal applied to the editor only. Review the fields, then choose Save draft when you're ready.",
    );
    setAiProposal(null);
    setAiError("");
  }

  function toggleSection(section: string) {
    const visible = draft.visibleSections.includes(section);
    if (visible && draft.visibleSections.length === 1) {
      setNotice("Keep at least one section on your page.");
      return;
    }
    update(
      "visibleSections",
      visible
        ? draft.visibleSections.filter((item) => item !== section)
        : [...draft.visibleSections, section],
    );
  }

  return (
    <Root className="editor-page">
      <header className="editor-topbar">
        <Link className="wordmark" href="/" aria-label="LUCIA OS home">
          <span className="brand-mark" aria-hidden="true">
            L
          </span>
          <span>
            LUCIA <span className="muted-word">OS</span>
          </span>
        </Link>
        <div className="editor-topbar-actions">
          <span className="editor-unsaved">
            {isLoadingSaved
              ? "Opening saved draft…"
              : isSaving
                ? "Saving…"
                : websiteId
                  ? saveLabel
                  : "Preview only · Not saved"}
          </span>
          <Link
            className="editor-back-link"
            href={
              websiteId
                ? `/pages?websiteId=${encodeURIComponent(websiteId)}`
                : "/pages"
            }
          >
            Pages & navigation ↗
          </Link>
          {websiteId ? (
            <>
              <Link
                className="editor-back-link"
                href={`/content?websiteId=${encodeURIComponent(websiteId)}`}
              >
                Blog & media ↗
              </Link>
              <Link
                className="editor-back-link"
                href={`/seo?websiteId=${encodeURIComponent(websiteId)}`}
              >
                SEO & social ↗
              </Link>
              <Link
                className="editor-back-link"
                href={`/publish?websiteId=${encodeURIComponent(websiteId)}`}
              >
                Publish website ↗
              </Link>
            </>
          ) : null}
          <Link
            className="editor-back-link"
            href={
              websiteId
                ? `/loomify-ai?websiteId=${encodeURIComponent(websiteId)}`
                : "/loomify-ai"
            }
          >
            loomifyAI ↗
          </Link>
          <Link className="editor-back-link" href="/workspace/websites">
            Back to Websites
          </Link>
        </div>
      </header>
      <section className="editor-heading">
        <p className="eyebrow">VISUAL WEBSITE EDITOR</p>
        <h1>Shape your website.</h1>
        <p>
          Shape the layout and colours, then save changes to your workspace.
          Saving stores a draft; publishing is a separate step.
        </p>
      </section>
      {saveConflict && (
        <section
          className="workspace-card"
          role="alert"
          aria-label="Saved draft conflict"
        >
          <h2>A newer saved draft needs review</h2>
          <p>
            Your local edits are still here. They have not overwritten the saved
            website.
          </p>
          <details>
            <summary>Review the latest saved content</summary>
            <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
              {JSON.stringify(saveConflict.draft, null, 2)}
            </pre>
          </details>
          <button
            type="button"
            disabled={!saveConflict.draft}
            onClick={() => {
              if (
                !saveConflict.draft ||
                !window.confirm("Replace local edits with the saved draft?")
              )
                return;
              setDraft(saveConflict.draft);
              setDraftRevision(saveConflict.revision);
              if (snapshotKey) clearSnapshot(snapshotKey);
              if (activeTabId) clearSnapshot(`editor-base:${activeTabId}`);
              setSaveConflict(null);
              setActiveTabDirty(false);
              setSaveLabel("Saved draft loaded");
            }}
          >
            Load saved draft
          </button>
          <button
            type="button"
            onClick={() => {
              if (
                !window.confirm(
                  "Keep your local edits after reviewing the saved version? Saving will explicitly replace that version.",
                )
              )
                return;
              setDraftRevision(saveConflict.revision);
              if (activeTabId)
                setSnapshot(
                  `editor-base:${activeTabId}`,
                  saveConflict.revision,
                );
              setSaveConflict(null);
              setNotice(
                "Local edits retained. Save explicitly to replace the reviewed version.",
              );
            }}
          >
            Keep my edits after review
          </button>
        </section>
      )}
      <div className="editor-workspace">
        <aside className="editor-panel" aria-label="Website editing controls">
          <fieldset
            className="editor-recovery-controls"
            disabled={
              recoveryReady === false ||
              isLoadingSaved ||
              savedDraftUnavailable ||
              Boolean(
                accountId &&
                (!recoveryReady ||
                  !activeTabId ||
                  readyContext !== activeTabId),
              )
            }
          >
            <div className="editor-panel-heading">
              <div>
                <span className="editor-kicker">YOUR WEBSITE</span>
                <h2>Content & style</h2>
              </div>
              <span className="editor-live-dot">Live preview</span>
            </div>
            <section
              className="loomify-card"
              aria-labelledby={versionHeadingId}
            >
              <div className="loomify-card-top">
                <span className="editor-kicker">VERSION HISTORY</span>
                <h3 id={versionHeadingId}>Saved checkpoints</h3>
              </div>
              <p>
                Save a named checkpoint of the visual draft and related website
                metadata. Restore currently brings back visual editor fields
                only; pages, SEO settings and blog/media content are not
                restored. It never publishes.
              </p>
              <label className="editor-field">
                Checkpoint name
                <input
                  value={versionLabel}
                  maxLength={80}
                  onChange={(event) => setVersionLabel(event.target.value)}
                />
              </label>
              <button
                type="button"
                className="loomify-generate"
                onClick={saveVersionCheckpoint}
                disabled={
                  !websiteId ||
                  isLoadingSaved ||
                  isLoadingVersions ||
                  savedDraftUnavailable ||
                  !draftRevision ||
                  Boolean(saveConflict) ||
                  isSaving ||
                  versionBusy ||
                  !validation.success
                }
              >
                {versionBusy ? "Saving checkpoint…" : "Save checkpoint"}
              </button>
              {versionError && (
                <p className="loomify-error" role="alert">
                  {versionError}
                </p>
              )}
              {isLoadingVersions ? (
                <p className="loomify-helper">Loading saved checkpoints…</p>
              ) : versions.length ? (
                <div className="editor-section-list">
                  {versions.map((version) => (
                    <div className="editor-section-row" key={version.id}>
                      <div>
                        <strong>{version.label}</strong>
                        <small>
                          {new Date(version.createdAt).toLocaleString()}
                        </small>
                      </div>
                      <button
                        type="button"
                        onClick={() => restoreVisualDraft(version)}
                        disabled={
                          isLoadingSaved ||
                          isSaving ||
                          versionBusy ||
                          !draftRevision ||
                          Boolean(saveConflict)
                        }
                      >
                        Restore visual draft
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="loomify-helper">
                  {websiteId
                    ? "No saved checkpoints yet."
                    : "Open a saved website to enable checkpoints."}
                </p>
              )}
            </section>
            <label className="editor-field">
              Starting design
              <select
                value={draft.templateId}
                onChange={(event) => {
                  const next = makeInitialDraft(event.target.value);
                  setDraft(next);
                  checkpointDraft(next);
                  setSaveLabel("Unsaved changes");
                  setActiveTabDirty(true);
                  setNotice("");
                }}
              >
                {websiteTemplates.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="editor-field">
              Website name
              <input
                value={draft.siteName}
                maxLength={80}
                onChange={(event) => update("siteName", event.target.value)}
              />
            </label>
            <label className="editor-field">
              Main headline
              <input
                value={draft.headline}
                maxLength={100}
                onChange={(event) => update("headline", event.target.value)}
              />
            </label>
            <label className="editor-field">
              Introduction
              <textarea
                value={draft.description}
                maxLength={220}
                rows={4}
                onChange={(event) => update("description", event.target.value)}
              />
            </label>
            <label className="editor-field">
              Button text
              <input
                value={draft.buttonLabel}
                maxLength={32}
                onChange={(event) => update("buttonLabel", event.target.value)}
              />
            </label>
            <fieldset className="editor-palette-field">
              <legend>Colour mood</legend>
              <div className="editor-palette-options">
                {(Object.keys(editorPalettes) as EditorPaletteId[]).map(
                  (palette) => (
                    <button
                      type="button"
                      key={palette}
                      className={
                        draft.palette === palette
                          ? "editor-palette is-selected"
                          : "editor-palette"
                      }
                      aria-pressed={draft.palette === palette}
                      onClick={() => update("palette", palette)}
                    >
                      <span>
                        {editorPalettes[palette].map((color) => (
                          <i key={color} style={{ background: color }} />
                        ))}
                      </span>
                      <small>
                        {palette[0].toUpperCase() + palette.slice(1)}
                      </small>
                    </button>
                  ),
                )}
              </div>
            </fieldset>
            <fieldset className="editor-sections-field">
              <legend>Page sections</legend>
              <p>Show, hide and reorder the sections on your page.</p>
              <div className="editor-section-list">
                {Array.from(
                  new Set([
                    ...(template?.sections ?? []),
                    ...draft.visibleSections,
                  ]),
                ).map((section) => {
                  const index = draft.visibleSections.indexOf(section);
                  const visible = index !== -1;
                  return (
                    <div
                      className={
                        visible
                          ? "editor-section-row"
                          : "editor-section-row is-hidden"
                      }
                      key={section}
                    >
                      <label>
                        <input
                          type="checkbox"
                          checked={visible}
                          onChange={() => toggleSection(section)}
                        />
                        <span>{section}</span>
                      </label>
                      <div>
                        <button
                          type="button"
                          aria-label={`Move ${section} up`}
                          disabled={!visible || index === 0}
                          onClick={() =>
                            update(
                              "visibleSections",
                              moveSection(draft.visibleSections, index, -1),
                            )
                          }
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          aria-label={`Move ${section} down`}
                          disabled={
                            !visible ||
                            index === draft.visibleSections.length - 1
                          }
                          onClick={() =>
                            update(
                              "visibleSections",
                              moveSection(draft.visibleSections, index, 1),
                            )
                          }
                        >
                          ↓
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </fieldset>

            {!validation.success && (
              <p className="editor-notice" role="status">
                Some fields need a little more text before this draft can be
                considered valid.
              </p>
            )}
            <div className="editor-panel-actions">
              <button
                type="button"
                className="editor-reset"
                onClick={() => {
                  const next = makeInitialDraft(draft.templateId);
                  setDraft(next);
                  checkpointDraft(next);
                  setSaveLabel("Unsaved changes");
                  setActiveTabDirty(true);
                  setNotice(
                    "The editor preview was reset. Save to update the stored draft.",
                  );
                }}
              >
                Reset design
              </button>
              <button
                type="button"
                className="editor-done"
                onClick={saveDraft}
                disabled={
                  !websiteId ||
                  isLoadingSaved ||
                  savedDraftUnavailable ||
                  !draftRevision ||
                  Boolean(saveConflict) ||
                  isSaving ||
                  !validation.success
                }
              >
                {isSaving ? "Saving…" : "Save draft"}
              </button>
            </div>
          </fieldset>
          {notice && (
            <p className="editor-notice" role="status">
              {notice}
            </p>
          )}
        </aside>
        <section
          className="editor-preview-wrap"
          aria-label="Live website preview"
        >
          <div className="editor-preview-toolbar">
            <span>
              <i /> Preview
            </span>
            <span>Desktop concept</span>
          </div>
          {aiError && !aiProposal && (
            <p className="editor-notice" role="alert">
              {aiError}
            </p>
          )}
          {aiProposal && (
            <section
              className="loomify-proposal-review"
              aria-label="loomifyAI proposal review"
            >
              <div className="loomify-review-heading">
                <div>
                  <span className="editor-kicker">YOUR PROPOSAL</span>
                  <h2>{aiProposal.site.name}</h2>
                  <p>AI-generated concept · Review before applying</p>
                </div>
                <button
                  type="button"
                  className="loomify-dismiss"
                  onClick={() => setAiProposal(null)}
                  aria-label="Dismiss proposal"
                >
                  ×
                </button>
              </div>
              <div className="loomify-proposal-canvas">
                <LayoutRenderer
                  blueprint={aiProposal}
                  preview
                  idPrefix={`${versionHeadingId}-proposal-`}
                />
              </div>
              {aiError && (
                <p className="editor-notice" role="alert">
                  {aiError}
                </p>
              )}
              <div className="loomify-review-actions">
                <span>
                  Private preview only. Your live website is unchanged.
                </span>
                <button
                  type="button"
                  className="editor-done"
                  onClick={applyAIProposalToEditor}
                  disabled={isLoadingSaved || savedDraftUnavailable}
                >
                  {isLoadingSaved
                    ? "Loading saved draft…"
                    : savedDraftUnavailable
                      ? "Draft unavailable"
                      : "Apply proposal to draft"}
                </button>
              </div>
            </section>
          )}
          <div className="editor-layout-preview">
            <LayoutRenderer
              blueprint={previewBlueprint}
              preview
              idPrefix={`${versionHeadingId}-draft-`}
            />
          </div>
          <p className="editor-preview-caption">
            {websiteId
              ? "Changes can be saved to your organisation’s website draft. This preview is private; it is not a public website."
              : "Illustrative preview. Open a saved website from your Websites library to enable persistent saving."}
          </p>
        </section>
      </div>
      <footer className="editor-page-footer">
        <span>{draft.visibleSections.length} visible sections</span>
        <span>
          {websiteId
            ? "Draft saving is connected · Publishing remains separate"
            : "Preview only · Open a saved website to save changes"}
        </span>
        <span>
          {validation.success ? "Draft fields valid" : "Check draft fields"}
        </span>
      </footer>
    </Root>
  );
}
