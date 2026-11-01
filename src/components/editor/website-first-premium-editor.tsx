"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { LayoutRenderer } from "@/components/layout-studio/layout-renderer";
import { MediaLibrary, type MediaLibraryItem } from "@/components/editor/media-library";
import { mediaIds } from "@/lib/media/references";
import { premiumArtworkChoices } from "@/lib/layout-blueprint/premium-layouts/asset-choices";
import { premiumCandidate, premiumCandidateIds } from "@/lib/layout-blueprint/premium-layouts/catalogue-candidates";
import { resolveExternalEmbed } from "@/lib/media/embed-providers";
import {
  applyPremiumEdit, compositionRecoverySchema, premiumPathSchema,
  type PremiumEdit, type PremiumLayout, type PremiumSection,
} from "@/lib/layout-blueprint/premium-composition";
import { useWorkspaceAdapter, useWorkspaceTab } from "@/components/workspace/workspace-tab-shell";
import { WebsiteFirstPublishDialog } from "./website-first-publish-dialog";
import { WebsiteStoryStudio } from "./website-story-studio";
import type { ArticleKind } from "@/lib/content/article-model";
import {
  editableText, editableTextMax, replaceEditableText, targetFromRenderedElement,
  type TextSelection,
} from "@/lib/website-first/editable-content";
import "./website-first-premium-editor.css";

type SaveState = "saved" | "unsaved" | "saving" | "offline" | "conflict" | "failed";
type HistoryItem = { forward: PremiumEdit; reverse: PremiumEdit };

function withSectionImage(section: PremiumSection, image: { src: string; alt: string }): PremiumSection {
  switch (section.type) {
    case "premium-hero":
    case "editorial-story":
    case "experience":
      return { ...section, image };
    default:
      return section;
  }
}

function reverseEdit(layout: PremiumLayout, edit: PremiumEdit): PremiumEdit | null {
  const page = "pageId" in edit ? layout.pages.find((entry) => entry.id === edit.pageId) : null;
  if (edit.kind === "page-details") {
    const before = layout.pages.find((entry) => entry.id === edit.pageId);
    return before ? { kind: "page-details", pageId: edit.pageId, path: before.path, title: before.title, description: before.description, navigation: before.navigation } : null;
  }
  if (edit.kind === "navigation-order")
    return { kind: "navigation-order", hrefs: layout.navigation.map((item) => item.href) };
  if (edit.kind === "insert-page")
    return { kind: "remove-page", pageId: edit.page.id };
  if (edit.kind === "remove-page") {
    const before = layout.pages.find((entry) => entry.id === edit.pageId);
    return before ? { kind: "insert-page", page: before } : null;
  }
  if (edit.kind === "replace-section") {
    const before = page?.sections.find((entry) => entry.id === edit.section.id);
    return before ? { kind: "replace-section", pageId: edit.pageId, section: before } : null;
  }
  if (edit.kind === "reorder")
    return page ? { kind: "reorder", pageId: edit.pageId, sectionIds: page.sections.map((entry) => entry.id) } : null;
  if (edit.kind === "insert-section")
    return { kind: "remove-section", pageId: edit.pageId, sectionId: edit.section.id };
  if (edit.kind === "brand")
    return { kind: "brand", name: layout.identity.name };
  if (edit.kind === "business-detail")
    return { kind: "business-detail", field: edit.field,
      value: edit.field === "description" ? layout.identity.description : layout.identity.profile?.[edit.field] ?? "" };
  if (edit.kind === "business-logo")
    return { kind: "business-logo", src: layout.identity.profile?.logo?.src ?? null,
      alt: layout.identity.profile?.logo?.alt ?? null };
  return null;
}

