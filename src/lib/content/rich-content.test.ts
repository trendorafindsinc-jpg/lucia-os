import { describe, expect, it } from "vitest";
import { renderArticleHtml, renderArticleMarkdown } from "./rich-content";

describe("safe article rich content", () => {
  it("renders semantic Markdown headings, lists, emphasis and links", () => {
    const html = renderArticleMarkdown("## A heading\n\nA **bold** idea and [a link](https://example.com).\n\n- One\n- Two");
    expect(html).toContain("<h2>A heading</h2>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain('rel="noopener noreferrer nofollow"');
    expect(html).toContain("<ul>");
  });

  it("removes raw HTML, scripts, event handlers and unsafe URL schemes", () => {
    const html = renderArticleMarkdown('<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">\n\n[bad](javascript:alert(1))');
    expect(html).not.toMatch(/<script|onerror|javascript:/i);
    expect(html).not.toContain("alert(1)");
  });

  it("allows only website-owned media image references", () => {
    const html = renderArticleMarkdown("![Owned](/_media/123e4567-e89b-42d3-a456-426614174000)\n\n![Remote](https://evil.example/image.png)");
    expect(html).toContain('/_media/123e4567-e89b-42d3-a456-426614174000');
    expect(html).not.toContain("evil.example");
  });

  it("allows only HTTPS embeds from the approved video hosts and paths", () => {
    const allowed = renderArticleMarkdown('<iframe src="https://www.youtube-nocookie.com/embed/abcdefghijk" title="Demo"></iframe>');
    const blocked = renderArticleMarkdown('<iframe src="https://evil.example/embed/abcdefghijk"></iframe>');
    expect(allowed).toContain("youtube-nocookie.com/embed/abcdefghijk");
    expect(blocked).not.toContain("evil.example");
    const wrongPath = renderArticleMarkdown('<iframe src="https://www.youtube.com/watch?v=abcdefghijk"></iframe>');
    expect(wrongPath).not.toContain("youtube.com/watch");
  });
});


describe("safe article HTML source mode", () => {
  it("preserves semantic HTML and website-owned media", () => {
    const html = renderArticleHtml('<section><h2>Welcome</h2><figure><img src="/_media/123e4567-e89b-42d3-a456-426614174000" alt="A view"><figcaption>Our view</figcaption></figure><p><strong>Readable</strong> HTML.</p></section>');
    expect(html).toContain("<section>");
    expect(html).toContain("<figure>");
    expect(html).toContain("<figcaption>Our view</figcaption>");
    expect(html).toContain('/_media/123e4567-e89b-42d3-a456-426614174000');
  });

  it("removes scripts, event handlers, styles, unsafe URLs and unapproved embeds", () => {
    const html = renderArticleHtml('<script>alert(1)</script><p onclick="alert(1)" style="color:red">Safe text <a href="javascript:alert(1)">bad link</a></p><iframe src="https://evil.example/embed/abc"></iframe>');
    expect(html).not.toMatch(/<script|onclick|style=|javascript:|evil\.example/i);
    expect(html).toContain("Safe text");
  });
});
