import {describe,expect,it} from "vitest";
import {legacyArticleDraft} from "./legacy-import";
import type {BlogPost} from "./content-library";
const post=(overrides:Partial<BlogPost>={}):BlogPost=>({id:"post-one",title:"A Useful Story",slug:"useful-story",excerpt:"A short summary",body:"A complete story with useful information.",status:"published",tags:["news"],featuredImageId:null,updatedAt:"2026-11-01T12:00:00.000Z",...overrides});
describe("legacy article import mapping",()=>{
 it("always imports old publication labels as private drafts",()=>{expect(legacyArticleDraft(post(),new Set()).status).toBe("draft");expect(legacyArticleDraft(post({status:"scheduled"}),new Set()).status).toBe("draft");});
 it("keeps stable source identity and resolves slug collisions deterministically",()=>{const used=new Set(["useful-story"]);const first=legacyArticleDraft(post(),used);expect(first.sourceId).toBe("post-one");expect(first.slug).toBe("useful-story-2");expect(legacyArticleDraft(post({id:"post-two"}),used).slug).toBe("useful-story-3");});
});
