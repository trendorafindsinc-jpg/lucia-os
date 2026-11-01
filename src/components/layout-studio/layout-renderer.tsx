import { resolvePremiumAsset, premiumAssetDimensions } from "@/lib/layout-blueprint/premium-assets";
import Image from "next/image";
import { resolveExternalEmbed, resolveExternalHttpsLink } from "@/lib/media/embed-providers";
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
        {!preview&&<nav aria-label="Blog and news" style={{display:"flex",gap:"1rem"}}><a href="/blog">Blog</a><a href="/news">News</a></nav>}
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
  const visual = definition.visualExperience;
  // Scope the new visual edition to an actual built-in cinematic hero asset.
  // Historic r2 sites and flagships can share layoutVersion without opting in.
  const cinematic = Boolean(visual && definition.pages[0]?.sections.some(
    (section) => section.type === "premium-hero" &&
      section.image?.src.startsWith("builtin:premium/cinematic-"),
  ));
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
      className={`layout-site premium-layout ${visual ? "premium-visual" : ""} ${cinematic ? "premium-cinema" : ""} premium-design-${definition.layoutId.slice("lucia.layout.".length)}-r${definition.layoutVersion} premium-scale-${t.scale} premium-rhythm-${t.rhythm} premium-radius-${t.radius} premium-responsive-${page.responsive}`}
      style={style}
      data-layout-version="2"
      data-layout-revision={definition.layoutVersion}
      data-layout-id={definition.layoutId}
      data-page-path={page.path}
      data-expression={visual?.expression}
      data-visual-motion={visual?.motion}
      data-visual-reveal={visual?.reveal}
      data-visual-transition={visual?.transition}
      data-visual-interaction={visual?.interaction}
      data-visual-background={visual?.background}
      data-visual-typography={visual?.typography}
      data-visual-image={visual?.image}
      data-visual-depth={visual?.depth}
      data-visual-lighting={visual?.lighting}
      data-visual-reduced={visual?.reducedMotion ? "true" : undefined}
    >
      <a className="premium-skip-link" href={`#${prefix}premium-main-content`}>
        Skip to content
      </a>
      <header className="layout-site-header premium-site-header">
        {/* Public hostname navigation must issue a document request, not enter the OS App Router. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          className="layout-brand"
          href="/"
          onClick={preview ? (event) => navigate(event, "/") : undefined}
        >
          {definition.identity.profile?.logo && (
            <span className="premium-brand-logo">
              <PremiumAsset alt={definition.identity.profile.logo.alt} reference={definition.identity.profile.logo.src} />
            </span>
          )}
          {definition.identity.name}
        </a>
        {page.navigation && (
          <>
            <nav className="premium-desktop-nav" aria-label="Main navigation">
              {definition.navigation.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={preview ? (event) => navigate(event, item.href) : undefined}
                  aria-current={item.href === page.path ? "page" : undefined}
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <details className="premium-mobile-menu">
              <summary>Menu</summary>
              <nav aria-label="Mobile navigation">
                {definition.navigation.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={preview ? (event) => {
                      const menu = event.currentTarget.closest("details");
                      navigate(event, item.href);
                      // Let the App Router begin its page transition before closing
                      // the native disclosure menu; immediate removal can race navigation.
                      if (event.defaultPrevented) requestAnimationFrame(() => menu?.removeAttribute("open"));
                    } : undefined}
                    aria-current={item.href === page.path ? "page" : undefined}
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </details>
          </>
        )}
      </header>
      <div id={`${prefix}premium-main-content`} className="layout-page-content" tabIndex={-1}>
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
      <footer className="layout-site-footer premium-site-footer">
        <div className="premium-footer-identity">
          <p className="premium-footer-brand">{definition.identity.name}</p>
          <p className="premium-footer-description">{definition.identity.description}</p>
          {definition.identity.profile?.tagline && <p>{definition.identity.profile.tagline}</p>}
          {definition.identity.profile?.address && <p>{definition.identity.profile.address}</p>}
          {definition.identity.profile?.serviceArea && <p>Serving {definition.identity.profile.serviceArea}</p>}
          {definition.identity.profile?.phone && <a href={`tel:${definition.identity.profile.phone.replace(/[^+0-9]/g, "")}`}>{definition.identity.profile.phone}</a>}
          {definition.identity.profile?.contactEmail && <a href={`mailto:${definition.identity.profile.contactEmail}`}>{definition.identity.profile.contactEmail}</a>}
          {definition.identity.profile?.social && (
            <nav aria-label="Social profiles" className="premium-social-links">
              {Object.entries(definition.identity.profile.social).map(([network, href]) =>
                href ? <a key={network} href={href} target="_blank" rel="noopener noreferrer">{network === "x" ? "X" : network[0].toUpperCase() + network.slice(1)}</a> : null
              )}
            </nav>
          )}
        </div>
        <nav aria-label="Footer navigation" className="premium-footer-navigation">
          {definition.navigation.map((item) => (
            <a
              href={item.href}
              key={item.href}
              onClick={preview ? (event) => navigate(event, item.href) : undefined}
              aria-current={item.href === page.path ? "page" : undefined}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="premium-footer-end">
          {!preview&&<nav aria-label="Blog and news" style={{display:"flex",gap:"1rem"}}><a href="/blog">Blog</a><a href="/news">News</a></nav>}
          <span>{preview ? "Private preview · LUCIA OS" : "Made with LUCIA OS"}</span>
          {/* Customer hostname navigation must issue a document request. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            onClick={preview ? (event) => navigate(event, "/") : undefined}
            aria-label={`Return to ${definition.identity.name} homepage`}
          >
            Back to home
          </a>
        </div>
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
              eager={primaryHeading}
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
    case "media-embed": {
      const mediaId = section.mediaRef?.slice(6);
      const embed = section.kind === "embed" && section.url ? resolveExternalEmbed(section.url) : null;
      const externalLink = section.kind === "link" && section.url ? resolveExternalHttpsLink(section.url) : null;
      return (
        <section
          id={id}
          data-section-type={section.type}
          data-variant={section.variant}
          className={`premium-section premium-media premium-media-${section.variant}`}
        >
          {heading(section.title)}
          {section.description && <p>{section.description}</p>}
          {section.kind === "image" && mediaId ? (
            <Image unoptimized src={`/_media/${mediaId}`} alt={section.description || section.title}
              width={1600} height={1000} sizes="(max-width: 900px) 100vw, 1200px"
              className="premium-media-image" />
          ) : section.kind === "embed" && embed ? (
            <div className="premium-media-frame">
              <iframe src={embed.src} title={section.title || embed.title} loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-forms"
                allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
            </div>
          ) : section.kind === "video" && mediaId ? (
            <video controls playsInline preload="metadata" className="premium-media-video">
              <source src={`/_media/${mediaId}`} type={section.mime} />
              Your browser does not support embedded video.
            </video>
          ) : section.kind === "document" && mediaId ? (
            <a className="premium-media-download" href={`/_media/${mediaId}`} download>
              Download {section.title}
            </a>
          ) : section.kind === "link" && externalLink ? (
            <a className="premium-media-download" href={externalLink} target="_blank" rel="noopener noreferrer">
              {section.title}
            </a>
          ) : (
            <p role="status">This media item is not available for preview.</p>
          )}
        </section>
      );
    }
  }
}
/* An unresolved built-in asset is visibly unavailable, never a broken network image
 * or a fabricated successful media upload. A licensed manifest is a release gate. */
function PremiumAsset({ alt, reference, eager = false }: { alt: string; reference: string; eager?: boolean }) {
  return (
    <Image
      unoptimized
      className="premium-asset"
      src={resolvePremiumAsset(reference)}
      alt={alt}
      {...premiumAssetDimensions(reference)}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      sizes="(max-width: 768px) 100vw, (max-width: 1180px) 50vw, 800px"
      data-asset-ref={reference}
    />
  );
}
