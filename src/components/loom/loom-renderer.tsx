import type { CSSProperties } from "react";
import type { LayoutBlueprint, LayoutSection } from "@/lib/loom/blueprint";

const layoutClass: Record<LayoutBlueprint["theme"]["layout"], string> = {
  editorial: "layout-layout-editorial",
  split: "layout-layout-split",
  gallery: "layout-layout-gallery",
  cards: "layout-layout-cards",
  storefront: "layout-layout-storefront",
  classic: "layout-layout-classic",
};

export function LayoutRenderer({ blueprint, preview = false }: { blueprint: LayoutBlueprint; preview?: boolean }) {
  const [ink, accent, paper] = blueprint.theme.colors;
  const style = {
    "--layout-ink": ink,
    "--layout-accent": accent,
    "--layout-paper": paper,
    "--layout-content-max-width": `${blueprint.responsive.contentMaxWidth}px`,
  } as CSSProperties;
  const page = blueprint.pages.find((item) => item.path === "/") ?? blueprint.pages[0];
  if (!page) return null;

  return (
    <main className={`layout-site ${layoutClass[blueprint.theme.layout]}`} style={style}>
      <header className="layout-site-header">
        <a className="layout-brand" href="#top">{blueprint.site.name}</a>
        <nav aria-label="Main navigation">
          {blueprint.navigation.map((item) => <a key={item.href + item.label} href={item.href}>{item.label}</a>)}
        </nav>
        <a className="layout-header-action" href="#contact">{page.sections.find((item): item is Extract<LayoutSection, { type: "hero" }> => item.type === "hero")?.actionLabel ?? "Get in touch"}</a>
      </header>
      <div id="top" className="layout-page-content">
        {page.sections.map((section) => <LayoutSectionView key={section.id} section={section} />)}
      </div>
      <footer className="layout-site-footer">
        <span>{blueprint.site.name}</span>
        <span>{preview ? "Private preview · LUCIA OS" : "Made with LUCIA OS"}</span>
      </footer>
    </main>
  );
}

function LayoutSectionView({ section }: { section: LayoutSection }) {
  if (section.type === "hero") {
    return <section id="hero" className="layout-hero">
      <p className="layout-eyebrow">{section.eyebrow}</p>
      <h1>{section.heading}</h1>
      <p className="layout-lede">{section.body}</p>
      <a className="layout-primary-action" href={section.actionHref}>{section.actionLabel}<span aria-hidden="true">↗</span></a>
      <div className="layout-hero-art" aria-hidden="true"><span /><span /><span /></div>
    </section>;
  }
  if (section.type === "content-grid") {
    return <section id={section.id} className="layout-content-section">
      <header><p className="layout-eyebrow">DISCOVER</p><h2>{section.heading}</h2></header>
      <div className="layout-content-grid">{section.items.map((item, index) => <article key={item.title + index}>
        <span className="layout-item-index">{String(index + 1).padStart(2, "0")}</span>
        <h3>{item.title}</h3><p>{item.body}</p><span className="layout-item-arrow" aria-hidden="true">↗</span>
      </article>)}</div>
    </section>;
  }
  if (section.type === "call-to-action") {
    return <section id={section.id} className="layout-cta"><h2>{section.heading}</h2><p>{section.body}</p><a href={section.actionHref}>{section.actionLabel} ↗</a></section>;
  }
  return <section id="contact" className="layout-contact"><p className="layout-eyebrow">NEXT STEP</p><h2>{section.heading}</h2><p>{section.body}</p></section>;
}

// Compatibility export for older internal imports.
export { LayoutRenderer as LoomRenderer };
