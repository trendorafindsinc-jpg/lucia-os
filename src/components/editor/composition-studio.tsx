"use client";
import { mediaIds } from "@/lib/media/references";
import { WebsiteFirstPremiumEditor } from "./website-first-premium-editor";
import { VisualExperienceControls } from "./visual-experience-controls";
import { MediaLibrary } from "./media-library";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  WorkspaceAppLink,
  useAppSearch,
} from "@/components/workspace/app-navigation";
import {
  useWorkspaceAdapter,
  useWorkspaceTab,
} from "@/components/workspace/workspace-tab-shell";
import { LayoutRenderer } from "@/components/layout-studio/layout-renderer";
import { LegacyVisualSiteEditor } from "./visual-site-editor";
import {
  isPremium,
  websiteDefinitionSchema,
  type WebsiteDefinition,
} from "@/lib/layout-blueprint/website-definition";
import {
  applyPremiumEdit,
  compositionRecoverySchema,
  type PremiumEdit,
  type PremiumLayout,
} from "@/lib/layout-blueprint/premium-composition";
import { structuralLayoutIds } from "@/lib/layout-blueprint/structural-layouts";
import { premiumCandidateIds } from "@/lib/layout-blueprint/premium-layouts/catalogue-candidates";
import { premiumArtworkChoices } from "@/lib/layout-blueprint/premium-layouts/asset-choices";

