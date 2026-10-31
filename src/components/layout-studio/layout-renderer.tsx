import { resolvePremiumAsset } from "@/lib/layout-blueprint/premium-assets";
import Image from "next/image";
import React, { type CSSProperties } from "react";
import type {
  LayoutBlueprint,
  LayoutSection,
} from "@/lib/layout-blueprint/blueprint";
import {
  parsePremiumLayout,
  type PremiumLayout,
  type PremiumSection,
} from "@/lib/layout-blueprint/premium-composition";

const layoutClass: Record<LayoutBlueprint["theme"]["layout"], string> = {
  editorial: "layout-editorial",
  split: "layout-split",
  gallery: "layout-gallery",
  cards: "layout-cards",
  storefront: "layout-storefront",
  classic: "layout-classic",
};

export function LayoutRenderer({
  blueprint,
  preview = false,
  idPrefix = "",
  pagePath = "/",
  onNavigate,
}: {
  blueprint: LayoutBlueprint | PremiumLayout;
  preview?: boolean;
  idPrefix?: string;
  pagePath?: string;
  onNavigate?: (path: string) => void;
}) {
  if (blueprint.version === 2)
    return (
      <PremiumLayoutPage
        blueprint={blueprint}
        preview={preview}
        idPrefix={idPrefix}
        pagePath={pagePath}
        onNavigate={onNavigate}
      />
    );
  const prefix = preview ? idPrefix : "";
  const anchor = (href: string) =>
    href.startsWith("#") ? `#${prefix}${href.slice(1)}` : href;
  const Root = preview ? "div" : "main";
  const [ink, accent, paper] = blueprint.theme.colors;
  const style = {
    "--layout-ink": ink,
    "--layout-accent": accent,
    "--layout-paper": paper,
    "--layout-content-max-width": `${blueprint.responsive.contentMaxWidth}px`,
  } as CSSProperties;
  const page =
    blueprint.pages.find((item) => item.path === "/") ?? blueprint.pages[0];
  if (!page) return null;

  return (
    <Root
      className={`layout-site ${layoutClass[blueprint.theme.layout]}`}
      style={style}
    >
      <header className="layout-site-header">
        <a className="layout-brand" href={anchor("#top")}>
          {blueprint.site.name}
        </a>
        <nav aria-label="Main navigation">
          {blueprint.navigation.map((item) => (
            <a key={item.href + item.label} href={anchor(item.href)}>
              {item.label}
            </a>
          ))}
        </nav>
        <a className="layout-header-action" href={anchor("#contact")}>
          {page.sections.find(
            (item): item is Extract<LayoutSection, { type: "hero" }> =>
              item.type === "hero",
          )?.actionLabel ?? "Get in touch"}
        </a>
      </header>
      <div id={`${prefix}top`} className="layout-page-content">
        {page.sections.map((section) => (
          <LayoutSectionView
            key={section.id}
            section={section}
            prefix={prefix}
            anchor={anchor}
          />
        ))}
      </div>
      <footer className="layout-site-footer">
        <span>{blueprint.site.name}</span>
        <span>
          {preview ? "Private preview · LUCIA OS" : "Made with LUCIA OS"}
        </span>
      </footer>
    </Root>
  );
}

function LayoutSectionView({
  section,
  prefix,
  anchor,
}: {
  section: LayoutSection;
  prefix: string;
  anchor: (href: string) => string;
}) {
  if (section.type === "hero") {
    return (
      <section id={`${prefix}hero`} className="layout-hero">
        <p className="layout-eyebrow">{section.eyebrow}</p>
        <h1>{section.heading}</h1>
        <p className="layout-lede">{section.body}</p>
        <a className="layout-primary-action" href={anchor(section.actionHref)}>
          {section.actionLabel}
          <span aria-hidden="true">↗</span>
        </a>
        <div className="layout-hero-art" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>
    );
  }
  if (section.type === "content-grid") {
    return (
      <section id={`${prefix}${section.id}`} className="layout-content-section">
        <header>
          <p className="layout-eyebrow">DISCOVER</p>
          <h2>{section.heading}</h2>
        </header>
        <div className="layout-content-grid">
          {section.items.map((item, index) => (
            <article key={item.title + index}>
              <span className="layout-item-index">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <span className="layout-item-arrow" aria-hidden="true">
                ↗
              </span>
            </article>
          ))}
        </div>
      </section>
    );
  }
  if (section.type === "call-to-action") {
    return (
      <section id={`${prefix}${section.id}`} className="layout-cta">
        <h2>{section.heading}</h2>
        <p>{section.body}</p>
        <a href={anchor(section.actionHref)}>{section.actionLabel} ↗</a>
      </section>
    );
  }
  return (
    <section id={`${prefix}contact`} className="layout-contact">
      <p className="layout-eyebrow">NEXT STEP</p>
      <h2>{section.heading}</h2>
      <p>{section.body}</p>
    </section>
  );
}

