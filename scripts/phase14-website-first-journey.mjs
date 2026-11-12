/** Actual compiled-app customer journey for the new website-first editor.
 * Runs ONLY under check-website-foundation-http.mjs's disposable acceptance DB,
 * browser proxy, synthetic hashed sessions, isolated NOBYPASSRLS role.
 * These are app-process tests, not evidence of external LUCIA Core OAuth.
 */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

export async function checkWebsiteFirstJourney({
  api, admin, f, base, browserContext, created, bpass, publicSite,
}) {
  const page = await browserContext.newPage();
  const issues = [];
  page.on("pageerror", (error) => issues.push(error.message));
  page.setDefaultTimeout(25000);
  const evidence = [];
  const test = async (name, fn) => {
    await fn();
    evidence.push(name);
    bpass("Website-first: " + name);
  };
  try {
    await test("website picker lists own sites, never another organization", async () => {
      const resp = await page.goto(base + "/workspace/websites", { waitUntil: "networkidle" });
      assert.equal(resp.status(), 200);
      await page.getByRole("heading", { name: "Your websites" }).waitFor();
      const cards = page.locator(".studio-picker-card");
      assert.equal(await cards.count(), 2);
      assert((await page.locator("body").innerText()).includes("Continuity website A"));
      assert(!(await page.locator("body").innerText()).includes("Foreign website"));
      assert.equal(await page.locator(".workspace-sidebar").count(), 0);
      const foreign = await api("b", "/workspace/websites");
      assert.equal(foreign.status, 200);
      const foreignHtml = await foreign.text();
      assert(foreignHtml.includes("Foreign website"));
      assert(!foreignHtml.includes("Continuity website A"));
    });

    await test("creation asks three required questions, recommends relevant Layouts and offers all 48", async () => {
      await page.getByRole("link", { name: /Create New Website/ }).first().click();
      await page.locator(".website-first-form").waitFor();
      assert.equal(await page.locator(".website-first-form input[required]").count(), 2);
      assert.equal(await page.locator(".website-first-form > label select").count(), 1);
      await page.getByPlaceholder("e.g. Riverside Barbers").fill("Continuity organization A");
      await page.getByPlaceholder("e.g. Haircuts and grooming for local customers").fill("Barbershop haircuts grooming services");
      assert.equal(await page.locator(".website-first-layout").count(), 3);
      const list = await page.locator(".website-first-layout h3").allTextContents();
      assert(list.some(name => /Local|Care|Motion/i.test(name)), JSON.stringify(list));
      await page.getByRole("button", { name: "View all 48 Layouts" }).click();
      assert.equal(await page.locator(".website-first-layout").count(), 48);
      await page.locator(".website-first-layout").filter({ has: page.getByRole("heading", { name: "Meridian", exact: true }) })
        .getByRole("button", { name: "Choose Layout" }).click();
      assert.equal(await page.locator(".website-first-layout.selected h3").innerText(), "Meridian");
    });

    let siteId = "";
    await test("creates a durable website once and opens the actual editable Layout", async () => {
      const requested = page.waitForResponse(r => r.url().endsWith("/api/onboarding/website") && r.request().method() === "POST");
      await page.getByRole("button", { name: /Create website & edit/ }).click();
      const response = await requested;
      await page.waitForURL(/\/editor\?websiteId=/);
      siteId = new URL(page.url()).searchParams.get("websiteId");
      assert(siteId && /^[0-9a-f-]{36}$/i.test(siteId));
      created.push(siteId); // Cleanup must be registered before subsequent assertions.
      assert.equal(response.status(), 201, "New-site creation must persist a real project");
      await page.locator(".website-first-editor [data-layout-id='lucia.layout.meridian']").waitFor();
      assert.equal((await (await api("a", "/api/websites/" + siteId + "/draft")).json()).draft.layoutId, "lucia.layout.meridian");
      assert.equal((await api("b", "/api/websites/" + siteId + "/draft")).status, 404);
      assert.equal((await api(null, "/api/websites/" + siteId + "/draft")).status, 401);
    });

    await test("on-page text edit, undo/redo and server-confirmed reload", async () => {
      const title = page.locator(".website-first-editor-canvas .premium-hero h1").first();
      await title.click();
      const field = page.locator(".website-first-inline-control textarea");
      await field.waitFor();
      await field.fill("Genuine customer journey — built on LUCIA");
      await page.getByRole("button", { name: "Apply change" }).click();
      assert((await page.locator(".premium-hero h1").innerText()).includes("Genuine customer journey"));
      await page.getByRole("button", { name: "Undo edit" }).click();
      assert(!(await page.locator(".premium-hero h1").innerText()).includes("Genuine customer journey"));
      await page.getByRole("button", { name: "Redo edit" }).click();
      await page.locator(".website-first-editor-status.state-saved").waitFor({ timeout: 15000 });
      await page.reload({ waitUntil: "networkidle" });
      await page.locator(".premium-hero h1").waitFor();
      assert((await page.locator(".premium-hero h1").innerText()).includes("Genuine customer journey"));
      const persisted = await (await api("a", "/api/websites/" + siteId + "/draft")).json();
      assert.equal(persisted.draft.pages[0].sections.find(s => s.type === "premium-hero").heading, "Genuine customer journey — built on LUCIA");
    });

    await test("section insertion persists and mobile/desktop has no major horizontal overflow", async () => {
      const before = (await (await api("a", "/api/websites/" + siteId + "/draft")).json()).draft.pages[0].sections.length;
      await page.getByRole("button", { name: "+ Add Section" }).click();
      await page.locator(".website-first-editor-status.state-saved").waitFor({ timeout: 15000 });
      const now = (await (await api("a", "/api/websites/" + siteId + "/draft")).json()).draft.pages[0].sections.length;
      assert.equal(now, before + 1);
      for (const width of [320, 390, 768, 1180, 1440]) {
        await page.setViewportSize({ width, height: width < 500 ? 844 : 900 });
        const size = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
        assert(size.scroll <= size.width + 2, "Editor overflow at " + width + ": " + JSON.stringify(size));
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await mkdir("artifacts/phase14-journey", { recursive: true });
      await page.screenshot({ path: "artifacts/phase14-journey/website-first-editor-390.png", fullPage: true });
    });

    await test("contact replacement uses visible website and is saved for real publishing", async () => {
      const before = await (await api("a", "/api/websites/" + siteId + "/draft")).json();
      const contactPage = before.draft.pages.find(p => p.path === "/contact");
      assert(contactPage);
      await page.getByRole("combobox", { name: "Page" }).selectOption(contactPage.id);
      const contact = page.locator(".website-first-editor-canvas .premium-contact a[href^='mailto:']").first();
      await contact.waitFor();
      await contact.click();
      const input = page.locator(".website-first-inline-control textarea");
      await input.waitFor();
      await input.fill("riverside@realbarber.ng");
      await page.getByRole("button", { name: "Apply change" }).click();
      await page.locator(".website-first-editor-status.state-saved").waitFor({ timeout: 15000 });
      const after = await (await api("a", "/api/websites/" + siteId + "/draft")).json();
      assert(after.draft.pages.flatMap(p => p.sections.filter(s => s.type === "contact-panel")).every(s => s.email === "riverside@realbarber.ng"));
      await page.getByRole("combobox", { name: "Page" }).selectOption(after.draft.pages[0].id);
      await page.getByRole("button", { name: "Preview", exact: true }).click();
      assert.equal(await page.locator(".website-first-editor-canvas [data-layout-id='lucia.layout.meridian']").count(), 1);
      await page.getByRole("button", { name: "Return to Edit" }).click();
    });

    await test("in-Studio Publish uses authorized API and reaches correct public host", async () => {
      await page.getByRole("button", { name: "Publish", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: "Publish your website" });
      await dialog.waitFor();
      await dialog.getByRole("button", { name: "Publish website" }).click();
      await dialog.getByText(/Publication confirmed/).waitFor({ timeout: 20000 });
      const draft = await (await api("a", "/api/websites/" + siteId + "/draft")).json();
      assert.equal(draft.website.status, "published");
      const host = draft.website.slug + ".lucia.name.ng";
      const homepage = await publicSite("/", host);
      assert.equal(homepage.status, 200);
      const html = await homepage.text();
      assert(html.includes("Genuine customer journey"));
      assert.equal((await api("b", "/api/websites/" + siteId + "/draft")).status, 404);
      await dialog.getByRole("button", { name: "Return to website" }).click();
      assert(new URL(page.url()).pathname === "/editor");
    });
    await test("Blog and News use tenant-safe drafts, public snapshots, revision restore and the versioned content contract",async()=>{
      const articlesPath="/api/websites/"+siteId+"/articles";
      const listingResponse=await api("a",articlesPath);assert.equal(listingResponse.status,200);
      const listing=await listingResponse.json();const host=listing.siteSlug+".lucia.name.ng";
      assert.equal((await api("b",articlesPath)).status,404);
      assert.equal((await api(null,articlesPath)).status,401);
      const createdResponse=await api("a",articlesPath,"POST",{kind:"blog",title:"Continuity Blog Story"});
      assert.equal(createdResponse.status,201);const createdArticle=(await createdResponse.json()).article;
      const articlePath=articlesPath+"/"+createdArticle.id;
      const baseDraft={title:"Continuity Blog Story",slug:createdArticle.slug,excerpt:"A useful summary for the first customer story.",body:"This is a meaningful published article body for the continuity acceptance journey.",category:"Community",eventAt:null,isFeatured:false,correctionNote:null,correctsSlug:null,tags:["community","launch"],seoTitle:"Continuity Blog Story | LUCIA",seoDescription:"A useful public summary for the first customer story.",featuredMediaRef:null,scheduledAt:null};
      const saveOne=await api("a",articlePath,"PATCH",{...baseDraft,revision:1,action:"save"});assert.equal(saveOne.status,200);
      const firstSaved=(await saveOne.json()).article;assert.equal(firstSaved.revision,2);
      const privateArticle=await publicSite("/blog/"+createdArticle.slug,host);assert.equal(privateArticle.status,404);
      const saveTwo=await api("a",articlePath,"PATCH",{...baseDraft,title:"Continuity Blog Story — Private Draft",body:"This second private draft must not replace the public snapshot.",revision:2,action:"save"});
      assert.equal(saveTwo.status,200);const secondSaved=(await saveTwo.json()).article;assert.equal(secondSaved.revision,3);
      const revisionsResponse=await api("a",articlePath+"/revisions");assert.equal(revisionsResponse.status,200);
      const revisions=(await revisionsResponse.json()).revisions;assert.deepEqual(revisions.map(item=>item.revision).sort((a,b)=>a-b),[1,2,3]);
      const restoredResponse=await api("a",articlePath+"/revisions","POST",{currentRevision:3,targetRevision:2});assert.equal(restoredResponse.status,200);
      const restored=(await restoredResponse.json()).article;assert.equal(restored.revision,4);assert.equal(restored.title,baseDraft.title);assert.equal(restored.body,baseDraft.body);
      const publishedResponse=await api("a",articlePath,"PATCH",{...baseDraft,revision:4,action:"publish"});assert.equal(publishedResponse.status,200);
      const published=(await publishedResponse.json()).article;assert.equal(published.status,"published");
      const publicArticle=await publicSite("/blog/"+createdArticle.slug,host);assert.equal(publicArticle.status,200);
      assert((await publicArticle.text()).includes(baseDraft.body));
      const privateEdit=await api("a",articlePath,"PATCH",{...baseDraft,title:"Never public until republished",body:"Private editorial changes must remain separate from the live article.",revision:5,action:"save"});
      assert.equal(privateEdit.status,200);
      const liveAfterSave=await publicSite("/blog/"+createdArticle.slug,host);assert.equal(liveAfterSave.status,200);
      assert((await liveAfterSave.text()).includes(baseDraft.body));
      assert(!(await liveAfterSave.text()).includes("Private editorial changes"));
      const latest=(await privateEdit.json()).article;
      const restoreLiveDraft=await api("a",articlePath+"/revisions","POST",{currentRevision:latest.revision,targetRevision:4});
      assert.equal(restoreLiveDraft.status,200);
      const stillLive=await publicSite("/blog/"+createdArticle.slug,host);assert.equal(stillLive.status,200);assert((await stillLive.text()).includes(baseDraft.body));
      assert.equal((await api("b",articlePath+"/revisions")).status,404);
      assert.equal((await api("b",articlePath+"/revisions","POST",{currentRevision:7,targetRevision:2})).status,404);
      const blogIndex=await publicSite("/blog",host);assert.equal(blogIndex.status,200);assert((await blogIndex.text()).includes("Continuity Blog Story"));
      const publicContract=await publicSite("/api/public/v1/content",host);assert.equal(publicContract.status,200);
      const contract=JSON.parse(await publicContract.text());assert.equal(contract.contract,"lucia.published-content.v1");assert(contract.content.blog.some(item=>item.slug===createdArticle.slug));
      const homepage=await publicSite("/",host);const homepageHtml=await homepage.text();assert(homepageHtml.includes("Stories &amp; updates")||homepageHtml.includes("Stories & updates"));assert(homepageHtml.includes('href="/blog"'));assert(homepageHtml.includes('href="/news"'));
      const unpublishDraft={...baseDraft,revision:7,action:"unpublish"};
      const unpublished=await api("a",articlePath,"PATCH",unpublishDraft);assert.equal(unpublished.status,200);
      assert.equal((await publicSite("/blog/"+createdArticle.slug,host)).status,404);

      const previousNewsResponse=await api("a",articlesPath,"POST",{kind:"news",title:"Continuity Previous News"});assert.equal(previousNewsResponse.status,201);
      const previous=(await previousNewsResponse.json()).article;
      const newsDraft={title:"Continuity Previous News",slug:previous.slug,excerpt:"An earlier verified local news update.",body:"This is the original report used to verify the News correction and update workflow.",category:"Community",eventAt:null,isFeatured:false,correctionNote:null,correctsSlug:null,tags:["community","news"],seoTitle:"Continuity Previous News",seoDescription:"An earlier verified local news update.",featuredMediaRef:null,scheduledAt:null};
      const previousSave=await api("a",articlesPath+"/"+previous.id,"PATCH",{...newsDraft,revision:1,action:"save"});assert.equal(previousSave.status,200);
      const previousPublish=await api("a",articlesPath+"/"+previous.id,"PATCH",{...newsDraft,revision:2,action:"publish"});assert.equal(previousPublish.status,200);
      const updateNewsResponse=await api("a",articlesPath,"POST",{kind:"news",title:"Continuity Updated News"});assert.equal(updateNewsResponse.status,201);
      const updated=(await updateNewsResponse.json()).article;
      const updateDraft={title:"Continuity Updated News",slug:updated.slug,excerpt:"The corrected event details and verified update.",body:"This updated report records the corrected venue and event information for the community.",category:"Events",eventAt:"2026-11-02T10:00:00.000Z",isFeatured:true,correctionNote:"Correction: the event venue has changed. This report contains the verified venue.",correctsSlug:previous.slug,tags:["events","correction"],seoTitle:"Continuity Updated News",seoDescription:"The corrected event details and verified update.",featuredMediaRef:null,scheduledAt:null};
      const updateSave=await api("a",articlesPath+"/"+updated.id,"PATCH",{...updateDraft,revision:1,action:"save"});assert.equal(updateSave.status,200);
      const updatePublish=await api("a",articlesPath+"/"+updated.id,"PATCH",{...updateDraft,revision:2,action:"publish"});assert.equal(updatePublish.status,200);
      const newsPage=await publicSite("/news/"+updated.slug,host);assert.equal(newsPage.status,200);const newsHtml=await newsPage.text();
      assert(newsHtml.includes("Correction: the event venue has changed"));assert(newsHtml.includes(previous.slug));assert(newsHtml.includes("Events"));
      const newsIndex=await publicSite("/news",host);assert.equal(newsIndex.status,200);assert((await newsIndex.text()).includes("Continuity Updated News"));
      const contractAfterNews=JSON.parse(await (await publicSite("/api/public/v1/content",host)).text());assert(contractAfterNews.content.news.some(item=>item.slug===updated.slug&&item.isFeatured));
      const homepageAfterNews=await publicSite("/",host);assert((await homepageAfterNews.text()).includes("Continuity Updated News"));
    });

    await test("scheduled News stays private until the database-backed publisher claims it",async()=>{
      const articlesPath="/api/websites/"+siteId+"/articles";
      const createdResponse=await api("a",articlesPath,"POST",{kind:"news",title:"Continuity Scheduled News"});assert.equal(createdResponse.status,201);
      const createdArticle=(await createdResponse.json()).article;
      const draft={title:"Continuity Scheduled News",slug:createdArticle.slug,excerpt:"A verified story scheduled for release.",body:"This scheduled article is held privately until its publication time is reached by the worker.",category:"Updates",eventAt:null,isFeatured:false,correctionNote:null,correctsSlug:null,tags:["scheduled"],seoTitle:"Continuity Scheduled News",seoDescription:"A verified story scheduled for release.",featuredMediaRef:null,scheduledAt:new Date(Date.now()+10*60*1000).toISOString()};
      const scheduled=await api("a",articlesPath+"/"+createdArticle.id,"PATCH",{...draft,revision:1,action:"schedule"});assert.equal(scheduled.status,200);
      assert.equal((await publicSite("/news/"+createdArticle.slug,(await (await api("a",articlesPath)).json()).siteSlug+".lucia.name.ng")).status,404);
      await admin`UPDATE website_posts SET scheduled_at=now()-interval '1 minute' WHERE id=${createdArticle.id} AND website_id=${siteId} AND status='scheduled'`;
      const cron=await api(null,"/api/cron/publish-articles","GET",undefined,{authorization:"Bearer "+process.env.CRON_SECRET});assert.equal(cron.status,200);
      const cronResult=await cron.json();assert(cronResult.published>=1);
      const host=(await (await api("a",articlesPath)).json()).siteSlug+".lucia.name.ng";
      const publicScheduled=await publicSite("/news/"+createdArticle.slug,host);assert.equal(publicScheduled.status,200);assert((await publicScheduled.text()).includes("Continuity Scheduled News"));
    });
    assert.equal(issues.length, 0, issues.join("; "));
    bpass("Website-first: no unhandled Chromium page exceptions");
    return evidence;
  } finally {
    await page.close();
  }
}
