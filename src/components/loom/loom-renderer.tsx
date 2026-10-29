import type { CSSProperties } from "react";
import type { LoomBlueprint, LoomSection } from "@/lib/loom/blueprint";

const layoutClass: Record<LoomBlueprint["theme"]["layout"], string> = {
  editorial: "loom-layout-editorial",
  split: "loom-layout-split",
  gallery: "loom-layout-gallery",
  cards: "loom-layout-cards",
  storefront: "loom-layout-storefront",
  classic: "loom-layout-classic",
};

export function LoomRenderer({ blueprint, preview = false }: { blueprint: LoomBlueprint; preview?: boolean }) {
  const [ink, accent, paper] = blueprint.theme.colors;
  const style = {
    "--loom-ink": ink,
    "--loom-accent": accent,
    "--loom-paper": paper,
    "--loom-content-max-width": `${blueprint.responsive.contentMaxWidth}px`,
  } as CSSProperties;
  const page = blueprint.pages.find((item) => item.path === "/") ?? blueprint.pages[0];
  if (!page) return null;

  return (
    <main className={`loom-site ${layoutClass[blueprint.theme.layout]}`} style={style}>
      <header className="loom-site-header">
        <a className="loom-brand" href="#top">{blueprint.site.name}</a>
        <nav aria-label="Main navigation">
          {blueprint.navigation.map((item) => <a key={item.href + item.label} href={item.href}>{item.label}</a>)}
        </nav>
        <a className="loom-header-action" href="#contact">{page.sections.find((item): item is Extract<LoomSection, { type: "hero" }> => item.type === "hero")?.actionLabel ?? "Get in touch"}</a>
      </header>
      <div id="top" className="loom-page-content">
        {page.sections.map((section) => <LoomSectionView key={section.id} section={section} />)}
      </div>
      <footer className="loom-site-footer">
        <span>{blueprint.site.name}</span>
        <span>{preview ? "Private preview · LUCIA OS" : "Made with LUCIA OS"}</span>
      </footer>
    </main>
  );
}

function LoomSectionView({ section }: { section: LoomSection }) {
  if (section.type === "hero") {
    return <section id="hero" className="loom-hero">
      <p className="loom-eyebrow">{section.eyebrow}</p>
      <h1>{section.heading}</h1>
      <p className="loom-lede">{section.body}</p>
      <a className="loom-primary-action" href={section.actionHref}>{section.actionLabel}<span aria-hidden="true">↗</span></a>
      <div className="loom-hero-art" aria-hidden="true"><span /><span /><span /></div>
    </section>;
  }
  if (section.type === "content-grid") {
    return <section id={section.id} className="loom-content-section">
      <header><p className="loom-eyebrow">DISCOVER</p><h2>{section.heading}</h2></header>
      <div className="loom-content-grid">{section.items.map((item, index) => <article key={item.title + index}>
        <span className="loom-item-index">{String(index + 1).padStart(2, "0")}</span>
        <h3>{item.title}</h3><p>{item.body}</p><span className="loom-item-arrow" aria-hidden="true">↗</span>
      </article>)}</div>
    </section>;
  }
  if (section.type === "call-to-action") {
    return <section id={section.id} className="loom-cta"><h2>{section.heading}</h2><p>{section.body}</p><a href={section.actionHref}>{section.actionLabel} ↗</a></section>;
  }
  return <section id="contact" className="loom-contact"><p className="loom-eyebrow">NEXT STEP</p><h2>{section.heading}</h2><p>{section.body}</p></section>;
}
