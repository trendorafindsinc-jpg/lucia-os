"use client";

import React, { useEffect, useMemo, useState } from "react";
import { WorkspaceAppLink as Link } from "@/components/workspace/app-navigation";
import { useWorkspaceTab } from "@/components/workspace/workspace-tab-shell";
import {
  templateCategories,
  websiteTemplates,
  type TemplateCategory,
  type WebsiteTemplate,
} from "@/lib/templates/catalogue";
import { getTemplateSetupHref } from "@/lib/templates/navigation";

type PreviewVariant =
  "editorial" | "split" | "gallery" | "storefront" | "service" | "hospitality";

function getPreviewVariant(template: WebsiteTemplate): PreviewVariant {
  const id = template.id.toLowerCase();
  if (
    template.category === "Storefront" ||
    /market|wear|harvest|goods|shop|store/.test(id)
  )
    return "storefront";
  if (
    template.category === "Portfolio" ||
    template.category === "Creative" ||
    /newsroom|journal|portfolio|studio/.test(id)
  )
    return "gallery";
  if (
    template.category === "Hospitality" ||
    /stay|table|tide|event|roam/.test(id)
  )
    return "hospitality";
  if (
    /tech|launch|buildcraft|architect|agency/.test(id) ||
    /modern|image|product/i.test(template.style)
  )
    return "split";
  if (
    template.category === "Wellness" ||
    template.category === "Education" ||
    template.category === "Community"
  )
    return "service";
  return "editorial";
}

function PreviewComposition({
  template,
  variant,
}: {
  template: WebsiteTemplate;
  variant: PreviewVariant;
}) {
  const [ink, accent] = template.colors;
  return (
    <div
      className={`preview-layout preview-layout-${variant}`}
      style={
        {
          "--preview-ink": ink,
          "--preview-accent": accent,
        } as React.CSSProperties
      }
    >
      <div className="preview-site-nav">
        <span className="preview-logo-mark" />
        <span className="preview-nav-line" />
        <span className="preview-nav-line short" />
      </div>
      {variant === "editorial" && (
        <>
          <div className="preview-kicker" style={{ background: accent }} />
          <div className="preview-title wide" style={{ background: ink }} />
          <div
            className="preview-title preview-title-short"
            style={{ background: ink }}
          />
          <div className="preview-copy" />
          <div className="preview-cta" style={{ background: ink }} />
          <div
            className="preview-editorial-band"
            style={{ background: accent }}
          />
        </>
      )}
      {variant === "split" && (
        <div className="preview-split-body">
          <div>
            <div className="preview-kicker" style={{ background: accent }} />
            <div className="preview-title" style={{ background: ink }} />
            <div
              className="preview-title preview-title-short"
              style={{ background: ink }}
            />
            <div className="preview-copy" />
            <div className="preview-cta" style={{ background: ink }} />
          </div>
          <div className="preview-image-block" style={{ background: accent }} />
        </div>
      )}
      {variant === "gallery" && (
        <>
          <div className="preview-gallery-heading">
            <div className="preview-title" style={{ background: ink }} />
            <div className="preview-copy" />
          </div>
          <div className="preview-gallery-grid">
            <i style={{ background: accent }} />
            <i style={{ background: ink }} />
            <i style={{ background: accent }} />
            <i style={{ background: ink }} />
          </div>
        </>
      )}
      {variant === "storefront" && (
        <>
          <div className="preview-store-hero" style={{ background: accent }}>
            <div className="preview-kicker" style={{ background: ink }} />
            <div className="preview-title" style={{ background: ink }} />
            <div className="preview-cta" style={{ background: ink }} />
          </div>
          <div className="preview-product-row">
            {[0, 1, 2].map((item) => (
              <div key={item}>
                <i style={{ background: accent }} />
                <span style={{ background: ink }} />
              </div>
            ))}
          </div>
        </>
      )}
      {variant === "service" && (
        <>
          <div className="preview-service-hero">
            <div className="preview-kicker" style={{ background: accent }} />
            <div className="preview-title" style={{ background: ink }} />
            <div className="preview-copy" />
            <div className="preview-cta" style={{ background: ink }} />
          </div>
          <div className="preview-service-cards">
            {[0, 1, 2].map((item) => (
              <div key={item} style={{ borderTopColor: accent }}>
                <i style={{ background: accent }} />
                <span style={{ background: ink }} />
              </div>
            ))}
          </div>
        </>
      )}
      {variant === "hospitality" && (
        <>
          <div
            className="preview-hospitality-image"
            style={{ background: accent }}
          >
            <div className="preview-title" style={{ background: ink }} />
            <div className="preview-copy" />
          </div>
          <div className="preview-hospitality-bottom">
            <div
              className="preview-title preview-title-short"
              style={{ background: ink }}
            />
            <div className="preview-cta" style={{ background: ink }} />
          </div>
        </>
      )}
    </div>
  );
}

