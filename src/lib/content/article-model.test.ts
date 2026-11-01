import { describe, expect, it } from "vitest";
import { articleDraftSchema, articleRoute, publicationReady, newArticleSlug, updateArticleSchema } from "./article-model";
describe("Phase 15 content-contract foundation", () => {
 const valid={kind:"blog" as const,title:"A Barber's Story",slug:"a-barbers-story",excerpt:"How we welcome our customers",body:"A thoughtful story about working with our local customers.",category:"Grooming",featuredMediaRef:null,featuredMediaAlt:null};
 it("supports two honest content kinds with stable URLs",()=>{
  expect(articleDraftSchema.parse(valid).kind).toBe("blog");
  expect(articleDraftSchema.parse({...valid,kind:"news"}).kind).toBe("news");
  expect(articleRoute("blog","first-post")).toBe("/blog/first-post");
  expect(articleRoute("news","first-post")).toBe("/news/first-post");
  expect(newArticleSlug("A Barber's Story")).toBe("a-barber-s-story");
 });
 it("prevents premature publication of unfinished articles",()=>{
  expect(publicationReady(valid)).toBe(true);
  expect(publicationReady({...valid,body:""})).toBe(false);
  expect(publicationReady({...valid,excerpt:""})).toBe(false);
 });
 it("rejects HTML through unsafe slug and preserves exact revision protocol",()=>{
  expect(articleDraftSchema.safeParse({...valid,slug:"../../admin"}).success).toBe(false);
  expect(updateArticleSchema.safeParse({...valid,revision:-1,action:"publish"}).success).toBe(false);
  expect(updateArticleSchema.safeParse({...valid,revision:2,action:"publish",injected:"unexpected"}).success).toBe(false);
  expect(articleDraftSchema.parse({...valid,featuredMediaRef:"media:b8e95a60-fbde-4c37-93e6-a2916c7b13d4"}).featuredMediaRef).toMatch(/^media:/);
  expect(articleDraftSchema.safeParse({...valid,featuredMediaRef:"https://evil.test/image.png"}).success).toBe(false);
 });
});