type Loaded = { draft: WebsiteDefinition; revision: string; context: string };
export function CompositionStudio({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const search = useAppSearch();
  const { accountId, activeTabId, clearSnapshot, setActiveTabDirty } =
    useWorkspaceTab();
  const websiteId = new URLSearchParams(search).get("websiteId") ?? "";
  const [loaded, setLoaded] = useState<Loaded | null>(null),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0);
  const [assign, setAssign] = useState("meridian"),
    [busy, setBusy] = useState(false);
  const identity = `${accountId}:${activeTabId}:${websiteId}:${refresh}`;
  const lease = useRef(identity);
  lease.current = identity;
  useEffect(() => {
    setLoaded(null);
    setError("");
    if (!websiteId) return;
    let cancelled = false;
    fetch(`/api/websites/${encodeURIComponent(websiteId)}/draft`, {
      cache: "no-store",
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw Error(data.error || "Unable to open website");
        const parsed = websiteDefinitionSchema.safeParse(data.draft);
        if (!parsed.success)
          throw Error(
            "The saved draft needs recovery. It has not been replaced.",
          );
        if (!cancelled)
          setLoaded({
            draft: parsed.data,
            revision: data.revision,
            context: identity,
          });
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [identity, websiteId]);
  async function assignLayout() {
    if (
      !loaded ||
      busy ||
      !window.confirm(
        "Replace this starting Layout and its saved demo content? Unsaved editor changes will be discarded. This does not change the published website.",
      )
    )
      return;
    const token = identity;
    setBusy(true);
    setError("");
    try {
      const r = await fetch(
        `/api/websites/${encodeURIComponent(websiteId)}/draft`,
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            "if-match": loaded.revision,
            ...(accountId ? { "x-lucia-workspace-account": accountId } : {}),
          },
          body: JSON.stringify({ kind: "assign-layout", layoutId: assign }),
        },
      );
      const data = await r.json();
      if (!r.ok) throw Error(data.error || "Layout could not be assigned");
      if (lease.current === token) {
        if (activeTabId) {
          clearSnapshot(`editor-draft:${activeTabId}`);
          clearSnapshot(`editor-base:${activeTabId}`);
        }
        setActiveTabDirty(false);
        setRefresh((n) => n + 1);
      }
    } catch (e) {
      if (lease.current === token)
        setError(e instanceof Error ? e.message : "Assignment failed");
    } finally {
      if (lease.current === token) setBusy(false);
    }
  }
  if (!websiteId) return <LegacyVisualSiteEditor embedded={embedded} />;
  if (error && !loaded)
    return (
      <main className="editor-page">
        <p role="alert">{error}</p>
        <button onClick={() => setRefresh((n) => n + 1)}>Retry loading</button>
      </main>
    );
  if (!loaded || loaded.context !== identity)
    return (
      <main className="editor-page" aria-busy="true">
        <p>Opening saved website…</p>
      </main>
    );
  if (isPremium(loaded.draft) && new URLSearchParams(search).get("studio") === "classic")
    return (
      <CompositionEditor
        key={identity}
        websiteId={websiteId}
        initial={loaded.draft}
        revision={loaded.revision}
        reload={() => setRefresh((n) => n + 1)}
      />
    );
  if (isPremium(loaded.draft))
    return (
      <WebsiteFirstPremiumEditor
        key={identity}
        websiteId={websiteId}
        initial={loaded.draft}
        revision={loaded.revision}
        reload={() => setRefresh((n) => n + 1)}
      />
    );
  return (
    <>
      <section
        className="composition-controls"
        aria-label="Layout starting designs"
      >
        <p>
          The original engine demonstrations remain available. The 48 registered Phase 14
          candidates can also be assigned for engineering review; they have
          not passed premium design or publishing acceptance.
        </p>
        <label>
          Starting composition{" "}
          <select value={assign} onChange={(e) => setAssign(e.target.value)}>
            <optgroup label="Phase 13 structural demonstrations">
              {structuralLayoutIds.map((id) => (
                <option key={id} value={id}>{id}</option>
              ))}
            </optgroup>
            <optgroup label="Phase 14 candidates — not accepted">
              {premiumCandidateIds.map((id) => (
                <option key={id} value={id}>
                  {id.slice("lucia.layout.".length)}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <button disabled={busy} onClick={assignLayout}>
          {busy ? "Assigning…" : "Use this composition"}
        </button>
        {error && <p role="alert">{error}</p>}
      </section>
      <LegacyVisualSiteEditor embedded={embedded} />
    </>
  );
}
function CompositionEditor({
  websiteId,
  initial,
  revision,
  reload,
}: {
  websiteId: string;
  initial: PremiumLayout;
  revision: string;
  reload: () => void;
}) {
  const {
    accountId,
    activeTabId,
    setActiveTabDirty,
    getSnapshot,
    setSnapshot,
    clearSnapshot,
  } = useWorkspaceTab();
  const key = `composition-draft:website-engine:website:${websiteId}`;
  const [ownedArtwork, setOwnedArtwork] = useState<{ ref: string; label: string }[]>([]);
  const artworkChoices = [...premiumArtworkChoices, ...ownedArtwork];
  const [layout, setLayout] = useState(initial),
    [edits, setEdits] = useState<PremiumEdit[]>([]),
    [base, setBase] = useState(revision);
  const [pageId, setPageId] = useState(initial.pages[0].id),
    [sectionId, setSectionId] = useState(initial.pages[0].sections[0].id);
  const [panel, setPanel] = useState<"business" | "content" | "design" | "visual">("business"),
    [previewWidth, setPreviewWidth] = useState("100%"),
    [mode, setMode] = useState<"guided" | "advanced">("guided"),
    [notice, setNotice] = useState("Saved draft loaded"),
    [busy, setBusy] = useState(false),
    [conflict, setConflict] = useState(false);
  const committed = useRef(initial);
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  useEffect(() => {
    const saved = getSnapshot<unknown>(key);
    const recovered = compositionRecoverySchema.safeParse(saved);
    if (recovered.success && recovered.data.revision === revision) {
      try {
        let next = initial;
        const queue = recovered.data.edits;
        for (const edit of queue)
          next = applyPremiumEdit(next, recovered.data.mode, edit);
        setMode(recovered.data.mode);
        setLayout(next);
        setEdits(queue);
        setActiveTabDirty(queue.length > 0);
        setNotice("Recovered unsaved changes. Save draft to commit them.");
      } catch {
        setNotice(
          "Recovery could not be applied. The saved website is unchanged.",
        );
      }
    } else if (saved)
      setNotice(
        "A recovery copy uses an older revision. It has not overwritten the saved website.",
      );
  }, [initial, revision, getSnapshot, key, setActiveTabDirty]);
  useEffect(() => {
    if (!edits.length) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [edits.length]);
  const page = layout.pages.find((p) => p.id === pageId)!;
  const section =
    page.sections.find((s) => s.id === sectionId) ?? page.sections[0];
  function edit(change: PremiumEdit) {
    try {
      if (edits.length >= 40)
        throw Error("Save these changes before continuing.");
      const next = applyPremiumEdit(layout, mode, change);
      const previous = edits.at(-1);
      const coalesce =
        previous &&
        change.kind === previous.kind &&
        ((change.kind === "replace-section" &&
          previous.kind === "replace-section" &&
          change.pageId === previous.pageId &&
          change.section.id === previous.section.id) ||
          (change.kind === "token" &&
            previous.kind === "token" &&
            change.key === previous.key) ||
          (change.kind === "responsive" &&
            previous.kind === "responsive" &&
            change.pageId === previous.pageId) ||
          (change.kind === "business-detail" && previous.kind === "business-detail" &&
            change.field === previous.field) ||
          (change.kind === "business-social" && previous.kind === "business-social" &&
            change.network === previous.network) ||
          (change.kind === "business-logo" && previous.kind === "business-logo"));
      const queue = coalesce
        ? [...edits.slice(0, -1), change]
        : [...edits, change];
      setLayout(next);
      setEdits(queue);
      setActiveTabDirty(true);
      setSnapshot(key, { version: 1, mode, revision: base, edits: queue });
      setNotice("Unsaved changes");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Change rejected");
    }
  }
  const save = useCallback(async () => {
    if (busy || conflict || !edits.length) return false;
    setBusy(true);
    setNotice("Saving…");
    try {
      const r = await fetch(
        `/api/websites/${encodeURIComponent(websiteId)}/draft`,
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            "if-match": base,
            ...(accountId ? { "x-lucia-workspace-account": accountId } : {}),
          },
          body: JSON.stringify({ kind: "composition-edit", mode, edits }),
        },
      );
      const data = await r.json();
      if (!live.current) return false;
      if (!r.ok) {
        if (r.status === 409) setConflict(true);
        throw Error(data.error || "Save failed. Retry when connected.");
      }
      committed.current = data.draft;
      setLayout(data.draft);
      setBase(data.revision);
      setEdits([]);
      clearSnapshot(key);
      setActiveTabDirty(false);
      setNotice("Draft saved to your website");
      return true;
    } catch (e) {
      if (live.current)
        setNotice(e instanceof Error ? e.message : "Save failed. Retry.");
      return false;
    } finally {
      if (live.current) setBusy(false);
    }
  }, [
    accountId,
    base,
    busy,
    clearSnapshot,
    conflict,
    edits,
    key,
    mode,
    setActiveTabDirty,
    websiteId,
  ]);
  const discard = useCallback(() => {
    clearSnapshot(key);
    setEdits([]);
    setLayout(committed.current);
    setActiveTabDirty(false);
  }, [clearSnapshot, key, setActiveTabDirty]);
  useWorkspaceAdapter({
    save: edits.length && !conflict && !busy ? save : undefined,
    canSuspend: () => Boolean(activeTabId && getSnapshot(key)),
    discard,
  });
  return (
    <main className="editor-page">
      <nav className="studio-journey-progress" aria-label="Website creation progress">
        <WorkspaceAppLink href={`/editor?websiteId=${encodeURIComponent(websiteId)}`}>1. Design & content</WorkspaceAppLink>
        <WorkspaceAppLink href={`/editor?websiteId=${encodeURIComponent(websiteId)}#pages-navigation`}>2. Pages & navigation</WorkspaceAppLink>
        <span aria-current="step">3. Detailed Settings</span>
        <WorkspaceAppLink href={`/publish?websiteId=${encodeURIComponent(websiteId)}`}>4. Preview & publish</WorkspaceAppLink>
      </nav>
      {accountId && <MediaLibrary websiteId={websiteId} accountId={accountId} onChange={setOwnedArtwork} protectedIds={mediaIds(layout)} />}
      <header className="composition-controls">
        <h1>Layout Studio · Detailed settings</h1>
        <WorkspaceAppLink href={{ pathname: "/editor", query: { websiteId } }}>← Return to website-first editor</WorkspaceAppLink>
        <p>
          Personalize your business, pages and design. Only saved drafts can be published.
        </p>
        <p role="status" aria-live="polite">
          {notice}
        </p>
        <button disabled={busy || conflict || !edits.length} onClick={save}>
          {busy ? "Saving…" : edits.length ? `Save draft (${edits.length} changes)` : "All changes saved"}
        </button>
        {edits.length
          ? <strong className="studio-unsaved">Save your changes before opening publishing.</strong>
          : <WorkspaceAppLink href={`/publish?websiteId=${websiteId}`}>
              Preview and publish saved draft
            </WorkspaceAppLink>}
        {conflict && (
          <button
            onClick={() => {
              if (
                window.confirm(
                  "Discard local changes and load the latest saved draft?",
                )
              ) {
                discard();
                reload();
              }
            }}
          >
            Load latest saved draft
          </button>
        )}
      </header>
      <nav className="studio-task-nav" aria-label="Personalization tasks">
        {(["business", "content", "design", "visual"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            aria-current={panel === tab ? "step" : undefined}
            className={panel === tab ? "studio-task-active" : ""}
            onClick={() => setPanel(tab)}
          >
            {tab === "business" ? "1. Business identity" : tab === "content" ? "2. Page content" : tab === "design" ? "3. Design" : "4. Visual Experience"}
          </button>
        ))}
      </nav>
      {panel === "visual" && <VisualExperienceControls layoutId={layout.layoutId} value={layout.visualExperience} locked={busy || Boolean(layout.permissions.visualExperienceLocked) || !(mode === "guided" ? layout.permissions.guided.includes("brand") : layout.permissions.advanced.includes("tokens"))} onChange={(value) => edit({ kind: "visual-experience", value })} />}
      <fieldset
        disabled={busy}
        hidden={panel !== "business"}
        className="composition-controls studio-panel"
        aria-label="Business identity"
      >
        <legend>Business identity</legend>
        <p>This information belongs to this website alone. Shared contact details appear across its pages.</p>
        {layout.permissions.guided.includes("brand") && (
          <>
            <label>Business name
              <input key={layout.identity.name} defaultValue={layout.identity.name}
                maxLength={80} required onBlur={(e) => {
                  const value = e.currentTarget.value.trim();
                  if (value !== layout.identity.name) edit({ kind: "brand", name: value });
                }} />
            </label>
            <label>Business description
              <textarea key={layout.identity.description} defaultValue={layout.identity.description}
                maxLength={500} required onBlur={(e) => {
                  const value = e.currentTarget.value.trim();
                  if (value !== layout.identity.description) edit({ kind: "business-detail", field: "description", value });
                }} />
            </label>
            <label>Tagline
              <input key={layout.identity.profile?.tagline ?? ""} defaultValue={layout.identity.profile?.tagline ?? ""}
                maxLength={160} placeholder="What makes your business different?"
                onBlur={(e) => {
                  const value = e.currentTarget.value.trim();
                  if (value !== (layout.identity.profile?.tagline ?? "")) edit({ kind: "business-detail", field: "tagline", value });
                }} />
            </label>
          </>
        )}
        {layout.permissions.guided.includes("contact") && (
          <>
            {([
              ["contactEmail", "Public contact email", "email", 254],
              ["enquiryEmail", "Enquiry destination (shared across contact panels)", "email", 254],
              ["phone", "Telephone number", "tel", 24],
              ["address", "Business address", "text", 240],
              ["serviceArea", "Service area", "text", 160],
            ] as const).map(([field, label, type, limit]) => (
              <label key={field}>{label}
                <input
                  type={type} maxLength={limit}
                  key={field + ":" + (layout.identity.profile?.[field] ?? "")}
                  defaultValue={layout.identity.profile?.[field] ?? ""}
                  onBlur={(e) => {
                    const value = e.currentTarget.value.trim();
                    if (value !== (layout.identity.profile?.[field] ?? ""))
                      edit({ kind: "business-detail", field, value });
                  }}
                />
              </label>
            ))}
          </>
        )}
        {layout.permissions.guided.includes("link") && (
          <fieldset className="studio-subfields"><legend>Social profiles — secure HTTPS links only</legend>
            {(["instagram", "facebook", "linkedin", "x"] as const).map((network) => (
              <label key={network}>{network === "x" ? "X" : network[0].toUpperCase() + network.slice(1)}
                <input type="url" maxLength={350} placeholder="https://"
                  key={network + ":" + (layout.identity.profile?.social?.[network] ?? "")}
                  defaultValue={layout.identity.profile?.social?.[network] ?? ""}
                  onBlur={(e) => {
                    const value = e.currentTarget.value.trim();
                    if (value !== (layout.identity.profile?.social?.[network] ?? ""))
                      edit({ kind: "business-social", network, value });
                  }}
                />
              </label>
            ))}
          </fieldset>
        )}
        {layout.permissions.guided.includes("image") && (
          <fieldset className="studio-subfields"><legend>Brand logo artwork</legend>
            <label>Approved logo or brand image
              <select value={layout.identity.profile?.logo?.src ?? ""}
                onChange={(e) => {
                  const src = e.currentTarget.value;
                  edit({ kind: "business-logo", src: src || null,
                    alt: src ? (layout.identity.profile?.logo?.alt ?? layout.identity.name + " brand artwork") : null });
                }}>
                <option value="">No logo selected</option>
                {artworkChoices.map((choice) => <option key={choice.ref} value={choice.ref}>{choice.label}</option>)}
              </select>
            </label>
            {layout.identity.profile?.logo && <label>Logo description
              <input key={layout.identity.profile.logo.alt} defaultValue={layout.identity.profile.logo.alt}
                maxLength={200} onBlur={(e) => {
                  const alt = e.currentTarget.value.trim();
                  if (alt !== layout.identity.profile?.logo?.alt)
                    edit({ kind: "business-logo", src: layout.identity.profile!.logo!.src, alt });
                }}/>
            </label>}
            <small>Choose from approved built-in artwork. Customer-owned file uploads are not available.</small>
          </fieldset>
        )}
      </fieldset>
      <fieldset
        disabled={busy}
        hidden={panel !== "content"}
        className="composition-controls studio-panel"
        aria-label="Composition controls"
      >
        {layout.permissions.guided.includes("brand") && (
          <label>
            Website name
            <input
              key={"brand:" + layout.identity.name}
              defaultValue={layout.identity.name}
              maxLength={80}
              onBlur={(event) => {
                const name = event.currentTarget.value.trim();
                if (name.length >= 2 && name !== layout.identity.name)
                  edit({ kind: "brand", name });
              }}
              aria-describedby="website-name-help"
            />
            <small id="website-name-help">
              Changes the website branding and page titles without replacing
              your editorial content.
            </small>
          </label>
        )}
        <label>
          Editing mode{" "}
          <select
            disabled={edits.length > 0}
            value={mode}
            onChange={(e) => setMode(e.target.value as "guided" | "advanced")}
          >
            <option value="guided">Guided</option>
            <option value="advanced">Advanced</option>
          </select>
        </label>
        <label>
          Page{" "}
          <select
            value={page.id}
            onChange={(e) => {
              setPageId(e.target.value);
              setSectionId("");
            }}
          >
            {layout.pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Section{" "}
          <select
            value={section.id}
            onChange={(e) => setSectionId(e.target.value)}
          >
            {page.sections.map((s) => (
              <option key={s.id} value={s.id}>
                {"heading" in s ? s.heading : "Trust indicators"}
              </option>
            ))}
          </select>
        </label>
        {section.type === "premium-hero" && (
          <label>Hero introduction
            <input maxLength={100} value={section.eyebrow}
              onChange={(e) => edit({ kind: "replace-section", pageId: page.id,
                section: { ...section, eyebrow: e.target.value } })}/>
          </label>
        )}
        {section.type === "trust-strip" && section.items.map((value, index) => (
          <label key={index}>Trust indicator {index + 1}
            <input maxLength={100} value={value} onChange={(e) => edit({
              kind: "replace-section", pageId: page.id,
              section: { ...section, items: section.items.map((item, i) => i === index ? e.target.value : item) },
            })}/>
          </label>
        ))}
        {section.type === "service-journey" && section.items.map((item, index) => (
          <div key={index} className="studio-subfields">
            <label>Service {index + 1} name
              <input maxLength={120} value={item.title} onChange={(e) => edit({
                kind: "replace-section", pageId: page.id,
                section: { ...section, items: section.items.map((entry, i) =>
                  i === index ? { ...entry, title: e.target.value } : entry) },
              })}/>
            </label>
            <label>Service {index + 1} description
              <textarea maxLength={500} value={item.body} onChange={(e) => edit({
                kind: "replace-section", pageId: page.id,
                section: { ...section, items: section.items.map((entry, i) =>
                  i === index ? { ...entry, body: e.target.value } : entry) },
              })}/>
            </label>
          </div>
        ))}
        {"heading" in section && (
          <label>
            Heading{" "}
            <input
              maxLength={section.type === "premium-hero" ? 160 : 150}
              value={section.heading}
              onChange={(e) =>
                edit({
                  kind: "replace-section",
                  pageId: page.id,
                  section: { ...section, heading: e.target.value },
                })
              }
            />
          </label>
        )}
        {"body" in section && (
          <label>
            Content{" "}
            <textarea
              value={section.body}
              maxLength={section.type === "editorial-story" ? 3000 : section.type === "experience" ? 2000 : 1000}
              onChange={(e) =>
                edit({
                  kind: "replace-section",
                  pageId: page.id,
                  section: { ...section, body: e.target.value },
                })
              }
            />
          </label>
        )}
        {section.type === "premium-hero" && section.action && (
          <>
            <label>
              Primary action label
              <input
                key={page.id + ":" + section.id + ":cta:" + section.action.label}
                defaultValue={section.action.label}
                maxLength={60}
                onBlur={(event) => {
                  const label = event.currentTarget.value.trim();
                  if (label && label !== section.action!.label)
                    edit({
                      kind: "replace-section",
                      pageId: page.id,
                      section: {
                        ...section,
                        action: { ...section.action!, label },
                      },
                    });
                }}
              />
            </label>
            <label>
              Primary action destination
              <select
                value={section.action.href}
                onChange={(event) =>
                  edit({
                    kind: "replace-section",
                    pageId: page.id,
                    section: {
                      ...section,
                      action: { ...section.action!, href: event.target.value },
                    },
                  })
                }
              >
                {layout.pages.map((destination) => (
                  <option key={destination.path} value={destination.path}>
                    {destination.title}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        {section.type === "contact-panel" && (
          <label>
            Business enquiry email
            <input
              key={page.id + ":" + section.id + ":" + (section.email ?? "")}
              type="email"
              required
              autoComplete="email"
              defaultValue={section.email ?? ""}
              placeholder="contact@yourbusiness.com"
              onBlur={(event) => {
                const newEmail = event.currentTarget.value.trim();
                if (newEmail !== (section.email ?? "")) {
                  edit({
                    kind: "replace-section",
                    pageId: page.id,
                    section: {
                      ...section,
                      email: newEmail || undefined,
                    },
                  });
                }
              }}
            />
            <small>
              Changing this shared starter address updates matching
              contact panels across the website. Save the draft before publishing.
            </small>
          </label>
        )}
        {(section.type === "premium-hero" ||
          section.type === "editorial-story" ||
          section.type === "experience") && section.image && (
          <>
            <label>
              Illustrated artwork
              <select
                value={section.image.src}
                onChange={(event) =>
                  edit({
                    kind: "replace-section",
                    pageId: page.id,
                    section: {
                      ...section,
                      image: { ...section.image!, src: event.target.value },
                    },
                  })
                }
              >
                {artworkChoices.map((asset) => (
                  <option key={asset.ref} value={asset.ref}>{asset.label}</option>
                ))}
              </select>
            </label>
            <label>
              Image description (alt text)
              <input
                key={page.id + ":" + section.id + ":alt:" + section.image.alt}
                defaultValue={section.image.alt}
                maxLength={200}
                onBlur={(event) => {
                  const alt = event.currentTarget.value.trim();
                  if (alt && alt !== section.image!.alt)
                    edit({
                      kind: "replace-section",
                      pageId: page.id,
                      section: { ...section, image: { ...section.image!, alt } },
                    });
                }}
              />
            </label>
          </>
        )}
        {section.type === "project-gallery" && (
          <fieldset className="composition-controls" aria-label="Portfolio project cards">
            <legend>Project cards</legend>
            {section.projects.map((project, index) => (
              <div className="composition-controls" key={index}>
                <label>
                  Project {index + 1} title
                  <input
                    key={page.id + ":" + section.id + ":project:" + index + ":" + project.title}
                    defaultValue={project.title}
                    maxLength={120}
                    onBlur={(event) => {
                      const title = event.currentTarget.value.trim();
                      if (title && title !== project.title)
                        edit({
                          kind: "replace-section",
                          pageId: page.id,
                          section: {
                            ...section,
                            projects: section.projects.map((entry, i) =>
                              i === index ? { ...entry, title } : entry),
                          },
                        });
                    }}
                  />
                </label>
                <label>
                  Project {index + 1} description
                  <textarea maxLength={500}
                    key={page.id + ":" + section.id + ":projectdescription:" + index + ":" + (project.description ?? "")}
                    defaultValue={project.description ?? ""}
                    onBlur={(event) => {
                      const description = event.currentTarget.value.trim();
                      if (description !== (project.description ?? "")) edit({
                        kind: "replace-section", pageId: page.id,
                        section: { ...section, projects: section.projects.map((entry, i) =>
                          i === index ? { ...entry, description: description || undefined } : entry) },
                      });
                    }}
                  />
                </label>
                <label>
                  Project {index + 1} artwork
                  <select
                    value={project.image.src}
                    onChange={(event) =>
                      edit({
                        kind: "replace-section",
                        pageId: page.id,
                        section: {
                          ...section,
                          projects: section.projects.map((entry, i) =>
                            i === index
                              ? { ...entry, image: { ...entry.image, src: event.target.value } }
                              : entry),
                        },
                      })
                    }
                  >
                    {artworkChoices.map((asset) => (
                      <option key={asset.ref} value={asset.ref}>{asset.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Project {index + 1} image description
                  <input
                    key={page.id + ":" + section.id + ":projectalt:" + index + ":" + project.image.alt}
                    defaultValue={project.image.alt}
                    maxLength={200}
                    onBlur={(event) => {
                      const alt = event.currentTarget.value.trim();
                      if (alt && alt !== project.image.alt)
                        edit({
                          kind: "replace-section",
                          pageId: page.id,
                          section: {
                            ...section,
                            projects: section.projects.map((entry, i) =>
                              i === index
                                ? { ...entry, image: { ...entry.image, alt } }
                                : entry),
                          },
                        });
                    }}
                  />
                </label>
                <label>
                  Linked project page
                  <select
                    value={project.href ?? ""}
                    onChange={(event) =>
                      edit({
                        kind: "replace-section",
                        pageId: page.id,
                        section: {
                          ...section,
                          projects: section.projects.map((entry, i) =>
                            i === index
                              ? { ...entry, href: event.target.value || undefined }
                              : entry),
                        },
                      })
                    }
                  >
                    <option value="">No link</option>
                    {layout.pages.map((destination) => (
                      <option key={destination.path} value={destination.path}>
                        {destination.title}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ))}
          </fieldset>
        )}
        <button
          disabled={
            page.sections.indexOf(section) === 0 ||
            layout.permissions.lockedSections.includes(section.id)
          }
          onClick={() => {
            const ids = page.sections.map((s) => s.id),
              i = ids.indexOf(section.id);
            [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]];
            edit({ kind: "reorder", pageId: page.id, sectionIds: ids });
          }}
        >
          Move section up
        </button>
        {mode === "advanced" && (
          <>
            <label>
              Accent color{" "}
              <input
                type="color"
                value={layout.tokens.accent}
                onChange={(e) =>
                  edit({ kind: "token", key: "accent", value: e.target.value })
                }
              />
            </label>
            <label>
              Page composition{" "}
              <select
                value={page.responsive}
                onChange={(e) =>
                  edit({
                    kind: "responsive",
                    pageId: page.id,
                    value: e.target.value as "stack" | "asymmetric" | "gallery",
                  })
                }
              >
                <option value="stack">Stack</option>
                <option value="asymmetric">Asymmetric</option>
                <option value="gallery">Gallery</option>
              </select>
            </label>
          </>
        )}
      </fieldset>
      <fieldset
        disabled={busy}
        hidden={panel !== "design"}
        className="composition-controls studio-panel"
        aria-label="Brand appearance"
      >
        <legend>Brand appearance</legend>
        <p>Design-safe appearance controls preserve the original layout and page structure.</p>
        <label>Editing mode
          <select disabled={edits.length > 0} value={mode}
            onChange={(e) => setMode(e.target.value as "guided" | "advanced")}>
            <option value="guided">Guided</option>
            <option value="advanced">Advanced</option>
          </select>
        </label>
        {mode === "advanced" && layout.permissions.advanced.includes("tokens") && (
          <>
            {(["#243b53", "#22577a", "#3c4c77", "#7c3a49", "#285a46", "#54436b", "#222222"] as const).map((color) => (
              <button key={color} type="button" aria-label={"Use accent " + color}
                style={{ backgroundColor: color, color: "#ffffff", minHeight: 44, minWidth: 44 }}
                onClick={() => edit({ kind: "token", key: "accent", value: color })}>●</button>
            ))}
            {(["font", "scale", "radius"] as const).map((token) => (
              !layout.permissions.lockedTokens.includes(token) && (
                <label key={token}>{token}
                  <select value={layout.tokens[token]} onChange={(e) => edit({
                    kind: "token", key: token, value: e.target.value,
                  })}>
                    {(token === "font" ? ["system-sans", "editorial-serif", "condensed-sans"] :
                      token === "scale" ? ["compact", "balanced", "expressive"] :
                        ["square", "subtle", "rounded"]).map((choice) =>
                      <option key={choice} value={choice}>{choice.replaceAll("-", " ")}</option>)}
                  </select>
                </label>
              )
            ))}
          </>
        )}
      </fieldset>
      <div className="studio-preview-bar">
        <span>{edits.length ? "Unsaved local preview — not published" : "Saved draft preview"} · {page.title}</span>
        <label>Preview width
          <select value={previewWidth} onChange={(e) => setPreviewWidth(e.target.value)}>
            <option value="100%">Auto</option>
            <option value="390px">Phone</option>
            <option value="768px">Tablet</option>
            <option value="1180px">Desktop</option>
          </select>
        </label>
      </div>
      <div className="studio-preview-frame" style={{ width: previewWidth, maxWidth: "100%" }}>
      <LayoutRenderer
        blueprint={layout}
        pagePath={page.path}
        onNavigate={(path) => {
          const target = layout.pages.find((p) => p.path === path);
          if (target) {
            setPageId(target.id);
            setSectionId("");
          }
        }}
        preview
        idPrefix="studio-"
      />
      </div>
    </main>
  );
}
