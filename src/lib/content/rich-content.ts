import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

const localMediaPath = /^\/_media\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const embedHosts = new Set(["www.youtube-nocookie.com", "www.youtube.com", "player.vimeo.com"]);

function safeEmbedSource(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !embedHosts.has(url.hostname)) return null;
    if (url.hostname.includes("youtube")) return /^\/embed\/[A-Za-z0-9_-]{6,20}$/.test(url.pathname) ? url.toString() : null;
    return /^\/video\/[0-9]+$/.test(url.pathname) ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Markdown is the authoring format. Raw HTML is never trusted; generated markup is allow-list sanitized, including narrowly approved video embeds. */
export function renderArticleMarkdown(source: string): string {
  const rendered = marked.parse(source, { async: false, gfm: true, breaks: false, pedantic: false });
  if (typeof rendered !== "string") return "";
  return sanitizeHtml(rendered, {
    allowedTags: ["p", "h2", "h3", "h4", "blockquote", "ul", "ol", "li", "strong", "em", "del", "a", "img", "hr", "br", "code", "pre", "table", "thead", "tbody", "tr", "th", "td", "iframe"],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "loading", "decoding"],
      iframe: ["src", "title", "allow", "allowfullscreen", "loading", "referrerpolicy"],
      th: ["colspan", "rowspan"], td: ["colspan", "rowspan"],
    },
    allowedSchemes: ["https", "http", "mailto", "tel"],
    allowProtocolRelative: false,
    allowedIframeHostnames: [...embedHosts],
    transformTags: {
      a: (_tagName, attribs) => ({ tagName: "a", attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer nofollow" } }),
      img: (_tagName, attribs) => ({ tagName: "img", attribs: { ...attribs, loading: "lazy", decoding: "async" } }),
      iframe: (_tagName, attribs) => {
        const src = safeEmbedSource(attribs.src);
        return src
          ? { tagName: "iframe", attribs: { src, title: (attribs.title || "Embedded media").slice(0, 120), loading: "lazy", referrerpolicy: "strict-origin-when-cross-origin", allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share", allowfullscreen: "" } }
          : { tagName: "span", attribs: {} as Record<string, string> };
      },
    },
    exclusiveFilter: (frame) => frame.tag === "img" && !localMediaPath.test(frame.attribs.src || ""),
  });
}
