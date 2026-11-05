import { describe, expect, it } from "vitest";
import { articleDraftSchema, articleContentBlocksSchema, legacyBodyBlocks, articleRoute, publicationReady, newArticleSlug, updateArticleSchema } from "./article-model";
import { renderArticleBlocks } from "./rich-content";
describe("Phase 15 content-contract foundation", () => {
 const valid={kind:"blog" as const,title:"A Barber's Story",slug:"a-barbers-story",excerpt:"How we welcome our customers",body:"A thoughtful story about working with our local customers.",category:"Grooming",authorName:null,eventAt:null,isFeatured:false,correctionNote:null,correctsSlug:null,tags:["community","local"],seoTitle:"A Barber’s Story",seoDescription:"How we welcome customers to our local barber shop.",featuredMediaRef:null,featuredMediaAlt:null};
 it("supports two honest content kinds with stable URLs",()=>{
  expect(articleDraftSchema.parse(valid).kind).toBe("blog");
  expect(articleDraftSchema.parse({...valid,kind:"news"}).kind).toBe("news");
  expect(articleDraftSchema.parse(valid).tags).toEqual(["community","local"]);
  expect(articleDraftSchema.parse({...valid,kind:"news",eventAt:"2026-11-02T10:00:00.000Z",isFeatured:true,correctionNote:"Corrected event venue.",correctsSlug:"previous-update"}).isFeatured).toBe(true);
  expect(articleDraftSchema.safeParse({...valid,correctsSlug:"../../private"}).success).toBe(false);
  expect(articleDraftSchema.parse(valid).seoTitle).toBe("A Barber’s Story");
  expect(articleDraftSchema.safeParse({...valid,tags:Array(13).fill("tag")}).success).toBe(false);
  expect(articleDraftSchema.safeParse({...valid,seoDescription:"x".repeat(161)}).success).toBe(false);
  expect(articleRoute("blog","first-post")).toBe("/blog/first-post");
  expect(articleRoute("news","first-post")).toBe("/news/first-post");
  expect(newArticleSlug("A Barber's Story")).toBe("a-barber-s-story");
 });
 it("validates ordered reusable blocks and preserves legacy article source",()=>{
  const blocks=[
   {id:"intro",type:"paragraph",text:"Opening paragraph"},
   {id:"section",type:"heading",level:2,text:"A section"},
   {id:"points",type:"list",ordered:false,items:["First","Second"]},
   {id:"quote",type:"quote",text:"A quotation",citation:"Author"},
  ];
  expect(articleContentBlocksSchema.parse(blocks)).toEqual(blocks);
  expect(articleContentBlocksSchema.safeParse([{id:"bad",type:"heading",level:1,text:"Invalid level"}]).success).toBe(false);
  expect(articleContentBlocksSchema.safeParse(Array(201).fill(blocks[0])).success).toBe(false);
  const legacy="<h2>Existing article</h2><p>Preserve exact markup.</p>";
  expect(legacyBodyBlocks(legacy)).toEqual([{id:"legacy-body",type:"legacy",source:legacy}]);
  expect(legacyBodyBlocks("")).toEqual([]);
  const editable = Object.fromEntries(Object.entries(valid).filter(([key])=>!["kind","featuredMediaAlt","authorName"].includes(key)));
  expect(updateArticleSchema.safeParse({...editable,revision:1,action:"save",contentBlocks:blocks}).success).toBe(true);
 });
 it("accepts all Phase 2 article block types and safely renders them",()=>{
  const blocks=[
   {id:"p1",type:"paragraph" as const,text:"A paragraph"},
   {id:"h1",type:"heading" as const,level:4 as const,text:"A subheading"},
   {id:"list",type:"list" as const,ordered:true,items:["One","Two"]},
   {id:"quote",type:"quote" as const,text:"A quote",citation:"An author"},
   {id:"table",type:"table" as const,headers:["Name","Role"],rows:[["Ada","Editor"]]},
   {id:"divider",type:"divider" as const},
   {id:"link",type:"link" as const,text:"Read more",url:"https://example.com"},
  ];
  expect(articleContentBlocksSchema.parse(blocks)).toEqual(blocks);
  const html=renderArticleBlocks(blocks,"");
  expect(html).toContain("<h4>A subheading</h4>");
  expect(html).toContain("<ol>");
  expect(html).toContain("<blockquote>");
  expect(html).toContain("<table>");
  expect(html).toContain('href="https://example.com"');
  expect(renderArticleBlocks([{id:"old",type:"legacy",source:"## Existing\\n\\nBody"}],"")).toContain("<h2>Existing</h2>");
  expect(renderArticleBlocks(undefined,"Legacy body")).toContain("Legacy body");
  expect(renderArticleBlocks([{id:"bad",type:"paragraph",text:"<script>alert(1)</script>"}],"")).not.toContain("<script>");
 });
 it("prevents premature publication of unfinished articles",()=>{
  expect(publicationReady(valid)).toBe(true);
  expect(publicationReady({...valid,body:""})).toBe(false);
  expect(publicationReady({...valid,excerpt:""})).toBe(false);
 });
 it("rejects HTML through unsafe slug and preserves exact revision protocol",()=>{
  expect(articleDraftSchema.safeParse({...valid,slug:"../../admin"}).success).toBe(false);
  expect(updateArticleSchema.safeParse({...valid,revision:-1,action:"publish"}).success).toBe(false);
  expect(updateArticleSchema.safeParse({...valid,revision:2,action:"schedule"}).success).toBe(false);
  const editable = Object.fromEntries(Object.entries(valid).filter(([key])=>!["kind","featuredMediaAlt","authorName"].includes(key)));
  expect(updateArticleSchema.safeParse({...editable,revision:2,action:"schedule",scheduledAt:"2026-11-02T10:00:00.000Z"}).success).toBe(true);
  expect(updateArticleSchema.safeParse({...valid,revision:2,action:"publish",injected:"unexpected"}).success).toBe(false);
  expect(articleDraftSchema.parse({...valid,featuredMediaRef:"media:b8e95a60-fbde-4c37-93e6-a2916c7b13d4"}).featuredMediaRef).toMatch(/^media:/);
  expect(articleDraftSchema.safeParse({...valid,featuredMediaRef:"https://evil.test/image.png"}).success).toBe(false);
 });
});
