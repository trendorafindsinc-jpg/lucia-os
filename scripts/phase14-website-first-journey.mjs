/** Actual compiled-app customer journey for the new website-first editor.
 * Runs ONLY under check-website-foundation-http.mjs's disposable acceptance DB,
 * browser proxy, synthetic hashed sessions, isolated NOBYPASSRLS role.
 * These are app-process tests, not evidence of external LUCIA Core OAuth.
 */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

export async function checkWebsiteFirstJourney({
  api, f, base, browserContext, created, bpass, publicSite,
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
      assert.equal(response.status(), 201, await response.text());
      const payload = await response.json();
      siteId = payload.website.id;
      assert.equal(payload.organization.id, f.orgA, "Reuse the disposable authorized organization");
      created.push(siteId);
      await page.waitForURL(/\/editor\?websiteId=/);
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
    assert.equal(issues.length, 0, issues.join("; "));
    bpass("Website-first: no unhandled Chromium page exceptions");
    return evidence;
  } finally {
    await page.close();
  }
}
