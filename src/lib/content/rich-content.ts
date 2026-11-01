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
      iframe: ["src", "title", "allow", "a¶»§q«^