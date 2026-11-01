import {describe,expect,it} from "vitest";
import {createArticleEmbedHtml,renderArticleHtml,renderArticleMarkdown} from "./rich-content";
describe("safe article rich content",()=>{
 it("renders semantic Markdown and safe links",()=>{const h=renderArticleMarkdown("## A heading\n\nA **bold** idea and [a link](https://example.com).\n\n- One\n- Two");expect(h).toContain("<h2>A heading</h2>");expect(h).toContain("<strong>bold</strong>");expect(h).toContain('rel="noopener noreferrer nofollow"');});
 it("removes scripts, event handlers and unsafe URL schemes",()=>{const h=renderArticleMarkdown('<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">\n\n[bad](javascript:alert(1))');expect(h).not.toMatch(/<script|onerror|javascript:/i);expect(h).not.toContain("alert(1)");});
 it("allows only website-owned media images and links",()=>{const id="123e4567-e89b-42d3-a456-426614174000";const h=renderArticleMarkdown("![Owned](/_media/"+id+")\n\n![Remote](https://evil.example/image.png)\n\n[Download](media:"+id+")");expect(h).toContain("/_media/"+id);expect(h).not.toContain("evil.example");expect(h).toContain('href="/_media/'+id+'"');});
 it("converts supported provider URLs into validated embed blocks",()=>{const cases=[["https://youtu.be/abcdefghijk","youtube-nocookie.com/embed/abcdefghijk"],["https://vimeo.com/123456789","player.vimeo.com/video/123456789"],["https://open.spotify.com/track/abc123","open.spotify.com/embed/track/abc123"],["https://soundcloud.com/artist/track","w.soundcloud.com/player/"],["https://podcasts.apple.com/us/podcast/example/id123456789","embed.podcasts.apple.com/us/podcast/example/id123456789"],["https://www.tiktok.com/@creator/video/1234567890123456789","www.tiktok.com/embed/v2/1234567890123456789"],["https://www.instagram.com/reel/AbCdEf123/","www.instagram.com/reel/AbCdEf123/embed/"]];for(const [url,expected] of cases){const e=createArticleEmbedHtml(url);expect(e).toContain(expected);expect(renderArticleHtml(e||"")).toContain(expected);}expect(createArticleEmbedHtml("https://evil.example/video/123")).toBeNull();expect(createArticleEmbedHtml("javascript:alert(1)")).toBeNull();});
 it("renders uploaded videos only from website-owned media paths",()=>{
  const id="123e4567-e89b-42d3-a456-426614174000";
  const safe=renderArticleHtml('<video autoplay><source src="/_media/'+id+'" type="video/mp4"></video>');
  expect(safe).toContain("<video controls preload=\"metadata\" playsinline>");
  expect(safe).toContain('<source src="/_media/'+id+'" type="video/mp4"></source>');
  expect(safe).not.toContain("autoplay");
  const remote=renderArticleHtml('<video controls><source src="https://evil.example/movie.mp4" type="video/mp4"></video>');
  expect(remote).not.toContain("evil.example");
 });
 it("rejects iframe spoofing and unapproved paths",()=>{expect(renderArticleHtml('<iframe src="https://open.spotify.com/track/abc123"></iframe>')).not.toContain("spotify.com");expect(renderArticleHtml('<iframe src="https://www.youtube.com.evil.example/embed/abcdefghijk"></iframe>')).not.toContain("evil.example");});
});
describe("safe article HTML",()=>{it("preserves semantic markup and owned images",()=>{const h=renderArticleHtml('<section><h2>Welcome</h2><figure><img src="/_media/123e4567-e89b-42d3-a456-426614174000" alt="A view"><figcaption>Our view</figcaption></figure></section>');expect(h).toContain("<section>");expect(h).toContain("<figcaption>Our view</figcaption>");});it("strips scripts, styles and unsafe links",()=>{const h=renderArticleHtml('<script>alert(1)</script><p onclick="alert(1)" style="color:red">Safe text <a href="javascript:alert(1)">bad</a></p>');expect(h).not.toMatch(/<script|onclick|style=|javascript:/i);expect(h).toContain("Safe text");});});