// Compatibility export for older internal imports.
export { LayoutRenderer as LoomRenderer };

/** The registered v2 section family deliberately shares the production LayoutRenderer boundary. */
function PremiumLayoutPage({
  blueprint,
  preview,
  idPrefix,
  pagePath,
  onNavigate,
}: {
  blueprint: PremiumLayout;
  preview: boolean;
  idPrefix: string;
  pagePath: string;
  onNavigate?: (path: string) => void;
}) {
  const definition = parsePremiumLayout(blueprint);
  const page = definition.pages.find((item) => item.path === pagePath);
  if (!page) return null;
  const prefix = preview ? idPrefix : "";
  const navigate = (
    event: React.MouseEvent<HTMLAnchorElement>,
    path: string,
  ) => {
    if (preview && onNavigate && path.startsWith("/")) {
      event.preventDefault();
      onNavigate(path);
    }
  };
  const t = definition.tokens;
  const widths = { reading: "760px", standard: "1120px", wide: "1440px" };
  const fonts = {
    "system-sans": "system-ui, sans-serif",
    "editorial-serif": "Georgia, serif",
    "condensed-sans": "Arial Narrow, system-ui, sans-serif",
  };
  const style = {
    "--layout-ink": t.foreground,
    "--layout-paper": t.background,
    "--layout-accent": t.accent,
    "--layout-content-max-width": widths[t.width],
    fontFamily: fonts[t.font],
  } as CSSProperties;
  const Root = preview ? "div" : "main";
  return (
    <Root
      className={`layout-site premium-layout premium-scale-${t.scale} premium-rhythm-${t.rhythm} premium-radius-${t.radius} premium-responsive-${page.responsive}`}
      style={style}
      data-layout-version="2"
      data-layout-id={definition.layoutId}
      data-page-path={page.path}
    >
      <header className="layout-site-header">
        {/* Public hostname navigation must issue a document request, not enter the OS App Router. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          className="layout-brand"
          href="/"
          onClick={preview ? (event) => navigate(event, "/") : undefined}
        >
          {definition.identity.name}
        </a>
        {page.navigation && (
          <nav aria-label="Main navigation">
            {definition.navigation.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={
                  preview ? (event) => navigate(event, item.href) : undefined
                }
                aria-current={item.href === page.path ? "page" : undefined}
              >
                {item.label}
              </a>
            ))}
          </nav>
        )}
      </header>
      <div className="layout-page-content">
        {page.sections.map((section, index) => (
          <PremiumSectionView
            key={section.id}
            section={section}
            prefix={prefix}
            primaryHeading={
              index === page.sections.findIndex((s) => s.type !== "trust-strip")
            }
            onNavigate={preview ? onNavigate : undefined}
          />
        ))}
      </div>
      <footer className="layout-site-footer">
        <span>{definition.identity.name}</span>
        <span>
          {preview ? "Private preview · LUCIA OS" : "Made with LUCIA OS"}
        </span>
      </footer>
    </Root>
  );
}
function PremiumSectionView({
  section,
  prefix,
  primaryHeading,
  onNavigate,
}: {
  section: PremiumSection;
  prefix: string;
  primaryHeading: boolean;
  onNavigate?: (path: string) => void;
}) {
  const heading = (value: string) =>
    primaryHeading ? <h1>{value}</h1> : <h2>{value}</h2>;
  const id = `${prefix}${section.id}`;
  switch (section.type) {
    case "premium-hero":
      return (
        <section
          id={id}
          data-section-type={section.type}
          data-variant={section.variant}
          className={`premium-section premium-hero premium-hero-${section.variant}`}
        >
          <div>
            <p className="layout-eyebrow">{section.eyebrow}</p>
            {heading(section.heading)}
            <p className="layout-lede">{section.body}</p>
            {section.action && (
              <a
                className="layout-primary-action"
                href={
                  section.action.href.startsWith("#")
                    ? `#${prefix}${section.action.href.slice(1)}`
                    : section.action.href
                }
                onClick={
                  onNavigate && section.action.href.startsWith("/")
                    ? (event) => {
                        event.preventDefault();
                        onNavigate(section.action!.href);
                      }
                    : undefined
                }
              >
                {section.action.label}
              </a>
            )}
          </div>
          {section.image && (
            <PremiumAsset
              alt={section.image.alt}
              reference={section.image.src}
            />
          )}
        </section>
      );
    case "trust-strip":
      return (
        <section
          id={id}
          data-section-type={section.type}
          data-variant={section.variant}
          className={`premium-section premium-trust premium-trust-${section.variant}`}
          aria-label="Trust indicators"
        >
          <ul>
            {section.items.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </section>
      );
    case "editorial-story":
      return (
        <section
          id={id}
          data-section-type={section.type}
          data-variant={section.variant}
          className={`premium-section premium-story premium-story-${section.variant}`}
        >
          <div>
            {heading(section.heading)}
            <p>{section.body}</p>
          </div>
          {section.image && (
            <PremiumAsset
              alt={section.image.alt}
              reference={section.image.src}
            />
          )}
        </section>
      );
    case "project-gallery":
      return (
        <section
          id={id}
          data-section-type={section.type}
          data-variant={section.variant}
          className={`premium-section premium-gallery premium-gallery-${section.variant}`}
        >
          {heading(section.heading)}
          <div
            className="premium-gallery-grid"
            tabIndex={section.variant === "rail" ? 0 : undefined}
            role={section.variant === "rail" ? "region" : undefined}
            aria-label={
              section.variant === "rail"
                ? `${section.heading} — scrollable projects`
                : undefined
            }
          >
            {section.projects.map((project, index) => (
              <article key={index}>
                <PremiumAsset
                  alt={project.image.alt}
                  reference={project.image.src}
                />
                <h3>
                  {project.href ? (
                    <a
                      href={
                        project.href.startsWith("#")
                          ? `#${prefix}${project.href.slice(1)}`
                          : project.href
                      }
                      onClick={
                        onNavigate && project.href.startsWith("/")
                          ? (event) => {
                              event.preventDefault();
                              onNavigate(project.href!);
                            }
                          : undefined
                      }
                    >
                      {project.title}
                    </a>
                  ) : (
                    project.title
                  )}
                </h3>
                {project.description && <p>{project.description}</p>}
              </article>
            ))}
          </div>
        </section>
      );
    case "service-journey":
      return (
        <section
          id={id}
          data-section-type={section.type}
          data-variant={section.variant}
          className={`premium-section premium-services premium-services-${section.variant}`}
        >
          {heading(section.heading)}
          <ol>
            {section.items.map((item, index) => (
              <li key={index}>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </li>
            ))}
          </ol>
        </section>
      );
    case "experience":
      return (
        <section
          id={id}
          data-section-type={section.type}
          data-variant={section.variant}
          className={`premium-section premium-experience premium-experience-${section.variant}`}
        >
          <PremiumAsset alt={section.image.alt} reference={section.image.src} />
          <div>
            {heading(section.heading)}
            <p>{section.body}</p>
          </div>
        </section>
      );
    case "contact-panel":
      return (
        <section
          id={id}
          data-section-type={section.type}
          data-variant={section.variant}
          className={`premium-section premium-contact premium-contact-${section.variant}`}
        >
          {heading(section.heading)}
          <p>{section.body}</p>
          {section.email && (
            <a href={`mailto:${section.email}`}>{section.email}</a>
          )}
        </section>
      );
  }
}
/* An unresolved built-in asset is visibly unavailable, never a broken network image
 * or a fabricated successful media upload. A licensed manifest is a release gate. */
function PremiumAsset({ alt, reference }: { alt: string; reference: string }) {
  return (
    <Image
      unoptimized
      className="premium-asset"
      src={resolvePremiumAsset(reference)}
      alt={alt}
      width={800}
      height={500}
      loading="lazy"
      data-asset-ref={reference}
    />
  );
}