export function TemplateGallery({
  embedded = false,
}: { embedded?: boolean } = {}) {
  const Root = embedded ? "div" : "main";
  const { activeTabId, getSnapshot, setSnapshot } = useWorkspaceTab();
  const [restored, setRestored] = useState(false);
  const [category, setCategory] = useState<"All" | TemplateCategory>("All");
  const [search, setSearch] = useState("");
  useEffect(() => {
    if (!activeTabId) return;
    const saved = getSnapshot<{ category?: string; search?: string }>(
      `layouts-filter:${activeTabId}`,
    );
    if (saved && templateCategories.some((item) => item === saved.category))
      setCategory(saved.category as "All" | TemplateCategory);
    if (typeof saved?.search === "string")
      setSearch(saved.search.slice(0, 160));
    setRestored(true);
  }, [activeTabId, getSnapshot]);
  useEffect(() => {
    if (restored && activeTabId)
      setSnapshot(`layouts-filter:${activeTabId}`, { category, search });
  }, [restored, activeTabId, category, search, setSnapshot]);
  const visibleTemplates = useMemo(() => {
    const term = search.trim().toLowerCase();
    return websiteTemplates.filter((template) => {
      const matchesCategory =
        category === "All" || template.category === category;
      const matchesSearch =
        !term ||
        [
          template.name,
          template.audience,
          template.description,
          template.category,
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [category, search]);

  return (
    <Root className="template-page">
      <header className="template-topbar">
        <Link
          className="wordmark"
          href="/workspace"
          aria-label="Return to LUCIA OS workspace"
        >
          <span className="brand-mark" aria-hidden="true">
            L
          </span>
          <span>
            LUCIA <span className="muted-word">OS</span>
          </span>
        </Link>
        <Link className="template-back" href="/workspace">
          Back to workspace <span aria-hidden="true">←</span>
        </Link>
      </header>
      <section className="template-intro">
        <p className="eyebrow">LAYOUTS · WEBSITE DESIGN</p>
        <h1>
          Find a look that
          <br />
          <span>feels like you.</span>
        </h1>
        <p className="template-lede">
          Explore the current Layout starters. Cards illustrate design
          directions; open the working Studio preview to inspect the supported
          composition before creating your website.
        </p>
        <div className="template-count">
          <strong>{websiteTemplates.length} existing Layout starters</strong>
          <span> · {templateCategories.length - 1} categories · Layouts</span>
        </div>
        <div className="template-start-link">
          <Link href="/create">
            Start guided website setup <span aria-hidden="true">→</span>
          </Link>
          <Link href="/workspace/websites">
            Open saved websites <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>
      <section className="template-controls" aria-label="Find a website layout">
        <label className="template-search-label" htmlFor="template-search">
          Search layouts
        </label>
        <input
          id="template-search"
          maxLength={160}
          className="template-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Try “school”, “portfolio”, or “shop”"
        />
        <div
          className="template-filters"
          aria-label="Filter layouts by category"
        >
          {templateCategories.map((item) => (
            <button
              key={item}
              type="button"
              className={
                category === item
                  ? "template-filter is-active"
                  : "template-filter"
              }
              onClick={() => setCategory(item)}
              aria-pressed={category === item}
            >
              {item}
            </button>
          ))}
        </div>
      </section>
      <section className="template-results" aria-live="polite">
        <div className="template-results-heading">
          <h2>
            {category === "All" ? "Explore all layouts" : category + " layouts"}
          </h2>
          <span>{visibleTemplates.length} shown</span>
        </div>
        {visibleTemplates.length ? (
          <div className="template-grid">
            {visibleTemplates.map((template) => {
              const variant = getPreviewVariant(template);
              return (
                <article className="template-card" key={template.id}>
                  <div
                    className={`template-preview preview-${variant}`}
                    style={{ background: template.colors[2] }}
                  >
                    <div className="preview-browser">
                      <i />
                      <i />
                      <i />
                      <span>yourwebsite.example</span>
                    </div>
                    <PreviewComposition template={template} variant={variant} />
                    {template.featured && (
                      <span className="preview-featured">Featured</span>
                    )}
                    <span className="preview-variant-label">{variant}</span>
                  </div>
                  <div className="template-card-body">
                    <div className="template-card-meta">
                      <span>{template.category}</span>
                      <span>{template.style}</span>
                    </div>
                    <h3>{template.name}</h3>
                    <p className="template-audience">{template.audience}</p>
                    <p className="template-description">
                      {template.description}
                    </p>
                    <div
                      className="template-sections"
                      aria-label="Included section layouts"
                    >
                      {template.sections.slice(0, 4).map((section) => (
                        <span key={section}>{section}</span>
                      ))}
                    </div>
                    <Link
                      className="template-action"
                      href={{
                        pathname: "/editor",
                        query: { template: template.id },
                      }}
                    >
                      Preview current design <span aria-hidden="true">↗</span>
                    </Link>
                    <Link
                      className="template-action"
                      href={getTemplateSetupHref(template.id)}
                    >
                      Customise this design <span aria-hidden="true">↗</span>
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="template-empty">
            <h3>No matching layouts</h3>
            <p>Try another search or choose a different category.</p>
            <button
              type="button"
              onClick={() => {
                setCategory("All");
                setSearch("");
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </section>
      <footer className="template-footer">
        <span>Layouts are starting points, not locked-in designs.</span>
        <span>
          Edits and publishing remain subject to the Studio’s save and publish
          safeguards.
        </span>
      </footer>
    </Root>
  );
}
