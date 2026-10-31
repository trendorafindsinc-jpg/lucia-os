/** Isolated compiled-app acceptance for all eight existing Phase 14 flagships.
 * Reuses the Phase 9 acceptance database, real app sessions, browser proxy and
 * NOBYPASSRLS runtime role. Synthetic sessions do not verify live Core OAuth.
 */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

const flagships = ["meridian", "canvas", "haven", "academia",
  "maison", "nexus", "impact", "estate"];
const draftRoute = (id) => "/api/websites/" + id + "/draft";
const publishRoute = "/api/publishing/publish";

export async function checkPhase14FlagshipPublishing({
  api, admin, f, base, browserContext, created, bpass, publicSite,
}) {
  const selected = process.env.WEBSITE_TEST_PHASE14_LAYOUT
    ? flagships.filter((name) => name === process.env.WEBSITE_TEST_PHASE14_LAYOUT)
    : flagships;
  assert(selected.length, "Unregistered Phase 14 candidate requested");
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
      const projects = gallery.projects.map((project, i) => i === 0
        ? { ...project, image: {
          src: "builtin:premium/project-" + name, alt,
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
      const published = await api("a", publishRoute, "POST", publishing(current),
        { "if-match": current.revision });
      const response = await published.json();
      assert.equal(published.status, 200, name + " publish: " + response.error);
      assert.equal(response.published, true);
      assert.equal(response.customDomain.status, "not_requested");
      const host = siteSlug + ".lucia.name.ng";
      for (const route of ["/", "/contact", portfolioPage.path]) {
        const document = await publicSite(route, host);
        assert.equal(document.status, 200, name + " public route " + route);
        const html = await document.text();
        assert(html.includes(renamed) && html.includes("lucia.layout." + name));
        assert(!html.includes("hello@example.com"), name + " unedited demo contact");
        if (route === portfolioPage.path) assert(html.includes(alt));
      }
      const liveBrowser = await browserContext.newPage();
      try {
        const response = await liveBrowser.goto(
          "http://" + host + ":" + new URL(base).port + "/",
          { waitUntil: "networkidle" },
        );
        assert.equal(response.status(), 200);
        assert.equal(await liveBrowser.locator('[data-layout-version="2"]').count(), 1);
        await liveBrowser.getByRole("navigation", { name: "Main navigation" })
          .getByRole("link", { name: "Contact" }).click();
        await liveBrowser.locator('[data-page-path="/contact"]').waitFor();
      } finally {
        await liveBrowser.close();
      }
      const lastGood = await (await publicSite("/", host)).text();
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
    }
    assert.equal(errors.length, 0, errors.join("; "));
  } finally {
    await view.close();
  }
}
