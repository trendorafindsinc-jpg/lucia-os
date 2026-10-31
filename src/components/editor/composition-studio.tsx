"use client";
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
  if (isPremium(loaded.draft))
    return (
      <CompositionEditor
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
  const [layout, setLayout] = useState(initial),
    [edits, setEdits] = useState<PremiumEdit[]>([]),
    [base, setBase] = useState(revision);
  const [pageId, setPageId] = useState(initial.pages[0].id),
    [sectionId, setSectionId] = useState(initial.pages[0].sections[0].id);
  const [mode, setMode] = useState<"guided" | "advanced">("guided"),
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
            change.pageId === previous.pageId));
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
      <header className="composition-controls">
        <h1>Layout Studio</h1>
        <p>
          Structural demonstration · Full visual customization follows in later
          phases.
        </p>
        <p role="status" aria-live="polite">
          {notice}
        </p>
        <button disabled={busy || conflict || !edits.length} onClick={save}>
          Save draft
        </button>
        <WorkspaceAppLink href={`/publish?websiteId=${websiteId}`}>
          Preview and publish saved draft
        </WorkspaceAppLink>
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
      <fieldset
        disabled={busy}
        className="composition-controls"
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
        {"heading" in section && (
          <label>
            Heading{" "}
            <input
              maxLength={150}
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
              maxLength={800}
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
                {premiumArtworkChoices.map((asset) => (
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
                    {premiumArtworkChoices.map((asset) => (
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
      <p>Unsaved preview · Publishing uses the confirmed saved draft.</p>
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
    </main>
  );
}
