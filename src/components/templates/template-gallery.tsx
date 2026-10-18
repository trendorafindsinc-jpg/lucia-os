"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { templateCategories, websiteTemplates, type TemplateCategory } from "@/lib/templates/catalogue";

export function TemplateGallery() {
  const [category, setCategory] = useState<"All" | TemplateCategory>("All");
  const [search, setSearch] = useState("");
  const visibleTemplates = useMemo(() => {
    const term = search.trim().toLowerCase();
    return websiteTemplates.filter((template) => {
      const matchesCategory = category === "All" || template.category === category;
      const matchesSearch = !term || [template.name, template.audience, template.description, template.category].join(" ").toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [category, search]);

  return (
    <main className="template-page">
      <header className="template-topbar">
        <Link className="wordmark" href="/" aria-label="LUCIA OS home"><span className="brand-mark" aria-hidden="true">L</span><span>LUCIA <span className="muted-word">OS</span></span></Link>
        <Link className="template-back" href="/">Platform overview <span aria-hidden="true">↗</span></Link>
      </header>
      <section className="template-intro">
        <p className="eyebrow">PHASE 7 · WEBSITE STARTING POINTS</p>
        <h1>Find a look that<br /><span>feels like you.</span></h1>
        <p className="template-lede">Explore a growing library of thoughtfully structured website concepts for organisations, creators and independent businesses. Each starting point is designed to be customised to your content and brand.</p>
        <div className="template-count"><strong>{websiteTemplates.length} design concepts</strong><span> · {templateCategories.length - 1} categories · Catalogue preview</span></div>
      </section>
      <section className="template-controls" aria-label="Find a website template">
        <label className="template-search-label" htmlFor="template-search">Search templates</label>
        <input id="template-search" className="template-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Try “school”, “portfolio”, or “shop”" />
        <div className="template-filters" aria-label="Filter by category">
          {templateCategories.map((item) => <button key={item} type="button" className={category === item ? "template-filter is-active" : "template-filter"} onClick={() => setCategory(item)} aria-pressed={category === item}>{item}</button>)}
        </div>
      </section>
      <section className="template-results" aria-live="polite">
        <div className="template-results-heading"><h2>{category === "All" ? "Explore all concepts" : category + " concepts"}</h2><span>{visibleTemplates.length} shown</span></div>
        {visibleTemplates.length ? <div className="template-grid">{visibleTemplates.map((template) => (
          <article className="template-card" key={template.id}>
            <div className="template-preview" style={{ background: template.colors[2] }}>
              <div className="preview-browser"><i /><i /><i /><span>yourwebsite.example</span></div>
              <div className="preview-layout">
                <div className="preview-kicker" style={{ background: template.colors[1] }} />
                <div className="preview-title" style={{ background: template.colors[0] }} />
                <div className="preview-title preview-title-short" style={{ background: template.colors[0] }} />
                <div className="preview-copy" />
                <div className="preview-cta" style={{ background: template.colors[0] }} />
                <div className="preview-blocks"><div style={{ background: template.colors[1] }} /><div style={{ background: template.colors[1] }} /><div style={{ background: template.colors[1] }} /></div>
              </div>
              {template.featured && <span className="preview-featured">Featured</span>}
            </div>
            <div className="template-card-body">
              <div className="template-card-meta"><span>{template.category}</span><span>{template.style}</span></div>
              <h3>{template.name}</h3>
              <p className="template-audience">{template.audience}</p>
              <p className="template-description">{template.description}</p>
              <div className="template-sections" aria-label="Included section concepts">{template.sections.slice(0, 4).map((section) => <span key={section}>{section}</span>)}</div>
              <button className="template-action" type="button" disabled title="Template customisation arrives with the visual editor">Customisation coming next <span aria-hidden="true">↗</span></button>
            </div>
          </article>
        ))}</div> : <div className="template-empty"><h3>No matching concepts</h3><p>Try another search or choose a different category.</p><button type="button" onClick={() => { setCategory("All"); setSearch(""); }}>Clear filters</button></div>}
      </section>
      <footer className="template-footer"><span>Designed as starting points, not locked-in layouts.</span><span>Visual editing and publishing arrive in later phases.</span></footer>
    </main>
  );
}
