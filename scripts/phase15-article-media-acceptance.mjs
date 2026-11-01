/** Compiled-app Blog/News acceptance using the existing synthetic NOBYPASSRLS customer session.
 * Media rows are synthetic metadata only; no IDrive object upload or production storage claim is made.
 */
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";

export async function checkPhase15ArticleMediaAcceptance({
  api, admin, f, base, browserContext, siteId, siteSlug, bpass, publicSite,
}) {
  const host = siteSlug + ".lucia.name.ng";
  const mediaIds = [randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID()];
  const [blogImage, draftImage, foreignImage, inlineImage, videoAsset, pdfAsset] = mediaIds;
  const alts = ["Synthetic Blog featured image", "Synthetic replacement image", "Foreign tenant image", "Synthetic inline article image", "Synthetic demo video", "Synthetic report PDF"];
  const articleRoute = "/api/websites/" + siteId + "/articles";
  let articleId = null, newsId = null, correctedNewsId = null, scheduledNewsId = null, reservedBytes = 0;
  async function seedMedia(id, orgId, websiteId, userId, alt) {
    const objectKey = "os/" + orgId + "/" + websiteId + "/" + id + ".webp";
    await admin`INSERT INTO website_media
      (id,organization_id,website_id,created_by_user_id,object_key,bytes,width,height,alt,status)
      VALUES (${id},${orgId},${websiteId},${userId},${objectKey},200,10,10,${alt},'ready')`;
    await admin`UPDATE media_storage_budget SET reserved_bytes=reserved_bytes+200 WHERE product='lucia-os'`;
    reservedBytes += 200;
  }
  async function seedTypedMedia(id,kind,mime,extension,originalName,alt,checksum){
    const objectKey="os/"+f.orgA+"/"+siteId+"/"+id+"."+extension;
    await admin`INSERT INTO website_media (id,organization_id,website_id,created_by_user_id,object_key,kind,mime,original_name,checksum,etag,bytes,width,height,alt,status)
      VALUES (${id},${f.orgA},${siteId},${f.a},${objectKey},${kind},${mime},${originalName},${checksum},'0123456789abcdef0123456789abcdef',200,0,0,${alt},'ready')`;
    await admin`UPDATE media_storage_budget SET reserved_bytes=reserved_bytes+200 WHERE product='lucia-os'`;reservedBytes+=200;
  }
  async function patchArticle(id, article, featuredMediaRef, action) {
    return api("a", articleRoute + "/" + id, "PATCH", {
      title: article.title, slug: article.slug, excerpt: article.excerpt,
      body: article.body, category: article.category,eventAt:article.eventAt??null,isFeatured:article.isFeatured??false,
      correctionNote:article.correctionNote??null,correctsSlug:article.correctsSlug??null,tags:article.tags??[],
      seoTitle:article.seoTitle??null,seoDescription:article.seoDescription??null,
      featuredMediaRef,scheduledAt:article.scheduledAt??null,revision: article.revision, action,
    });
  }
  try {
    await seedMedia(blogImage, f.orgA, siteId, f.a, alts[0]);
    await seedMedia(draftImage, f.orgA, siteId, f.a, alts[1]);
    await seedMedia(foreignImage, f.orgB, f.foreign, f.b, alts[2]);
    await seedMedia(inlineImage, f.orgA, siteId, f.a, alts[3]);
    await seedTypedMedia(videoAsset,"video","video/mp4","mp4","demo.mp4",alts[4],"a".repeat(64));
    await seedTypedMedia(pdfAsset,"document","application/pdf","pdf","report.pdf",alts[5],"b".repeat(64));

    const title = "Phase 15 blog " + randomBytes(5).toString("hex");
    const created = await api("a", articleRoute, "POST", { kind: "blog", title });
    const createdBody = await created.json();
    assert.equal(created.status, 201, createdBody.error);
    articleId = createdBody.article.id;
    assert.equal((await api("b", articleRoute)).status, 404);
    assert.equal((await api("a", articleRoute, "POST", { kind: "blog", title }, { origin: "https://evil.test" })).status, 403);

    let article = {
      ...createdBody.article,
      excerpt: "A useful summary for our customers.",
      body: "This is a synthetic article body with enough detail to be published safely.\n\n[Watch the demo](media:"+videoAsset+")\n\n[Download the report](media:"+pdfAsset+")\\n\\n![Inline media](/_media/"+inlineImage+")",
      category: "Acceptance",tags:["customer-story","media"],seoTitle:title+" | LUCIA",seoDescription:"A useful public summary for our customers.",
    };
    const initialized = await patchArticle(articleId, article, null, "save");
    const initializedBody = await initialized.json();
    assert.equal(initialized.status, 200, initializedBody.error);
    article = initializedBody.article;
    const foreignRef = await patchArticle(articleId, article, "media:" + foreignImage, "save");
    assert.equal(foreignRef.status, 422, "A different tenant's media must not be attachable");
    const foreignBody=await patchArticle(articleId,{...article,body:article.body+"\n\n[Foreign](media:"+foreignImage+")"},null,"save");
    assert.equal(foreignBody.status,422,"Markdown body references from another tenant must be rejected");
    const videoFeatured=await patchArticle(articleId,article,"media:"+videoAsset,"save");
    assert.equal(videoFeatured.status,422,"Video assets cannot be used as article featured images");
    const firstHistory=await api("a",articleRoute+"/"+articleId+"/revisions");assert.equal(firstHistory.status,200);
    assert.deepEqual((await firstHistory.json()).revisions.map(item=>item.revision).sort((a,b)=>a-b),[1,2]);
    assert.equal((await api("b",articleRoute+"/"+articleId+"/revisions")).status,404);
    const changedRevision=await patchArticle(articleId,{...article,title:title+" private draft"},null,"save");
    assert.equal(changedRevision.status,200);const changedRevisionArticle=(await changedRevision.json()).article;
    const restoredRevision=await api("a",articleRoute+"/"+articleId+"/revisions","POST",{currentRevision:changedRevisionArticle.revision,targetRevision:2});
    assert.equal(restoredRevision.status,200);article=(await restoredRevision.json()).article;
    assert.equal(article.revision,4);assert.equal(article.title,title);assert(article.body.includes("media:"+videoAsset));
    await assert.rejects(admin`UPDATE website_posts SET featured_media_id=${foreignImage} WHERE id=${articleId}`, /website_posts_featured_media_fk/);
    const privateBefore = await admin`SELECT * FROM lucia_public_media(${blogImage}::uuid)`;
    assert.equal(privateBefore.length, 0, "A ready image without a published article must remain private");
    assert.equal((await admin`SELECT * FROM lucia_public_media(${inlineImage}::uuid)`).length, 0, "An inline media path in a draft must remain private");

    // Exercise the actual website-first customer editor and its image selector.
    const page = await browserContext.newPage();
    try {
      await page.goto(base + "/editor?websiteId=" + siteId + "&content=blog", { waitUntil: "networkidle" });
      await page.locator(".story-studio").waitFor();
      await page.locator(".studio-media-library summary").click();
      const imageRow = page.locator(".studio-media-library li").filter({ hasText: alts[0] });
      await imageRow.getByRole("button", { name: "Use as featured image" }).click();
      await page.locator("#story-embed-url").fill("https://youtu.be/abcdefghijk");
      await page.getByRole("button", { name: "Insert embed" }).click();
      const markdownBody = await page.getByRole("textbox", { name: "Markdown article content" }).inputValue();
      assert(markdownBody.includes("youtube-nocookie.com/embed/abcdefghijk"), "The supported-provider embed control must insert a YouTube player");
      await page.getByRole("button", { name: "HTML source" }).click();
      const htmlBody = '<h2>HTML source mode acceptance</h2><p>Semantic HTML is supported.</p><img src="/_media/'+inlineImage+'" alt="Inline media"><video autoplay><source src="/_media/'+videoAsset+'" type="video/mp4"></video><a href="/_media/'+pdfAsset+'">Download report</a><iframe src="https://www.youtube-nocookie.com/embed/abcdefghijk" title="YouTube video"></iframe><iframe src="https://evil.example/embed/unsafe"></iframe><script>alert(1)</script><p onclick="alert(1)">Safe HTML text</p>';
      await page.getByRole("textbox", { name: "HTML source" }).fill(htmlBody);
      await page.getByRole("button", { name: "Preview draft" }).click();
      const draftPreview = page.locator(".story-studio-preview");
      await draftPreview.waitFor();
      const previewHtml = await draftPreview.innerHTML();
      assert(previewHtml.includes("<h2>HTML source mode acceptance</h2>"));
      assert(previewHtml.includes("youtube-nocookie.com/embed/abcdefghijk"));
      assert(!previewHtml.includes("<script") && !previewHtml.includes("onclick") && !previewHtml.includes("evil.example"), "HTML source preview must sanitize unsafe markup and unapproved embeds");
      await page.getByRole("button", { name: "Edit article" }).click();
      await page.locator(".story-studio-actions").getByRole("button", { name: "Save draft", exact: true }).click();
      await page.locator(".story-studio-notice").filter({ hasText: "Draft saved." }).waitFor();
      await page.locator(".story-studio-actions").getByRole("button", { name: "Publish", exact: true }).click();
      await page.locator(".story-studio-notice").filter({ hasText: "Published to your live website." }).waitFor();
    } finally {
      await page.close();
    }

    let articles = await (await api("a", articleRoute)).json();
    let saved = articles.articles.find((entry) => entry.id === articleId);
    assert.equal(saved.featuredMediaRef, "media:" + blogImage);
    assert.equal(saved.featuredMediaAlt, alts[0]);
    assert.equal(saved.status, "published");
    const publicIndex = await publicSite("/blog", host);
    const publicDetail = await publicSite("/blog/" + saved.publishedSlug, host);
    assert.equal(publicIndex.status, 200);
    assert((await publicIndex.text()).includes(title));
    assert.equal(publicDetail.status, 200);
    const detailHtml = await publicDetail.text();
    assert(detailHtml.includes(title));
    assert(detailHtml.includes("/_media/" + blogImage));
    assert(detailHtml.includes("/_media/" + inlineImage), "Published HTML/Markdown inline media path must render");
    assert(detailHtml.includes(alts[0]));
    assert(detailHtml.includes("HTML source mode acceptance"), "Published HTML source must render semantic content");
    assert(detailHtml.includes("youtube-nocookie.com/embed/abcdefghijk"), "Published article must retain an approved responsive YouTube embed");
    assert(!detailHtml.includes("evil.example") && !detailHtml.includes("<script") && !detailHtml.includes("onclick"), "Published HTML must remain sanitized");
    assert(detailHtml.includes("<video controls") && detailHtml.includes('href="/_media/'+pdfAsset+'"'), "Published HTML must support inline video and secure PDF downloads");
    assert(detailHtml.includes("/_media/"+videoAsset),"Published video link must resolve to the tenant media route");
    assert(detailHtml.includes("/_media/"+pdfAsset),"Published PDF link must resolve to the tenant media route");
    const publicVideo=await admin`SELECT * FROM lucia_public_media(${videoAsset}::uuid)`;assert.equal(publicVideo.length,1,"Published article body must authorize its video asset");
    const publicPdf=await admin`SELECT * FROM lucia_public_media(${pdfAsset}::uuid)`;assert.equal(publicPdf.length,1,"Published article body must authorize its PDF asset");
    const blogContract=JSON.parse(await (await publicSite("/api/public/v1/content",host)).text());
    assert(blogContract.content.blog.some(item=>item.slug===article.slug&&item.tags.includes("customer-story")&&item.seoTitle===article.seoTitle),"Published Blog metadata must be exposed through the versioned public contract");
    const publicImage = await admin`SELECT * FROM lucia_public_media(${blogImage}::uuid)`;
    assert.equal(publicImage.length, 1, "Published article snapshot must authorize its featured image");
    assert.equal((await admin`SELECT * FROM lucia_public_media(${inlineImage}::uuid)`).length, 1, "Published article body must authorize its inline image path");
    const privateReplacement = await admin`SELECT * FROM lucia_public_media(${draftImage}::uuid)`;
    assert.equal(privateReplacement.length, 0, "An unpublished replacement must not be publicly resolved");
    bpass("Blog customer journey: create → choose website-owned image → save → publish → public article and published-only image authorization");

    // Saving a replacement edits the draft, not the existing public snapshot.
    const changedDraft = await patchArticle(articleId, saved, "media:" + draftImage, "save");
    assert.equal(changedDraft.status, 200, (await changedDraft.clone().json()).error);
    articles = await (await api("a", articleRoute)).json();
    saved = articles.articles.find((entry) => entry.id === articleId);
    assert.equal(saved.featuredMediaRef, "media:" + draftImage);
    const unchangedLive = await publicSite("/blog/" + saved.publishedSlug, host);
    assert.equal(unchangedLive.status, 200);
    const unchangedHtml = await unchangedLive.text();
    assert(unchangedHtml.includes("/_media/" + blogImage));
    assert(!unchangedHtml.includes("/_media/" + draftImage));
    assert.equal((await admin`SELECT * FROM lucia_public_media(${blogImage}::uuid)`).length, 1);
    assert.equal((await admin`SELECT * FROM lucia_public_media(${draftImage}::uuid)`).length, 0);
    assert.equal((await api("a", "/api/websites/" + siteId + "/media?id=" + blogImage, "DELETE")).status, 409,
      "A published article image must be retained");
    assert.equal((await api("a", "/api/websites/" + siteId + "/media?id=" + draftImage, "DELETE")).status, 409,
      "A saved article draft/revision image must be retained");
    assert.equal((await api("a","/api/websites/"+siteId+"/media?id="+videoAsset,"DELETE")).status,409,"A published inline video must be retained");
    assert.equal((await api("a","/api/websites/"+siteId+"/media?id="+pdfAsset,"DELETE")).status,409,"A published inline PDF must be retained");

    // Even an unavailable selected image must not trap a customer in a published article.
    await admin`UPDATE website_media SET status='deleted' WHERE id=${draftImage}`;
    const unpublish = await patchArticle(articleId, saved, "media:" + draftImage, "unpublish");
    assert.equal(unpublish.status, 200, (await unpublish.clone().json()).error);
    assert.equal((await publicSite("/blog/" + saved.publishedSlug, host)).status, 404);
    assert(!(await (await publicSite("/blog", host)).text()).includes(title));
    assert.equal((await admin`SELECT * FROM lucia_public_media(${blogImage}::uuid)`).length, 0);
    assert.equal((await admin`SELECT * FROM lucia_public_media(${videoAsset}::uuid)`).length,0);
    assert.equal((await admin`SELECT * FROM lucia_public_media(${pdfAsset}::uuid)`).length,0);

    const newsTitle = "Phase 15 news " + randomBytes(5).toString("hex");
    const newsCreated = await api("a", articleRoute, "POST", { kind: "news", title: newsTitle });
    const newsBody = await newsCreated.json();
    assert.equal(newsCreated.status, 201, newsBody.error);
    newsId = newsBody.article.id;
    const newsDraft = { ...newsBody.article, excerpt: "A short official update.", body: "This is a synthetic news update for the isolated Phase 15 acceptance suite.", category: "Company",eventAt:null,isFeatured:false,correctionNote:null,correctsSlug:null,tags:["company","update"],seoTitle:newsTitle+" | LUCIA",seoDescription:"A short official update for the customer website." };
    const newsSaved = await patchArticle(newsId, newsDraft, null, "save");
    assert.equal(newsSaved.status, 200, (await newsSaved.clone().json()).error);
    const newsPublished = await patchArticle(newsId, (await newsSaved.json()).article, null, "publish");
    assert.equal(newsPublished.status, 200, (await newsPublished.clone().json()).error);
    const newsRecord = (await (await api("a", articleRoute)).json()).articles.find((entry) => entry.id === newsId);
    assert.equal((await publicSite("/news", host)).status, 200);
    assert((await (await publicSite("/news", host)).text()).includes(newsTitle));
    const newsPage = await publicSite("/news/" + newsRecord.publishedSlug, host);
    assert.equal(newsPage.status, 200);
    assert((await newsPage.text()).includes(newsTitle));
    const authorRows=await admin`SELECT published_snapshot->>'authorName' AS author,published_snapshot->>'seoTitle' AS seo_title,published_snapshot->'tags' AS tags FROM website_posts WHERE id=${newsId}`;
    const authorProfile=await admin`SELECT display_name FROM app_users WHERE id=${f.a}`;
    assert.equal(authorRows[0].author,authorProfile[0]?.display_name??null,"Published author attribution must match the signed-in author's public profile");
    assert.equal(authorRows[0].seo_title,newsDraft.seoTitle);assert.deepEqual(authorRows[0].tags,newsDraft.tags);

    const correctedTitle="Phase 15 correction "+randomBytes(5).toString("hex");
    const correctedCreated=await api("a",articleRoute,"POST",{kind:"news",title:correctedTitle});
    const correctedBody=await correctedCreated.json();assert.equal(correctedCreated.status,201,correctedBody.error);correctedNewsId=correctedBody.article.id;
    const correctedDraft={...correctedBody.article,excerpt:"The verified event details have been corrected.",body:"This corrected report contains the verified venue and event details for the community.",category:"Events",eventAt:"2026-11-02T10:00:00.000Z",isFeatured:true,correctionNote:"Correction: the event venue has changed. This report contains the verified venue.",correctsSlug:newsRecord.publishedSlug,tags:["events","correction"],seoTitle:correctedTitle+" | LUCIA",seoDescription:"The corrected event details and verified update.",featuredMediaRef:null,scheduledAt:null};
    const correctedSave=await patchArticle(correctedNewsId,correctedDraft,null,"save");assert.equal(correctedSave.status,200,(await correctedSave.clone().json()).error);
    const correctedPublish=await patchArticle(correctedNewsId,(await correctedSave.json()).article,null,"publish");assert.equal(correctedPublish.status,200,(await correctedPublish.clone().json()).error);
    const correctedRecord=(await (await api("a",articleRoute)).json()).articles.find(entry=>entry.id===correctedNewsId);
    const correctedPage=await publicSite("/news/"+correctedRecord.publishedSlug,host);assert.equal(correctedPage.status,200);
    const correctedHtml=await correctedPage.text();assert(correctedHtml.includes(correctedDraft.correctionNote));assert(correctedHtml.includes(newsRecord.publishedSlug));assert(correctedHtml.includes("Events"));
    const publicContract=JSON.parse(await (await publicSite("/api/public/v1/content",host)).text());
    assert.equal(publicContract.contract,"lucia.published-content.v1");assert(publicContract.content.news.some(item=>item.slug===correctedRecord.publishedSlug&&item.isFeatured&&item.correctsSlug===newsRecord.publishedSlug));
    assert(!publicContract.content.blog.some(item=>item.slug===article.slug),"Unpublished Blog content must disappear from the public contract");
    const home=await publicSite("/",host);const homeHtml=await home.text();assert(homeHtml.includes(correctedTitle));assert(homeHtml.includes('href="/blog"'));assert(homeHtml.includes('href="/news"'));
    const newsUnpublish = await patchArticle(newsId, newsRecord, null, "unpublish");
    assert.equal(newsUnpublish.status, 200, (await newsUnpublish.clone().json()).error);
    const correctedUnpublish=await patchArticle(correctedNewsId,correctedRecord,null,"unpublish");assert.equal(correctedUnpublish.status,200,(await correctedUnpublish.clone().json()).error);
    assert.equal((await publicSite("/news/" + newsRecord.publishedSlug, host)).status, 404);
    assert.equal((await publicSite("/news/" + correctedRecord.publishedSlug, host)).status, 404);

    const scheduledTitle="Phase 15 scheduled "+randomBytes(5).toString("hex");
    const scheduledCreated=await api("a",articleRoute,"POST",{kind:"news",title:scheduledTitle});
    const scheduledBody=await scheduledCreated.json();assert.equal(scheduledCreated.status,201,scheduledBody.error);scheduledNewsId=scheduledBody.article.id;
    const scheduledDraft={...scheduledBody.article,excerpt:"A verified story scheduled for release.",body:"This scheduled article remains private until the database-backed publication worker claims it.",category:"Updates",eventAt:null,isFeatured:false,correctionNote:null,correctsSlug:null,tags:["scheduled"],seoTitle:scheduledTitle+" | LUCIA",seoDescription:"A verified story scheduled for release.",featuredMediaRef:null,scheduledAt:new Date(Date.now()+10*60*1000).toISOString()};
    const scheduledResponse=await patchArticle(scheduledNewsId,scheduledDraft,null,"schedule");assert.equal(scheduledResponse.status,200,(await scheduledResponse.clone().json()).error);
    const scheduledRecord=(await scheduledResponse.json()).article;assert.equal(scheduledRecord.status,"scheduled");
    assert.equal((await publicSite("/news/"+scheduledRecord.slug,host)).status,404);
    await admin`UPDATE website_posts SET scheduled_at=now()-interval '1 minute' WHERE id=${scheduledNewsId} AND website_id=${siteId} AND status='scheduled'`;
    assert.equal((await api(null,"/api/cron/publish-articles")).status,401,"Scheduled publishing must reject requests without a cron secret");
    assert.equal((await api(null,"/api/cron/publish-articles","GET",undefined,{authorization:"Bearer invalid-secret"})).status,401,"Scheduled publishing must reject an invalid cron secret");
    await admin.unsafe("UPDATE website_posts SET scheduled_at=now()-interval '1 minute' WHERE id=$1 AND website_id=$2 AND status='scheduled'",[scheduledNewsId,siteId]);
    await admin.unsafe("ALTER TABLE website_posts ADD CONSTRAINT phase15_test_fail_schedule CHECK(status <> 'published') NOT VALID");
    const failedCron=await api(null,"/api/cron/publish-articles","GET",undefined,{authorization:"Bearer "+process.env.CRON_SECRET});
    assert.equal(failedCron.status,503,"A worker database failure must be surfaced for retry");
    const queuedAfterFailure=await admin.unsafe("SELECT status,revision,scheduled_at FROM website_posts WHERE id=$1",[scheduledNewsId]);
    assert.equal(queuedAfterFailure[0].status,"scheduled","A failed worker transaction must leave the due article queued");
    assert(queuedAfterFailure[0].scheduled_at,"A failed worker transaction must preserve its due timestamp");
    await admin.unsafe("ALTER TABLE website_posts DROP CONSTRAINT phase15_test_fail_schedule");
    const cron=await api(null,"/api/cron/publish-articles","GET",undefined,{authorization:"Bearer "+process.env.CRON_SECRET});
    assert.equal(cron.status,200,"The scheduled publisher must accept the isolated cron secret");
    const cronResult=await cron.json();assert.equal(cronResult.published,1,"The retry must publish exactly one due News article");
    const afterFirstPublish=await admin.unsafe("SELECT status,revision,scheduled_at FROM website_posts WHERE id=$1",[scheduledNewsId]);
    assert.equal(afterFirstPublish[0].status,"published");
    assert.equal(afterFirstPublish[0].scheduled_at,null);
    const repeatedCron=await api(null,"/api/cron/publish-articles","GET",undefined,{authorization:"Bearer "+process.env.CRON_SECRET});
    assert.equal(repeatedCron.status,200);
    assert.equal((await repeatedCron.json()).published,0,"A committed scheduled article must never publish twice");
    const afterRepeat=await admin.unsafe("SELECT revision FROM website_posts WHERE id=$1",[scheduledNewsId]);
    assert.equal(afterRepeat[0].revision,afterFirstPublish[0].revision,"A repeated worker run must not create another publication revision");
    const publishedScheduled=await publicSite("/news/"+scheduledRecord.slug,host);assert.equal(publishedScheduled.status,200);assert((await publishedScheduled.text()).includes(scheduledTitle));
    bpass("News customer journey: author/SEO/tags, event metadata, featured correction notices, public content contract and scheduled worker; Blog media references and revision restore are tenant-isolated");
  } finally {
    if (articleId) await admin`DELETE FROM website_posts WHERE id=${articleId} AND website_id=${siteId}`;
    if (newsId) await admin`DELETE FROM website_posts WHERE id=${newsId} AND website_id=${siteId}`;
    if (correctedNewsId) await admin`DELETE FROM website_posts WHERE id=${correctedNewsId} AND website_id=${siteId}`;
    if (scheduledNewsId) await admin`DELETE FROM website_posts WHERE id=${scheduledNewsId} AND website_id=${siteId}`;
    await admin`DELETE FROM website_media WHERE id = ANY(${mediaIds}::uuid[])`;
    if (reservedBytes) await admin`UPDATE media_storage_budget SET reserved_bytes=GREATEST(0,reserved_bytes-${reservedBytes}) WHERE product='lucia-os'`;
  }
}
