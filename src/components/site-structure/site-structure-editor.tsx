"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { addPage, addReusableSection, makeInitialStructure, moveReusableSection, removePage, reusableSectionLibrary, setHomepage, siteStructureSchema, toggleNavigationPage, type ReusableSectionType, type SitePage, type SiteStructure } from "@/lib/site-structure/structure";

export function SiteStructureEditor() {
  const [structure, setStructure] = useState<SiteStructure>(() => makeInitialStructure());
  const [selectedPageId, setSelectedPageId] = useState("home");
  const [newPageTitle, setNewPageTitle] = useState("");
  const [notice, setNotice] = useState("");
  const [websiteId, setWebsiteId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const selectedPage = structure.pages.find((page) => page.id === selectedPageId) ?? structure.pages[0];
  const validation = useMemo(() => siteStructureSchema.safeParse(structure), [structure]);

  useEffect(() => {
    const requestedWebsiteId = new URLSearchParams(window.location.search).get("websiteId");
    if (!requestedWebsiteId) return;
    setWebsiteId(requestedWebsiteId);
    setIsLoading(true);
    fetch(`/api/websites/${encodeURIComponent(requestedWebsiteId)}/structure`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Couldn't load the saved page structure.");
        const checked = siteStructureSchema.safeParse(payload.structure);
        if (!checked.success) throw new Error("The saved page structure is invalid. It has not been changed.");
        setStructure(checked.data);
        setSelectedPageId(checked.data.homePageId);
        setIsDirty(false);
        setLoadFailed(false);
      })
      .catch((error: unknown) => {
        setLoadFailed(true);
        setNotice(error instanceof Error ? `${error.message} Saving is disabled to protect existing data.` : "Couldn't load the saved structure. Saving is disabled to protect existing data.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function saveStructure() {
    if (!websiteId || isLoading || loadFailed || !validation.success) return;
    setIsSaving(true);
    setNotice("");
    try {
      const response = await fetch(`/api/websites/${encodeURIComponent(websiteId)}/structure`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(validation.data),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Couldn't save page structure.");
      setIsDirty(false);
      setNotice("Page structure saved to this website's workspace. Publishing remains a separate step.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Couldn't save page structure. Your last saved version remains unchanged.");
    } finally {
      setIsSaving(false);
    }
  }

  function updatePage(pageId: string, update: (page: SitePage) => SitePage) {
    setStructure((current) => ({ ...current, pages: current.pages.map((page) => page.id === pageId ? update(page) : page) }));
    setIsDirty(true);
    setNotice("");
  }

  function createPage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = addPage(structure, newPageTitle);
    if (next === structure) {
      setNotice("Enter a page name. A website can contain up to 50 pages.");
      return;
    }
    const added = next.pages[next.pages.length - 1];
    setStructure(next);
    setIsDirty(true);
    setSelectedPageId(added.id);
    setNewPageTitle("");
    setNotice(`“${added.title}” was added to this local draft.`);
  }

  function deletePage() {
    if (selectedPage.id === structure.homePageId || structure.pages.length === 1) {
      setNotice("The homepage cannot be deleted. Choose another page first if you want to remove it.");
      return;
    }
    const next = removePage(structure, selectedPage.id);
    setStructure(next);
    setIsDirty(true);
    setSelectedPageId(next.homePageId);
    setNotice("Page removed from this local draft.");
  }

  function addSection(type: ReusableSectionType) {
    updatePage(selectedPage.id, (page) => addReusableSection(page, type));
    setNotice(`${reusableSectionLibrary.find((item) => item.type === type)?.label ?? "Section"} added to the page.`);
  }

  return (
    <main className="structure-page">
      <header className="structure-topbar">
        <Link className="wordmark" href="/" aria-label="LUCIA OS home"><span className="brand-mark" aria-hidden="true">L</span><span>LUCIA <span className="muted-word">OS</span></span></Link>
        <div className="structure-top-actions"><span className="structure-local-pill">{isLoading ? "Loading saved structure…" : loadFailed ? "Saved structure unavailable" : websiteId ? (isDirty ? "Unsaved changes" : "Saved to workspace") : "Local draft · Not saved"}</span>{websiteId && <button type="button" className="structure-back-link" onClick={saveStructure} disabled={isLoading || loadFailed || isSaving || !isDirty || !validation.success}>{isSaving ? "Saving…" : "Save structure"}</button>}<Link href={websiteId ? `/editor?websiteId=${encodeURIComponent(websiteId)}` : "/editor"} className="structure-back-link">Back to visual editor</Link></div>
      </header>
      <section className="structure-intro">
        <p className="eyebrow">PHASE 10 · SITE STRUCTURE</p>
        <h1>Build the pages behind your website.</h1>
        <p>Create a clear page structure, choose what appears in your navigation, and assemble pages from reusable sections. {websiteId ? "Save changes to this website's private draft; publishing is always separate." : "This is a local prototype until you open a saved website from your workspace."}</p>
      </section>
      <div className="structure-layout">
        <aside className="structure-sidebar" aria-label="Website pages">
          <div className="structure-panel-title"><div><span className="structure-kicker">SITE MAP</span><h2>Pages</h2></div><span>{structure.pages.length}/50</span></div>
          <div className="structure-page-list">
            {structure.pages.map((page) => <button type="button" key={page.id} className={page.id === selectedPage.id ? "structure-page-choice is-active" : "structure-page-choice"} onClick={() => { setSelectedPageId(page.id); setNotice(""); }}><span className="structure-page-icon" aria-hidden="true">▤</span><span className="structure-page-choice-copy"><strong>{page.title}</strong><small>{page.slug ? `/${page.slug}` : "/"}{page.id === structure.homePageId ? " · Homepage" : ""}</small></span><span aria-hidden="true">›</span></button>)}
          </div>
          <form className="structure-add-page" onSubmit={createPage}><label htmlFor="new-page-title">Add a page</label><input id="new-page-title" value={newPageTitle} onChange={(event) => setNewPageTitle(event.target.value)} maxLength={60} placeholder="e.g. Our team" /><button type="submit" disabled={structure.pages.length >= 50}>+ Add page</button></form>
          <div className="structure-home-action"><button type="button" disabled={selectedPage.id === structure.homePageId} onClick={() => { setStructure((current) => setHomepage(current, selectedPage.id)); setIsDirty(true); setNotice(`${selectedPage.title} is now the homepage in this draft.`); }}>Set as homepage</button><button type="button" className="structure-delete" disabled={selectedPage.id === structure.homePageId || structure.pages.length === 1} onClick={deletePage}>Delete page</button></div>
        </aside>
        <section className="structure-main">
          <div className="structure-editor-card">
            <div className="structure-card-heading"><div><span className="structure-kicker">PAGE SETTINGS</span><h2>{selectedPage.title}</h2></div><span className="structure-route">{selectedPage.slug ? `/${selectedPage.slug}` : "/"}</span></div>
            <div className="structure-fields">
              <label>Page title<input value={selectedPage.title} maxLength={60} onChange={(event) => updatePage(selectedPage.id, (page) => ({ ...page, title: event.target.value }))} /></label>
              <label>Page address<input value={selectedPage.slug} maxLength={60} disabled={selectedPage.id === structure.homePageId} onChange={(event) => updatePage(selectedPage.id, (page) => ({ ...page, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/--+/g, "-") }))} placeholder="page-address" /><small>The homepage always uses the root address (/).</small></label>
            </div>
          </div>
          <div className="structure-editor-card">
            <div className="structure-card-heading"><div><span className="structure-kicker">PAGE CONTENT</span><h2>Reusable sections</h2><p>Arrange sections into a page. Reuse the same section types across multiple pages.</p></div><span className="structure-section-count">{selectedPage.sectionTypes.length} sections</span></div>
            <ol className="structure-section-list">{selectedPage.sectionTypes.map((type, index) => { const definition = reusableSectionLibrary.find((section) => section.type === type)!; return <li key={`${type}-${index}`}><span className="structure-section-number">{String(index + 1).padStart(2, "0")}</span><span className="structure-section-copy"><strong>{definition.label}</strong><small>{definition.description}</small></span><div className="structure-section-actions"><button type="button" aria-label={`Move ${definition.label} up`} disabled={index === 0} onClick={() => updatePage(selectedPage.id, (page) => ({ ...page, sectionTypes: moveReusableSection(page.sectionTypes, index, -1) }))}>↑</button><button type="button" aria-label={`Move ${definition.label} down`} disabled={index === selectedPage.sectionTypes.length - 1} onClick={() => updatePage(selectedPage.id, (page) => ({ ...page, sectionTypes: moveReusableSection(page.sectionTypes, index, 1) }))}>↓</button><button type="button" aria-label={`Remove ${definition.label}`} disabled={selectedPage.sectionTypes.length === 1} onClick={() => updatePage(selectedPage.id, (page) => ({ ...page, sectionTypes: page.sectionTypes.filter((_, itemIndex) => itemIndex !== index) }))}>×</button></div></li>; })}</ol>
            <div className="structure-library"><div><span className="structure-kicker">SECTION LIBRARY</span><h3>Add a section</h3></div><div className="structure-library-grid">{reusableSectionLibrary.map((section) => <button type="button" key={section.type} onClick={() => addSection(section.type)} disabled={selectedPage.sectionTypes.length >= 20}><strong>+ {section.label}</strong><small>{section.description}</small></button>)}</div></div>
          </div>
          <div className="structure-editor-card structure-navigation-card">
            <div className="structure-card-heading"><div><span className="structure-kicker">GLOBAL NAVIGATION</span><h2>Website menu</h2><p>Choose which pages appear in the main menu. Page titles are used as menu labels.</p></div><span className="structure-section-count">{structure.navigationPageIds.length}/12 items</span></div>
            <div className="structure-menu-preview"><span className="structure-menu-brand">YOUR WEBSITE</span><nav aria-label="Navigation preview">{structure.navigationPageIds.map((id) => { const page = structure.pages.find((item) => item.id === id); return page ? <span key={id} className={id === selectedPage.id ? "is-current" : ""}>{page.title || "Untitled page"}</span> : null; })}</nav></div>
            <div className="structure-navigation-options">{structure.pages.map((page) => <label key={page.id}><input type="checkbox" checked={structure.navigationPageIds.includes(page.id)} onChange={() => { setStructure((current) => toggleNavigationPage(current, page.id)); setIsDirty(true); setNotice(""); }} /><span><strong>{page.title || "Untitled page"}</strong><small>{page.slug ? `/${page.slug}` : "/"}{page.id === structure.homePageId ? " · Homepage" : ""}</small></span></label>)}</div>
          </div>
        </section>
      </div>
      {notice && <p className="structure-notice" role="status">{notice}</p>}
      <footer className="structure-footer"><span>{structure.pages.length} pages</span><span>{structure.navigationPageIds.length} menu items</span><span>{validation.success ? "Structure checks passed" : "Review page addresses and navigation"}</span><span>{loadFailed ? "Load failed · Saving disabled" : websiteId ? (isDirty ? "Unsaved · Not published" : "Workspace draft · Not published") : "Local only · Nothing saved"}</span></footer>
    </main>
  );
}
