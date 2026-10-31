/** Isolated compiled-app acceptance for all eight existing Phase 14 flagships.
 * Reuses the Phase 9 acceptance database, real app sessions, browser proxy and
 * NOBYPASSRLS runtime role. Synthetic sessions do not verify live Core OAuth.
 */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const flagships = ["meridian", "canvas", "haven", "academia",
  "maison", "nexus", "impact", "estate"];
const draftRoute = (id) => "/api/websites/" + id + "/draft";
const publishRoute = "/api/publishing/publish";

export async function checkPhase14FlagshipPublishing({
  api, admin, f, base, browserContext, created, bpass, publicSite,
}) {
  const inventory = JSON.parse(await readFile("docs/phase-14-layout-inventory.json", "utf8"));
  const canonical = inventory.layouts.map((entry) => entry.id.replace("lucia.layout.", ""));
  assert.equal(new Set(canonical).size, 48, "Catalogue must retain 48 canonical identities");
  const selection = process.env.WEBSITE_TEST_PHASE14_LAYOUTS || process.env.WEBSITE_TEST_PHASE14_LAYOUT;
  const selected = selection === "flagships" ? flagships : selection === "all" ? canonical : selection ? selection.split(",") : canonical;
  assert(selected.length && selected.every((name) => canonical.includes(name)), "Unregistered Phase 14 candidate requested");
  assert.equal(new Set(selected).size, selected.length, "Duplicate acceptance targets");
  const evidence = [];
  // 'all' exercises the real assignment API; unavailable candidates fail closed.
  // This must never enable unfinished Layouts or bypass the server allow-list.
  const view = await browserContext.newPage();
  view.setDefaultTimeout(45000);
  const errors = [];
  view.on("pageerror", (error) => errors.push(error.message));
  try {
    for (const name of selected) {
      const siteSlug = "p14-" + name + "-" + randomBytes(5).toString("hex");
      const originalName = name + " initial website";
      const creation = await api("a", "/api/onboarding/website", "POST", {
        organisationName: "Continuity organization A",
        websiteName: originalName,
        organisationType: "Business or service",
        goal: "Introduce my organisation",
        templateId: "northstar-consulting",
        country: "Nigeria",
        siteSlug,
      });
      const createdBody = await creation.json();
      assert.equal(creation.status, 201, name + " create: " + createdBody.error);
      const id = createdBody.website.id;
      created.push(id);
      assert.equal(createdBody.organization.id, f.orgA);
      let saved = await (await api("a", draftRoute(id))).json();
      const initialRevision = saved.revision;
      const assigned = await api("a", draftRoute(id), "PATCH", {
        kind: "assign-layout", layoutId: "lucia.layout." + name,
      }, { "if-match": saved.revision });
      assert.equal(assigned.status, 200, name + " assignment denied");
      saved = await (await api("a", draftRoute(id))).json();
      assert.equal(saved.draft.layoutId, "lucia.layout." + name);
      assert(saved.draft.pages.length >= 6);
      assert.equal((await api(null, draftRoute(id))).status, 401);
      assert.equal((await api("b", draftRoute(id))).status, 404);
      const publishing = (snapshot) => ({
        action: "publish", websiteId: id, siteSlug,
        siteName: snapshot.draft.identity.name,
        headline: snapshot.draft.pages[0].title,
        description: snapshot.draft.pages[0].description,
        customDomain: "",
      });
      const blocked = await api("a", publishRoute, "POST", publishing(saved),
        { "if-match": saved.revision });
      assert.equal(blocked.status, 422, name + " published a demo address");
      assert.equal((await publicSite("/", siteSlug + ".lucia.name.ng")).status, 404);
      const contactPage = saved.draft.pages.find((p) => p.path === "/contact");
      const contact = contactPage?.sections.find((s) => s.type === "contact-panel" && s.email);
      assert(contact && contactPage, name + " needs editable contact");
      const email = "p14-" + name + "@testing.example.ng";
      const contactUpdated = await api("a", draftRoute(id), "PATCH", {
        kind: "composition-edit", mode: "guided",
        edits: [{ kind: "replace-section", pageId: contactPage.id,
          section: { ...contact, email } }],
      }, { "if-match": saved.revision });
      assert.equal(contactUpdated.status, 200, name + " contact save");
      saved = await (await api("a", draftRoute(id))).json();
      const allContacts = saved.draft.pages.flatMap((p) =>
        p.sections.filter((s) => s.type === "contact-panel"));
      assert(allContacts.length > 1 && allContacts.every((s) => s.email === email),
        name + " contacts did not propagate");
      const portfolioPage = saved.draft.pages.find((p) =>
        p.path !== "/" && p.sections.some((s) => s.type === "project-gallery"));
      const gallery = portfolioPage?.sections.find((s) => s.type === "project-gallery");
      assert(gallery && portfolioPage, name + " missing portfolio page");
      const alt = name + " unique editable visual";
      const replacementImage = gallery.projects[0].image.src === "builtin:portfolio/work-1" ? "builtin:premium/creative" : "builtin:portfolio/work-1";
      const projects = gallery.projects.map((project, i) => i === 0
        ? { ...project, image: {
          src: replacementImage, alt,
        }} : project);
      const artUpdated = await api("a", draftRoute(id), "PATCH", {
        kind: "composition-edit", mode: "guided",
        edits: [{ kind: "replace-section", pageId: portfolioPage.id,
          section: { ...gallery, projects } }],
      }, { "if-match": saved.revision });
      assert.equal(artUpdated.status, 200, name + " artwork save");
      saved = await (await api("a", draftRoute(id))).json();
      assert(saved.draft.pages.find((p) => p.id === portfolioPage.id)
        .sections.find((s) => s.id === gallery.id).projects[0].image.alt === alt);
      assert.equal(saved.draft.pages.find((p) => p.id === portfolioPage.id).sections.find((s) => s.id === gallery.id).projects[0].image.src, replacementImage);
      const renamed = name + " acceptance website";
      const brandUpdated = await api("a", draftRoute(id), "PATCH", {
        kind: "composition-edit", mode: "guided",
        edits: [{ kind: "brand", name: renamed }],
      }, { "if-match": saved.revision });
      assert.equal(brandUpdated.status, 200, name + " brand save");
      saved = await (await api("a", draftRoute(id))).json();
      assert.equal(saved.draft.identity.name, renamed);
      assert.equal(saved.draft.layoutId, "lucia.layout." + name);
      assert.equal((await api("b", draftRoute(id), "PATCH", {
        kind: "composition-edit", mode: "guided",
        edits: [{ kind: "brand", name: "Tenant B takeover" }],
      }, { "if-match": saved.revision })).status, 404);
      assert.equal((await api("b", publishRoute, "POST", publishing(saved),
        { "if-match": saved.revision })).status, 404);
      assert.equal((await api("a", draftRoute(id), "PATCH", {
        kind: "composition-edit", mode: "guided",
        edits: [{ kind: "brand", name: "Stale request" }],
      }, { "if-match": "W/\"invalid\"" })).status, 428);
      assert.equal((await api("a", draftRoute(id), "PATCH", {
        kind: "composition-edit", mode: "guided",
        edits: [{ kind: "brand", name: "Valid but stale revision" }],
      }, { "if-match": initialRevision })).status, 409);
      const editorResponse = await view.goto(base + "/editor?websiteId=" + id,
        { waitUntil: "networkidle" });
      assert.equal(editorResponse?.status(), 200, name + " editor HTTP");
      const controls = view.getByLabel("Composition controls");
      try {
        await controls.waitFor({ timeout: 12000 });
      } catch {
        const body = (await view.locator("body").innerText().catch(() => "")).slice(0, 1300);
        const browserDraft = await view.request.get(base + "/api/websites/" + id + "/draft");
        throw Error(name + " saved-editor hydration failure: " +
          JSON.stringify({ url: view.url(), body, apiStatus: browserDraft.status() }));
      }
      assert(await view.locator('[data-layout-id="lucia.layout.' + name + '"]').count(),
        name + " editor does not show persisted Layout");
      await view.reload({ waitUntil: "networkidle" });
      await controls.waitFor({ timeout: 12000 });
      const current = await (await api("a", draftRoute(id))).json();
      assert.equal(current.draft.identity.name, renamed);
      await view.goto(base + "/publish?websiteId=" + id, { waitUntil: "networkidle" });
      await view.getByRole("button", { name: "Preview website", exact: true }).click();
      const preview = view.getByRole("dialog");
      await preview.locator('[data-layout-id="lucia.layout.' + name + '"]').waitFor();
      assert.equal(await preview.locator('[data-page-path="/"]').count(), 1);
      await preview.getByRole("navigation", { name: "Main navigation", exact: true })
        .getByRole("link", { name: "Contact", exact: true }).click();
      await preview.locator('[data-page-path="/contact"]').waitFor();
      assert((await preview.innerText()).includes(email), name + " preview lost saved contact");
      assert.equal(new URL(view.url()).pathname, "/publish", name + " private preview escaped into public routing");
      const published = await api("a", publishRoute, "POST", publishing(current),
        { "if-match": current.revision });
      const response = await published.json();
      assert.equal(published.status, 200, name + " publish: " + response.error);
      assert.equal(response.published, true);
      assert.equal(response.customDomain.status, "not_requested");
      const host = siteSlug + ".lucia.name.ng";
      for (const route of current.draft.pages.map((page) => page.path)) {
        const document = await publicSite(route, host);
        assert.equal(document.status, 200, name + " public route " + route);
        const html = await document.text();
        assert(html.includes(renamed) && html.includes("lucia.layout." + name));
        assert(!html.includes("hello@example.com"), name + " unedited demo contact");
        if (route === portfolioPage.path) assert(html.includes(alt));
      }
      const liveBrowser = await browserContext.newPage();
      const responsive = [];
      const cdp = await browserContext.newCDPSession(liveBrowser);
      await liveBrowser.addInitScript(() => {
        window.__phase14Performance = { lcp: null, cls: 0 };
        new PerformanceObserver((list) => { for (const entry of list.getEntries()) window.__phase14Performance.lcp = entry.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
        new PerformanceObserver((list) => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__phase14Performance.cls += entry.value; }).observe({ type: "layout-shift", buffered: true });
      });
      try {
        for (const viewport of [{ width: 320, height: 844 }, { width: 390, height: 844 },
          { width: 768, height: 1024 }, { width: 1180, height: 820 }, { width: 1440, height: 900 }]) {
          await liveBrowser.setViewportSize(viewport);
          const throttled = viewport.width === 390;
          await cdp.send("Network.enable");
          if (throttled) await cdp.send("Network.clearBrowserCache");
          await cdp.send("Network.setCacheDisabled", { cacheDisabled: throttled });
          await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: throttled ? 150 : 0, downloadThroughput: throttled ? 200000 : -1, uploadThroughput: throttled ? 93750 : -1 });
          await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttled ? 4 : 1 });
          const response = await liveBrowser.goto(
            "http://" + host + ":" + new URL(base).port + "/", { waitUntil: "networkidle" });
          assert.equal(response.status(), 200);
          assert.equal(await liveBrowser.locator('[data-layout-version="2"]').count(), 1);
          for (const expectedPath of ["/", "/contact"]) {
            if (expectedPath === "/contact") {
              const mobile = liveBrowser.locator('.premium-mobile-menu summary');
              if (await mobile.isVisible()) {
                await mobile.click();
                await liveBrowser.getByRole("navigation", { name: "Mobile navigation", exact: true })
                  .getByRole("link", { name: "Contact", exact: true }).click();
              } else {
                await liveBrowser.getByRole("navigation", { name: "Main navigation", exact: true })
                  .getByRole("link", { name: "Contact", exact: true }).click();
              }
            }
            await liveBrowser.locator('[data-page-path="' + expectedPath + '"]').waitFor();
            const metrics = await liveBrowser.evaluate(() => ({
              viewport: innerWidth, width: document.documentElement.scrollWidth,
              performance: window.__phase14Performance,
              overflowing: [...document.querySelectorAll("body *")].filter((node) => node.getBoundingClientRect().right > innerWidth + 1).slice(0, 20).map((node) => ({ tag: node.tagName, id: node.id, className: node.className, right: node.getBoundingClientRect().right, width: node.getBoundingClientRect().width, overflowX: getComputedStyle(node).overflowX, display: getComputedStyle(node).display, position: getComputedStyle(node).position })),
              stylesheets: [...document.styleSheets].map((sheet) => sheet.href),
              resourceTransferBytes: performance.getEntriesByType("resource").reduce((total, entry) => total + entry.transferSize, 0),
              images: [...document.querySelectorAll('.premium-layout img')].map((node) => ({ complete: node.complete, width: node.naturalWidth })),
              navigation: performance.getEntriesByType('navigation').map((entry) => ({ domContentLoadedMs: entry.domContentLoadedEventEnd, transferBytes: entry.transferSize })),
            }));
            if (metrics.width > metrics.viewport + 1) {
              const directory = path.dirname(process.env.WEBSITE_TEST_EVIDENCE_FILE || "artifacts/phase14-auth-publish/results.json");
              await mkdir(directory, { recursive: true });
              await writeFile(path.join(directory, name + "-overflow.json"), JSON.stringify({ expectedPath, viewport, metrics }, null, 2));
              await liveBrowser.screenshot({ path: path.join(directory, name + "-overflow.png"), fullPage: true });
            }
            assert(metrics.width <= metrics.viewport + 1, name + " public overflow at " + viewport.width + " " + expectedPath + ": " + JSON.stringify(metrics));
            responsive.push({ viewport, path: expectedPath, throttling: throttled ? "1.6Mbps down / 750Kbps up / 150ms latency / CPU4x / cold cache" : "unthrottled", metrics });
          }
        }
      } finally {
        await liveBrowser.close();
      }
      const lastGood = await (await publicSite("/", host)).text();
      assert.equal((await api("a", publishRoute, "POST", publishing(current),
        { "if-match": initialRevision })).status, 409, name + " stale publication accepted");
      assert.equal(await (await publicSite("/", host)).text(), lastGood);
      // Intentionally corrupt only this generated, isolated test draft.
      await admin.unsafe("UPDATE website_pages SET content=$1 WHERE website_id=$2 AND path='/'",
        ['{"schema":"lucia.layout-composition","version":2}', id]);
      const brokenDraft = await (await api("a", draftRoute(id))).json();
      const rejected = await api("a", publishRoute, "POST", publishing(current),
        { "if-match": brokenDraft.revision });
      assert.equal(rejected.status, 422, name + " corrupt draft must roll back");
      assert.equal(await (await publicSite("/", host)).text(), lastGood);
      await admin.unsafe("UPDATE website_pages SET content=$1 WHERE website_id=$2 AND path='/'",
        [JSON.stringify(current.draft), id]);
      await admin.unsafe("UPDATE organization_memberships SET status='revoked' WHERE user_id=$1 AND organization_id=$2",
        [f.a, f.orgA]);
      try {
        assert.equal((await api("a", draftRoute(id))).status, 404);
        assert.equal((await api("a", publishRoute, "POST", publishing(current),
          { "if-match": current.revision })).status, 403);
      } finally {
        await admin.unsafe("UPDATE organization_memberships SET status='active' WHERE user_id=$1 AND organization_id=$2",
          [f.a, f.orgA]);
      }
      bpass(name + ": real synthetic-session create/assign/edit/reload/publish/public routes, tenant denial and rollback");
      evidence.push({ layoutId: current.draft.layoutId, pages: current.draft.pages.map((page) => page.path),
        previewPaths: ["/", "/contact"], publicResponsive: responsive,
        tenantDenial: "PASS", staleSave: "PASS", stalePublish: "PASS", corruptPublicationPreservesLive: "PASS", revokedMembership: "PASS",
        authentication: "Synthetic session; not live Core OAuth", result: "PASS" });
    }
    assert.equal(errors.length, 0, errors.join("; "));
  } finally {
    await view.close();
  }
  return evidence;
}