export function WebsiteFirstPremiumEditor({
  websiteId, initial, revision, reload,
}: {
  websiteId: string; initial: PremiumLayout; revision: string; reload: () => void;
}) {
  const { accountId, activeTabId, getSnapshot, setSnapshot, clearSnapshot, setActiveTabDirty } = useWorkspaceTab();
  const key = "composition-draft:website-engine:website:" + websiteId;
  const [layout, setLayout] = useState(initial);
  const [base, setBase] = useState(revision);
  const [edits, setEdits] = useState<PremiumEdit[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [redoHistory, setRedoHistory] = useState<HistoryItem[]>([]);
  const [pageId, setPageId] = useState(initial.pages[0].id);
  const [selected, setSelected] = useState(initial.pages[0].sections[0]?.id ?? "");
  const [projectIndex, setProjectIndex] = useState<number | null>(null);
  const [field, setField] = useState<TextSelection | null>(null);
  const [fieldDraft, setFieldDraft] = useState("");
  const [showPublish, setShowPublish] = useState(false);
  const [storyKind, setStoryKind] = useState<ArticleKind|null>(null);
  const [showMedia, setShowMedia] = useState(false);
  const [showPages, setShowPages] = useState(false);
  const [showLayouts, setShowLayouts] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState("");
  const [embedUrl, setEmbedUrl] = useState("");
  const [layoutChoice, setLayoutChoice] = useState(initial.layoutId);
  useEffect(() => { const requested = new URLSearchParams(window.location.search).get("content");
    if (requested === "blog" || requested === "news") setStoryKind(requested);
  }, []);
  const [showSectionTools, setShowSectionTools] = useState(false);
  const [previewOnly, setPreviewOnly] = useState(false);
  const [ownedArtwork, setOwnedArtwork] = useState<{ ref: string; label: string }[]>([]);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [notice, setNotice] = useState("Your saved website is open.");
  const [busy, setBusy] = useState(false);
  const [previewWidth, setPreviewWidth] = useState("100%");
  const committed = useRef(initial);
  const live = useRef(true);
  const dragged = useRef("");
  const page = layout.pages.find((entry) => entry.id === pageId) ?? layout.pages[0];
  const layoutPreview = useMemo(() => {
    try {
      const candidate = premiumCandidate(layoutChoice, layout.identity.name);
      return { ...layout, layoutId: candidate.layoutId, layoutVersion: candidate.layoutVersion,
        category: candidate.category, tokens: candidate.tokens, visualExperience: candidate.visualExperience };
    } catch { return null; }
  }, [layoutChoice, layout]);
  const section = page.sections.find((entry) => entry.id === selected) ?? page.sections[0];

  useEffect(() => {
    live.current = true;
    const restored = compositionRecoverySchema.safeParse(getSnapshot<unknown>(key));
    if (restored.success && restored.data.revision === revision) {
      try {
        const pending = restored.data.edits.reduce(
          (current, change) => applyPremiumEdit(current, restored.data.mode, change), initial,
        );
        setLayout(pending);
        setEdits(restored.data.edits);
        setSaveState("unsaved");
        setNotice("Recovered changes from this workspace. They have not been saved to the server.");
        setActiveTabDirty(true);
      } catch {
        setNotice("Stored edits could not be recovered. The saved website was not overwritten.");
      }
    } else if (getSnapshot(key)) {
      setSaveState("conflict");
      setNotice("An older recovery copy was found. Review before loading the current draft.");
    }
    return () => { live.current = false; };
  }, [initial, revision, key, getSnapshot, setActiveTabDirty]);

  useEffect(() => {
    if (!edits.length) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [edits.length]);

  useEffect(() => {
    if (window.location.hash === "#media-library") setShowMedia(true);
    if (window.location.hash === "#pages-navigation") setShowPages(true);
  }, []);

  useEffect(() => {
    function online() { if (saveState === "offline") setSaveState("unsaved"); }
    function offline() { if (edits.length) setSaveState("offline"); }
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => { window.removeEventListener("online", online); window.removeEventListener("offline", offline); };
  }, [saveState, edits.length]);

  function perform(change: PremiumEdit, record = true) {
    if (busy || saveState === "conflict") return;
    if (edits.length >= 40) { setNotice("Save these changes before continuing."); return; }
    try {
      const inverse = reverseEdit(layout, change);
      const next = applyPremiumEdit(layout, "advanced", change);
      const pending = [...edits, change];
      setLayout(next);
      setEdits(pending);
      if (record && inverse) {
        setHistory((previous) => [...previous, { forward: change, reverse: inverse }]);
        setRedoHistory([]);
      }
      setSaveState(navigator.onLine ? "unsaved" : "offline");
      setActiveTabDirty(true);
      setSnapshot(key, { version: 1, mode: "advanced", revision: base, edits: pending });
      setNotice("Unsaved changes · preview reflects your edits.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "This change is not permitted by the Layout.");
    }
  }

  function undo() {
    const last = history.at(-1);
    if (!last || busy || saveState === "conflict") return;
    perform(last.reverse, false);
    setHistory((items) => items.slice(0, -1));
    setRedoHistory((items) => [...items, last]);
  }
  function redo() {
    const last = redoHistory.at(-1);
    if (!last || busy || saveState === "conflict") return;
    perform(last.forward, false);
    setRedoHistory((items) => items.slice(0, -1));
    setHistory((items) => [...items, last]);
  }

  const save = useCallback(async () => {
    if (busy || saveState === "conflict" || !edits.length || !navigator.onLine) {
      if (!navigator.onLine && edits.length) setSaveState("offline");
      return false;
    }
    setBusy(true);
    setSaveState("saving");
    try {
      const response = await fetch("/api/websites/" + encodeURIComponent(websiteId) + "/draft", {
        method: "PATCH",
        headers: { "content-type": "application/json", "if-match": base,
          ...(accountId ? { "x-lucia-workspace-account": accountId } : {}) },
        body: JSON.stringify({ kind: "composition-edit", mode: "advanced", edits }),
      });
      const result = await response.json();
      if (!live.current) return false;
      if (!response.ok) {
        if (response.status === 409) setSaveState("conflict");
        else setSaveState("failed");
        setNotice(result.error || "Save failed. Your changes are still on this device.");
        return false;
      }
      committed.current = result.draft;
      setLayout(result.draft);
      setBase(result.revision);
      setEdits([]);
      setActiveTabDirty(false);
      clearSnapshot(key);
      setSaveState("saved");
      setNotice("Saved to your website · not published.");
      return true;
    } catch {
      if (live.current) {
        setSaveState(navigator.onLine ? "failed" : "offline");
        setNotice("Connection interrupted; your edits are not yet confirmed on the server.");
      }
      return false;
    } finally {
      if (live.current) setBusy(false);
    }
  }, [websiteId, base, accountId, edits, busy, saveState, setActiveTabDirty, clearSnapshot, key]);

  async function applyLayoutChoice() {
    if (!layoutPreview || busy || edits.length || saveState !== "saved" || layoutChoice === layout.layoutId) return;
    if (!window.confirm("Apply this design to your existing website? Your pages, navigation, text, images and media references will be preserved.")) return;
    setBusy(true); setSaveState("saving");
    try {
      const response = await fetch("/api/websites/" + encodeURIComponent(websiteId) + "/draft", {
        method: "PATCH",
        headers: { "content-type": "application/json", "if-match": base,
          ...(accountId ? { "x-lucia-workspace-account": accountId } : {}) },
        body: JSON.stringify({ kind: "assign-layout", layoutId: layoutChoice }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 409) setSaveState("conflict");
        else setSaveState("failed");
        setNotice(result.error || "The new design could not be applied. Your saved website is unchanged.");
        return;
      }
      committed.current = result.draft;
      setLayout(result.draft); setBase(result.revision); setLayoutChoice(result.draft.layoutId);
      setHistory([]); setRedoHistory([]); setEdits([]);
      clearSnapshot(key); setActiveTabDirty(false); setSaveState("saved");
      setNotice("Design changed. Your existing pages, navigation and content were preserved. The website is not published.");
      setShowLayouts(false);
    } catch {
      setSaveState("failed");
      setNotice("The design change could not be confirmed. Your previous saved website remains unchanged.");
    } finally { setBusy(false); }
  }

  function updatePageDetails(pageId: string, patch: { path?: string; title?: string; description?: string; navigation?: boolean }) {
    const target = layout.pages.find((entry) => entry.id === pageId);
    if (!target) return;
    const title = (patch.title ?? target.title).trim();
    const description = (patch.description ?? target.description).trim();
    const rawPath = (patch.path ?? target.path).trim();
    const nextPath = rawPath === "/" ? "/" : rawPath.startsWith("/") ? rawPath : "/" + rawPath;
    const navigation = patch.navigation ?? target.navigation;
    if (navigation && !target.navigation && layout.navigation.length >= 12) { setNotice("Website navigation can contain up to 12 links. Remove one before adding another."); return; }
    if (!title || !description) { setNotice("Page title and description cannot be empty."); return; }
    if (!premiumPathSchema.safeParse(nextPath).success || /^\/(?:api|workspace|staff|admin|auth|login|logout|site|tenant-site-internal|_next)(?:\/|$)/.test(nextPath)) {
      setNotice("Use a safe page address such as /about or /our-story.");
      return;
    }
    if ((target.path === "/") !== (nextPath === "/")) { setNotice("Only the homepage can use the root address (/)."); return; }
    if (layout.pages.some((entry) => entry.id !== pageId && entry.path === nextPath)) { setNotice("That page address is already in use."); return; }
    if (title === target.title && description === target.description && navigation === target.navigation && nextPath === target.path) return;
    perform({ kind: "page-details", pageId, path: nextPath, title, description, navigation });
  }

  function addPage() {
    if (!layout.permissions.advanced.includes("pages")) { setNotice("This website's current design does not allow page-structure changes."); return; }
    if (layout.pages.length >= 30) { setNotice("This website has reached its 30-page limit."); return; }
    const title = newPageTitle.trim();
    if (!title) { setNotice("Enter a name for the new page."); return; }
    const slug = title.toLowerCase().normalize("NFKD").replace(/[\\u0300-\\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
    if (!slug) { setNotice("Choose a page name containing letters or numbers."); return; }
    const path = "/" + slug;
    if (layout.pages.some((entry) => entry.path === path)) { setNotice("A page already uses that address."); return; }
    const id = "page-" + crypto.randomUUID().replaceAll("-", "");
    const sectionId = id + "-intro";
    perform({ kind: "insert-page", page: { id, path, title: title.slice(0, 120),
      description: "A new page on " + layout.identity.name + ".", navigation: layout.navigation.length < 12,
      responsive: "stack", sections: [{ id: sectionId, type: "editorial-story", variant: "narrow",
        heading: title.slice(0, 150), body: "Add the information visitors need on this page." }] } });
    setNewPageTitle(""); setPageId(id); setSelected(sectionId); setField(null);
  }

  function removePage(targetId: string) {
    const target = layout.pages.find((entry) => entry.id === targetId);
    if (!target || target.path === "/") return;
    if (!window.confirm("Remove the " + target.title + " page and its navigation link?")) return;
    perform({ kind: "remove-page", pageId: targetId });
    if (pageId === targetId) {
      const home = layout.pages.find((entry) => entry.path === "/");
      if (home) setPageId(home.id);
      setSelected("");
    }
  }

  useEffect(() => {
    if (!edits.length || busy || saveState !== "unsaved" || !navigator.onLine) return;
    const timer = window.setTimeout(() => { void save(); }, 1100);
    return () => window.clearTimeout(timer);
  }, [edits, busy, save, saveState]);

  const discard = useCallback(() => {
    clearSnapshot(key);
    setEdits([]);
    setHistory([]);
    setRedoHistory([]);
    setLayout(committed.current);
    setActiveTabDirty(false);
    setSaveState("saved");
  }, [clearSnapshot, key, setActiveTabDirty]);
  useWorkspaceAdapter({
    save: edits.length && !busy && saveState !== "conflict" ? save : undefined,
    canSuspend: () => Boolean(activeTabId && getSnapshot(key)),
    discard,
  });

  function reorder(sectionId: string, delta: number) {
    const index = page.sections.findIndex((item) => item.id === sectionId);
    const other = index + delta;
    if (index < 0 || other < 0 || other >= page.sections.length) return;
    const ids = page.sections.map((item) => item.id);
    [ids[index], ids[other]] = [ids[other], ids[index]];
    perform({ kind: "reorder", pageId: page.id, sectionIds: ids });
  }

  function updateField(value: string) {
    if (!section || !field) return;
    try {
      const updated = replaceEditableText(section, field, value);
      // Validate on the existing schema; a rejected edit remains in the input.
      applyPremiumEdit(layout, "advanced", { kind: "replace-section", pageId: page.id, section: updated });
      perform({ kind: "replace-section", pageId: page.id, section: updated });
      setField(null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "This text cannot be used in this Layout.");
    }
  }

  function clickWebsite(event: React.MouseEvent<HTMLDivElement>) {
    if (previewOnly || busy || saveState === "conflict") return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const container = target.closest<HTMLElement>("[data-section-type]");
    if (!container) return;
    const item = page.sections.find((candidate) => "studio-" + candidate.id === container.id);
    if (!item) return;
    setSelected(item.id);
    setProjectIndex(null);
    if (target.closest("video")) { setShowMedia(true); return; }
    if (target.closest("img")) {
      if (item.type === "project-gallery") {
        const article = target.closest("article");
        const index = article && article.parentElement ? Array.from(article.parentElement.children).indexOf(article) : -1;
        if (index >= 0 && index < item.projects.length) setProjectIndex(index);
      }
      setShowMedia(true); return;
    }
    const selection = targetFromRenderedElement(item, target, container);
    if (selection) {
      if (target.closest("a")) {
        event.preventDefault();
        event.stopPropagation();
      }
      const value = editableText(item, selection);
      if (value !== null) {
        setField(selection);
        setFieldDraft(value);
        return;
      }
    }
    if (target.closest("a,button,summary")) return;
    setShowSectionTools(true);
  }

  function addSection() {
    const id = "story-" + crypto.randomUUID().slice(0, 16);
    perform({ kind: "insert-section", pageId: page.id, index: page.sections.length,
      section: { id, type: "editorial-story", variant: "narrow",
        heading: "Add your own heading", body: "Tell visitors something useful about your business." } });
    setSelected(id);
    setShowSectionTools(true);
  }

  const fieldValue = field && section ? editableText(section, field) : null;
  const selectedImage = section?.type === "project-gallery" && projectIndex !== null
    ? section.projects[projectIndex]?.image
    : section && "image" in section ? section.image : undefined;
  function replaceImage(image: { src: string; alt: string }) {
    if (!section) return;
    const replacement: PremiumSection = section.type === "project-gallery" && projectIndex !== null
      ? { ...section, projects: section.projects.map((item, index) =>
          index === projectIndex ? { ...item, image } : item) }
      : withSectionImage(section, image);
    perform({ kind: "replace-section", pageId: page.id, section: replacement });
  }

  function insertUploadedMedia(item: MediaLibraryItem) {
    const id = "media-" + crypto.randomUUID().replaceAll("-", "");
    const isImage = item.kind === "image";
    const isVideo = item.kind === "video";
    const replacement = { id, type: "media-embed" as const, variant: "wide" as const,
      kind: isImage ? "image" as const : isVideo ? "video" as const : "document" as const,
      title: (item.original_name || item.alt).slice(0, 120),
      ...((isImage ? item.alt : item.caption) ? { description: (isImage ? item.alt : item.caption)!.slice(0, 500) } : {}),
      mediaRef: item.ref,
      ...(isVideo ? { mime: item.mime === "video/webm" ? "video/webm" as const : "video/mp4" as const } : {}) };
    if (section?.type === "media-embed" && section.kind === replacement.kind)
      perform({ kind: "replace-section", pageId: page.id, section: { ...replacement, id: section.id, variant: section.variant } });
    else
      perform({ kind: "insert-section", pageId: page.id, index: page.sections.length, section: replacement });
    setSelected(section?.type === "media-embed" && section.kind === replacement.kind ? section.id : id);
    setShowSectionTools(true); setShowMedia(false);
    setNotice(isImage ? "Image section added to this page. Save your website to keep it."
      : isVideo ? "Video section added to this page. Save your website to keep it."
      : "Download section added to this page. Save your website to keep it.");
  }

  function insertExternalEmbed() {
    const resolved = resolveExternalEmbed(embedUrl);
    if (!resolved) { setNotice("That URL is not a supported secure embed. Try YouTube, Vimeo, Spotify, SoundCloud, Apple Podcasts, TikTok or Instagram."); return; }
    const id = "embed-" + crypto.randomUUID().replaceAll("-", "");
    if (section?.type === "media-embed" && section.kind === "embed")
      perform({ kind: "replace-section", pageId: page.id, section: { ...section, title: resolved.title, url: embedUrl.trim() } });
    else
      perform({ kind: "insert-section", pageId: page.id, index: page.sections.length,
        section: { id, type: "media-embed", variant: "wide", kind: "embed",
          title: resolved.title, url: embedUrl.trim() } });
    setSelected(section?.type === "media-embed" && section.kind === "embed" ? section.id : id);
    setShowSectionTools(true); setEmbedUrl(""); setShowMedia(false);
    setNotice(section?.type === "media-embed" && section.kind === "embed" ? "Embed updated on this page. Save your website to keep it." : "Responsive " + resolved.provider + " embed added to this page. Save your website to keep it.");
  }
  const options = [...premiumArtworkChoices, ...ownedArtwork];
  return <main className="website-first-editor">
    <header className="website-first-editor-toolbar">
      <Link href="/workspace/websites" aria-label="Back to your websites">← Websites</Link>
      <label>Page <select value={page.id} onChange={(event) => { setPageId(event.target.value); setSelected(""); setField(null); }}>
        {layout.pages.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
      </select></label>
      <button type="button" onClick={() => { setShowPages((value) => !value); setShowLayouts(false); }}>Pages & Navigation</button>
      <button type="button" onClick={() => { setShowLayouts((value) => !value); setShowPages(false); setLayoutChoice(layout.layoutId); }}>Change Website Design</button>
      <button type="button" onClick={undo} disabled={!history.length || busy} aria-label="Undo edit">↶ Undo</button>
      <button type="button" onClick={redo} disabled={!redoHistory.length || busy} aria-label="Redo edit">↷ Redo</button>
      <span className={"website-first-editor-status state-" + saveState} role="status" aria-live="polite">{saveState === "saved" ? "✓ Saved" : saveState === "unsaved" ? "● Unsaved" : saveState === "saving" ? "Saving…" : saveState === "offline" ? "Offline · unsaved" : saveState === "conflict" ? "Conflict" : "Save failed"}</span>
      <button type="button" onClick={() => { void save(); }} disabled={!edits.length || busy || saveState === "conflict"}>Save now</button>
      <button type="button" onClick={() => { setPreviewOnly(!previewOnly); setField(null); }}>{previewOnly ? "Return to Edit" : "Preview"}</button>
      <button type="button" onClick={() => { setStoryKind("blog"); setPreviewOnly(false); }}>Write Blog</button>
      <button type="button" onClick={() => { setStoryKind("news"); setPreviewOnly(false); }}>Publish News</button>
      <button type="button" className="website-first-editor-publish" onClick={() => setShowPublish(true)}
        disabled={busy || edits.length > 0 || saveState !== "saved"}>Publish</button>
      {(edits.length > 0 || saveState !== "saved") && <span className="website-first-editor-not-ready">Save before publishing</span>}
      <Link href={{ pathname: "/editor", query: { websiteId, studio: "classic" } }}>Next: Detailed Settings →</Link>
      <span title="Full source editing will arrive in Phase 16">Advanced Mode · Phase 16</span>
    </header>
    <p className="website-first-editor-notice" role="status">{notice}</p>
    {!previewOnly && !storyKind && <section className="website-first-editor-next-step" aria-label="Website creation steps">
      <div><span>STEP 1 OF 4 · DESIGN</span><h2>Build your website</h2>
        <p>Finish your visual design and page structure here. Detailed Settings is the next stage before final preview and publishing.</p></div>
      <ol><li aria-current="step">Design & content</li><li>Pages & navigation</li><li>Detailed Settings</li><li>Preview & publish</li></ol>
      <Link href={{ pathname: "/editor", query: { websiteId, studio: "classic" } }}>Continue to Detailed Settings →</Link>
    </section>}
    {!previewOnly && showPages && <section className="website-first-editor-panel" aria-label="Pages and navigation">
      <header><div><h2>Pages & Navigation</h2><p>Manage the pages on this website. Selecting a page opens it in the same live editor.</p></div>
        <button type="button" onClick={() => setShowPages(false)}>Close</button></header>
      <form className="website-first-add-page" onSubmit={(event) => { event.preventDefault(); addPage(); }}>
        <label>New page name<input value={newPageTitle} onChange={(event) => setNewPageTitle(event.target.value)}
          maxLength={120} placeholder="About us" required disabled={!layout.permissions.advanced.includes("pages")} /></label>
        <button type="submit" disabled={busy || saveState === "conflict" || !newPageTitle.trim() || !layout.permissions.advanced.includes("pages")}>+ Add page</button>
      </form>
      <div className="website-first-page-list">{layout.pages.map((item) => <article key={item.id}>
        <div className="website-first-page-heading"><button type="button" aria-pressed={page.id === item.id}
          onClick={() => { setPageId(item.id); setSelected(""); setField(null); }}>{item.title}</button>
          <span>{item.path}</span></div>
        <label>Page address<input key={item.id + item.path} defaultValue={item.path} maxLength={180}
          disabled={!layout.permissions.advanced.includes("pages") || item.path === "/"}
          onBlur={(event) => updatePageDetails(item.id, { path: event.target.value })}/></label>
        <label>Page title<input key={item.id + item.title} defaultValue={item.title} maxLength={120} disabled={!layout.permissions.advanced.includes("pages")}
          onBlur={(event) => updatePageDetails(item.id, { title: event.target.value })}/></label>
        <label>Search description<input key={item.id + item.description} defaultValue={item.description} maxLength={160} disabled={!layout.permissions.advanced.includes("pages")}
          onBlur={(event) => updatePageDetails(item.id, { description: event.target.value })}/></label>
        <label className="website-first-page-nav-toggle"><input type="checkbox" checked={item.navigation} disabled={!layout.permissions.advanced.includes("pages")}
          onChange={(event) => updatePageDetails(item.id, { navigation: event.target.checked })}/> Show in website navigation</label>
        {item.path !== "/" && <button type="button" onClick={() => removePage(item.id)} disabled={busy || saveState === "conflict" || !layout.permissions.advanced.includes("pages")}>Remove page</button>}
      </article>)}</div>
      <h3>Navigation order</h3>
      <ol className="website-first-navigation-list">{layout.navigation.map((item, index) => <li key={item.href}>
        <span>{item.label}</span><small>{item.href}</small>
        <button type="button" disabled={busy || index === 0 || !layout.permissions.advanced.includes("pages")} onClick={() => { const hrefs = layout.navigation.map((entry) => entry.href); [hrefs[index-1], hrefs[index]] = [hrefs[index], hrefs[index-1]]; perform({ kind: "navigation-order", hrefs }); }}>↑</button>
        <button type="button" disabled={busy || index === layout.navigation.length-1 || !layout.permissions.advanced.includes("pages")} onClick={() => { const hrefs = layout.navigation.map((entry) => entry.href); [hrefs[index+1], hrefs[index]] = [hrefs[index], hrefs[index+1]]; perform({ kind: "navigation-order", hrefs }); }}>↓</button>
      </li>)}</ol>
    </section>}
    {!previewOnly && showLayouts && <section className="website-first-editor-panel" aria-label="Change website design">
      <header><div><h2>Change Website Design</h2><p>Preview a different visual system using your existing website content. Your pages, paths, navigation, text and media stay in place.</p></div>
        <button type="button" onClick={() => setShowLayouts(false)}>Close</button></header>
      <p className="website-first-layout-candidate-note">These are Phase 14 candidate design systems. Applying one updates your saved draft only; it does not publish the site or certify the candidate for public release.</p>
      {!layout.permissions.advanced.includes("tokens") && <p role="status">This website's design permissions do not allow layout changes. You can still preview the candidate designs.</p>}
      <label>Choose a design<select value={layoutChoice} onChange={(event) => setLayoutChoice(event.target.value)}>
        {premiumCandidateIds.map((id) => <option key={id} value={id}>{id.replace("lucia.layout.", "").replace(/-/g, " ").replace(/\\b\\w/g, (letter) => letter.toUpperCase())}</option>)}
      </select></label>
      {layoutPreview ? <div className="website-first-layout-preview"><LayoutRenderer blueprint={layoutPreview} pagePath={page.path} preview idPrefix="layout-choice-"/></div> : <p role="alert">This design preview is unavailable.</p>}
      <div className="website-first-layout-actions"><button type="button" onClick={() => setLayoutChoice(layout.layoutId)}>Restore current design</button>
        <button type="button" disabled={busy || edits.length > 0 || saveState !== "saved" || layoutChoice === layout.layoutId || !layoutPreview || !layout.permissions.advanced.includes("tokens")}
          onClick={() => void applyLayoutChoice()}>{busy ? "Applying design…" : "Apply to existing website"}</button></div>
      {(edits.length > 0 || saveState !== "saved") && <p>Save your current edits before changing the website design.</p>}
    </section>}

    {saveState === "conflict" && <button type="button" onClick={() => {
      if (window.confirm("Discard local edits and load the latest saved website?")) { discard(); reload(); }
    }}>Load latest saved website</button>}
    {storyKind && <WebsiteStoryStudio websiteId={websiteId} accountId={accountId} initialKind={storyKind} onClose={() => setStoryKind(null)} />}
    {!previewOnly && !storyKind && <div className="website-first-editor-tools">
      <button type="button" onClick={() => setShowSectionTools((value) => !value)}>Sections {showSectionTools ? "▴" : "▾"}</button>
      <button type="button" onClick={addSection} disabled={busy || saveState === "conflict"}>+ Add Section</button>
      <button type="button" onClick={() => setStoryKind("blog")}>Write Blog</button>
      <button type="button" onClick={() => setStoryKind("news")}>Publish News</button>
      <button type="button" onClick={() => setShowMedia((value) => !value)}>Manage Media</button>
      <label>Device preview <select value={previewWidth} onChange={(e) => setPreviewWidth(e.target.value)}>
        <option value="100%">Auto</option><option value="390px">Phone</option>
        <option value="768px">Tablet</option><option value="1180px">Desktop</option>
      </select></label>
    </div>}
    {!previewOnly && !storyKind && showSectionTools && <div className="website-first-editor-sections" aria-label="Rearrange website sections">
      {page.sections.map((item, index) => {
        const locked = layout.permissions.lockedSections.includes(item.id);
        return <div key={item.id} draggable={!locked} onDragStart={() => { dragged.current = item.id; }}
          onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
            event.preventDefault();
            const oldIndex = page.sections.findIndex((candidate) => candidate.id === dragged.current);
            if (oldIndex >= 0 && oldIndex !== index) {
              const ids = page.sections.map((candidate) => candidate.id);
              ids.splice(oldIndex, 1); ids.splice(index, 0, dragged.current);
              perform({ kind: "reorder", pageId: page.id, sectionIds: ids });
            }
            dragged.current = "";
          }}>
          <button type="button" aria-pressed={selected === item.id} onClick={() => { setSelected(item.id); setField(null); }} title="Select section">
            {locked ? "🔒" : "⠿"} {"heading" in item ? item.heading : "Trust indicators"}</button>
          <button type="button" onClick={() => reorder(item.id, -1)} disabled={busy || index === 0 || locked || (index > 0 && layout.permissions.lockedSections.includes(page.sections[index - 1].id))} aria-label="Move section up">↑</button>
          <button type="button" onClick={() => reorder(item.id, 1)} disabled={busy || index === page.sections.length - 1 || locked || (index + 1 < page.sections.length && layout.permissions.lockedSections.includes(page.sections[index + 1].id))} aria-label="Move section down">↓</button>
        </div>;
      })}
    </div>}
    {!previewOnly && !storyKind && field && section && fieldValue !== null && <div className="website-first-inline-control" role="group" aria-label="Edit selected website text">
      <label>Edit ${field.field.replaceAll("-", " ")} on this website
        <textarea key={page.id + section.id + field.field + (field.index ?? "")}
          value={fieldDraft} onChange={(event) => setFieldDraft(event.target.value)}
          autoFocus maxLength={editableTextMax(section, field.field)}
          onKeyDown={(event) => { if (event.key === "Escape") setField(null); if ((event.ctrlKey || event.metaKey) && event.key === "Enter") updateField(fieldDraft); }} /></label>
      <button type="button" onClick={() => updateField(fieldDraft)} disabled={busy || saveState === "conflict" || fieldDraft === fieldValue}>Apply change</button>
      <button type="button" onClick={() => setField(null)}>Cancel</button>
    </div>}
    {!previewOnly && !storyKind && showMedia && <section id="media-library" className="website-first-editor-media" aria-label="Website image replacement">
      <div className="website-first-editor-media-header"><h2>Media & artwork</h2><button type="button" onClick={() => setShowMedia(false)}>Close</button></div>
      {selectedImage && section && <div className="website-first-editor-media-picker">
        <p>Choose an approved image for the selected section.</p>
        <label>Image<select value={selectedImage.src} onChange={(e) => replaceImage({ ...selectedImage, src: e.target.value })}>
          {options.map((option) => <option key={option.ref} value={option.ref}>{option.label}</option>)}</select></label>
        <label>Image description <input key={selectedImage.alt} defaultValue={selectedImage.alt} maxLength={200}
          onBlur={(e) => { const alt = e.target.value.trim(); if (alt && alt !== selectedImage.alt) replaceImage({ ...selectedImage, alt }); }} /></label>
      </div>}
      <div className="website-first-editor-embed-tools">
        <label>Embed external content<input type="url" value={embedUrl} onChange={(event) => setEmbedUrl(event.target.value)}
          placeholder="Paste a YouTube, Spotify, Vimeo or other supported link" /></label>
        <button type="button" onClick={insertExternalEmbed} disabled={!embedUrl.trim() || busy || saveState === "conflict"}>Add embed to page</button>
        <p>Supported providers: YouTube, Vimeo, Spotify, SoundCloud, Apple Podcasts, TikTok and Instagram.</p>
      </div>
      {accountId ? <MediaLibrary websiteId={websiteId} accountId={accountId} onChange={setOwnedArtwork}
        protectedIds={mediaIds(layout)} onInsert={insertUploadedMedia} insertLabel="Add to website" /> : <p>Media uploads require an authenticated website session.</p>}
    </section>}
    <div hidden={Boolean(storyKind)} className="website-first-editor-canvas" style={{ width: previewWidth, maxWidth: "100%" }}
      onClickCapture={clickWebsite} aria-label={previewOnly ? "Website preview" : "Click any heading or paragraph in your actual website to edit"}>
      <LayoutRenderer blueprint={layout} pagePath={page.path} preview idPrefix="studio-"
        onNavigate={(path) => { const target = layout.pages.find((item) => item.path === path);
          if (target) { setPageId(target.id); setSelected(""); setField(null); } }} />
    </div>
    {!previewOnly && <p className="website-first-editor-hint">Tap any heading, service description, project title or paragraph to edit it. Choose an image to replace it, or rearrange sections.</p>}
    {showPublish && <WebsiteFirstPublishDialog websiteId={websiteId} accountId={accountId} onClose={() => setShowPublish(false)} />}
  </main>;
}
