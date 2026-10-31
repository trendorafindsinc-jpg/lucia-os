/** Extends the existing isolated compiled-app/browser acceptance runner. */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
export async function checkPremiumComposition({
  api,
  admin,
  f,
  base,
  browserContext,
  created,
  bpass,
  publicSite,
}) {
  await browserContext.addCookies([
    { name: "lucia_os_session", value: f.tokens.a, url: base },
  ]);
  const errors = [];
  const page = await browserContext.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.setDefaultTimeout(60000);
  page.on("dialog", (d) => d.accept());
  const ctx = (id) => `/api/websites/${id}/draft`;
  const sequences = [];
  const all = ["meridian", "canvas", "haven"];
  const selected = process.env.WEBSITE_TEST_PREMIUM_LAYOUT
    ? all.filter((name) => name === process.env.WEBSITE_TEST_PREMIUM_LAYOUT)
    : all;
  assert(selected.length > 0, "Choose a registered acceptance Layout");
  for (const name of selected) {
    const slug = "composition-" + randomBytes(6).toString("hex");
    const creation = await api("a", "/api/onboarding/website", "POST", {
      organisationName: "Continuity organization A",
      websiteName: `${name} acceptance`,
      organisationType: "Business or service",
      goal: "Introduce my organisation",
      templateId: "northstar-consulting",
      country: "Nigeria",
      siteSlug: slug,
    });
    const result = await creation.json();
    assert.equal(creation.status, 201, result.error);
    const id = result.website.id;
    created.push(id);
    await page.goto(`${base}/editor?websiteId=${id}`, {
      waitUntil: "networkidle",
    });
    await page
      .getByRole("combobox", { name: "Starting composition", exact: true })
      .selectOption(name);
    await page
      .getByRole("button", { name: "Use this composition", exact: true })
      .click();
    await page.getByLabel("Composition controls").waitFor();
    const saved = await (await api("a", ctx(id))).json();
    assert.equal(saved.draft.version, 2);
    assert.equal(saved.draft.layoutId, `lucia.layout.${name}`);
    assert.equal((await api("b", ctx(id))).status, 404);
    const badEdit = {
      kind: "composition-edit",
      mode: "advanced",
      edits: [{ kind: "token", key: "font", value: "system-sans" }],
    };
    assert.equal(
      (
        await api("a", ctx(id), "PATCH", badEdit, {
          "if-match": saved.revision,
        })
      ).status,
      422,
    );
    assert.equal(
      (
        await api(
          "b",
          ctx(id),
          "PATCH",
          {
            kind: "composition-edit",
            mode: "advanced",
            edits: [{ kind: "token", key: "accent", value: "#334455" }],
          },
          { "if-match": saved.revision },
        )
      ).status,
      404,
    );
    if (name === "canvas")
      await page
        .getByRole("combobox", { name: "Section", exact: true })
        .selectOption("story");
    await page
      .getByLabel("Heading", { exact: true })
      .fill(`${name} first saved heading`);
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await page
      .getByText("Draft saved to your website", { exact: true })
      .waitFor();
    await page.reload({ waitUntil: "networkidle" });
    if (name === "canvas")
      await page
        .getByRole("combobox", { name: "Section", exact: true })
        .selectOption("story");
    assert.equal(
      await page.getByLabel("Heading", { exact: true }).inputValue(),
      `${name} first saved heading`,
    );
    // Native refresh exercises the registered Phase 9 composition snapshot adapter.
    await page
      .getByLabel("Heading", { exact: true })
      .fill(`${name} recovered unsaved heading`);
    await page.reload({ waitUntil: "networkidle" });
    await page
      .getByText("Recovered unsaved changes. Save draft to commit them.", {
        exact: true,
      })
      .waitFor();
    if (name === "canvas")
      await page
        .getByRole("combobox", { name: "Section", exact: true })
        .selectOption("story");
    assert.equal(
      await page.getByLabel("Heading", { exact: true }).inputValue(),
      `${name} recovered unsaved heading`,
    );
    await page
      .getByLabel("Heading", { exact: true })
      .fill(`${name} persisted browser heading`);
    if (name === "meridian") {
      await page.route("**/api/websites/*/draft", (route) =>
        route.request().method() === "PATCH"
          ? route.abort("failed")
          : route.continue(),
      );
      await page
        .getByRole("button", { name: "Save draft", exact: true })
        .click();
      await page
        .getByRole("status")
        .filter({ hasText: /Failed to fetch|fetch|Save failed/i })
        .waitFor();
      assert.equal(
        await page.getByLabel("Heading", { exact: true }).inputValue(),
        `${name} persisted browser heading`,
      );
      await page.unroute("**/api/websites/*/draft");
    }
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await page
      .getByText("Draft saved to your website", { exact: true })
      .waitFor();
    bpass(
      `${name}: authenticated creation, assignment, editing, real save/reload and unsaved refresh recovery`,
    );
    if (name === "meridian")
      bpass(
        "Failed network save retains unsaved content and real retry commits it",
      );
    const latest = await (await api("a", ctx(id))).json();
    assert.equal(
      (
        await api(
          "a",
          ctx(id),
          "PATCH",
          {
            kind: "composition-edit",
            mode: "advanced",
            edits: [{ kind: "token", key: "accent", value: "#334455" }],
          },
          { "if-match": saved.revision },
        )
      ).status,
      409,
    );
    await page
      .getByRole("link", { name: "Preview and publish saved draft" })
      .click();
    await page
      .getByRole("button", { name: "Preview website", exact: true })
      .click();
    const dialog = page.getByRole("dialog", { name: "Saved website preview" });
    await dialog.waitFor();
    await dialog
      .getByRole("combobox", { name: "Preview page", exact: true })
      .selectOption("/about");
    assert.equal(await dialog.locator('[data-page-path="/about"]').count(), 1);
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "Publish website", exact: true })
      .click();
    await page
      .getByRole("link", { name: "Open live website", exact: false })
      .waitFor();
    // Published slugs remain globally unique; a separate published tenant cannot leak through hostname delivery.
    if (name === "meridian") {
      await assert.rejects(
        admin`UPDATE websites SET slug=${slug},status='published' WHERE id=${f.foreign}`,
        (error) => error.code === "23505",
      );
      await admin`UPDATE websites SET status='published' WHERE id=${f.foreign}`;
      await admin`UPDATE website_pages SET status='published',published_content=${JSON.stringify({ templateId: "northstar-consulting", siteName: "Foreign public website", headline: "Foreign content must stay on its own host", description: "A separate tenant's published website.", buttonLabel: "Contact us", palette: "original", visibleSections: ["Hero", "Contact"] })} WHERE website_id=${f.foreign} AND path='/'`;
    }
    const currentPublic = await publicSite("/", slug + ".lucia.name.ng");
    assert.equal(currentPublic.status, 200);
    const before = await currentPublic.text();
    assert(!before.includes("Foreign content must stay on its own host"));
    assert(before.includes(`${name} persisted browser heading`));
    const publicPage = await browserContext.newPage();
    publicPage.on("pageerror", (e) => errors.push(e.message));
    for (const [width, height] of [
      [320, 844],
      [390, 844],
      [768, 1024],
      [1180, 820],
      [1440, 900],
    ]) {
      await publicPage.setViewportSize({ width, height });
      const response = await publicPage.goto(
        `http://${slug}.lucia.name.ng:${new URL(base).port}/`,
        { waitUntil: "networkidle" },
      );
      assert.equal(response.status(), 200);
      assert.equal(await publicPage.title(), latest.draft.pages[0].title);
      assert.equal(await publicPage.locator("head title").count(), 1);
      assert.equal(
        await publicPage
          .locator('meta[name="description"]')
          .getAttribute("content"),
        latest.draft.pages[0].description,
      );
      assert.equal(
        await publicPage.locator('[data-layout-version="2"]').count(),
        1,
      );
      const action = publicPage.locator(".layout-primary-action");
      if (await action.count()) {
        const colors = await action
          .first()
          .evaluate((el) => ({
            fg: getComputedStyle(el).color,
            bg: getComputedStyle(el).backgroundColor,
          }));
        const luminance = (color) =>
          color
            .match(/[\d.]+/g)
            .slice(0, 3)
            .map(Number)
            .map((v) => v / 255)
            .map((v) =>
              v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
            )
            .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
        const values = [luminance(colors.fg), luminance(colors.bg)].sort(
          (a, b) => b - a,
        );
        assert(
          (values[0] + 0.05) / (values[1] + 0.05) >= 4.5,
          `${name} action text contrast must meet 4.5:1`,
        );
      }
      const geometry = await publicPage.evaluate(() => ({
        viewport: innerWidth,
        document: document.documentElement.scrollWidth,
        broken: [...document.images].filter(
          (i) => !i.complete || !i.naturalWidth,
        ).length,
      }));
      assert(
        geometry.document <= geometry.viewport,
        `${name} overflow at ${width}: ${geometry.document}`,
      );
      assert.equal(geometry.broken, 0);
      assert.equal(
        await publicPage.locator(".workspace-tabbar,.assistive-orb").count(),
        0,
      );
      if (width === 390) {
        fs.mkdirSync("docs/acceptance/phase-13", { recursive: true });
        await publicPage.screenshot({
          path: `docs/acceptance/phase-13/${name}-390.png`,
          fullPage: true,
        });
      }
      await publicPage
        .getByRole("navigation", { name: "Main navigation" })
        .getByRole("link")
        .nth(1)
        .click();
      await publicPage.locator('[data-page-path="/about"]').waitFor();
      await publicPage.reload({ waitUntil: "networkidle" });
      assert.equal(
        await publicPage.title(),
        latest.draft.pages.find((p) => p.path === "/about").title,
      );
      assert.equal(
        await publicPage.locator('[data-page-path="/about"]').count(),
        1,
      );
      await publicPage.keyboard.press("Tab");
      assert(
        await publicPage.evaluate(
          () =>
            parseFloat(getComputedStyle(document.activeElement).outlineWidth) >
            0,
        ),
      );
      assert(
        await publicPage.evaluate(
          () => matchMedia("(prefers-reduced-motion: reduce)").matches,
        ),
      );
      assert(
        await publicPage.evaluate(
          () => document.activeElement?.tagName === "A",
        ),
      );
      bpass(
        `${name}: public home/interior, refresh, assets, keyboard and width ${width}×${height} (emulated)`,
      );
    }
    await publicPage.goto(
      `http://${slug}.lucia.name.ng:${new URL(base).port}/`,
    );
    sequences.push(
      await publicPage
        .locator("[data-section-type]")
        .evaluateAll((nodes) =>
          nodes.map((n) => n.dataset.sectionType).join(","),
        ),
    );
    assert.equal(
      (await publicSite("/workspace", slug + ".lucia.name.ng")).status,
      404,
    );
    assert.equal(
      (await publicSite("/not-registered", slug + ".lucia.name.ng")).status,
      404,
    );
    const settings = {
      action: "publish",
      websiteId: id,
      siteSlug: slug,
      siteName: latest.draft.identity.name,
      headline: latest.draft.pages[0].title,
      description: latest.draft.pages[0].description,
      customDomain: "",
    };
    assert.equal(
      (
        await api("a", "/api/publishing/publish", "POST", settings, {
          "if-match": saved.revision,
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await api("b", "/api/publishing/publish", "POST", settings, {
          "if-match": latest.revision,
        })
      ).status,
      404,
    );
    await admin`UPDATE website_pages SET content='{"schema":"lucia.layout-composition","version":2}' WHERE website_id=${id} AND path='/'`;
    const corrupt = await (await api("a", ctx(id))).json();
    assert.equal(
      (
        await api("a", "/api/publishing/publish", "POST", settings, {
          "if-match": corrupt.revision,
        })
      ).status,
      422,
    );
    const preserved = await publicSite("/", slug + ".lucia.name.ng");
    assert.equal(preserved.status, 200);
    assert(
      (await preserved.text()).includes(`${name} persisted browser heading`),
    );
    await admin`UPDATE website_pages SET content=${JSON.stringify(latest.draft)} WHERE website_id=${id} AND path='/'`;
    await admin`UPDATE organization_memberships SET status='revoked' WHERE user_id=${f.a} AND organization_id=${f.orgA}`;
    assert.equal((await api("a", ctx(id))).status, 404);
    assert.equal(
      (
        await api("a", "/api/publishing/publish", "POST", settings, {
          "if-match": latest.revision,
        })
      ).status,
      403,
    );
    await admin`UPDATE organization_memberships SET status='active' WHERE user_id=${f.a} AND organization_id=${f.orgA}`;
    if (name === "meridian")
      await admin`UPDATE websites SET slug=${"phase9-" + f.foreign},status='draft' WHERE id=${f.foreign}`;
    await publicPage.close();
    bpass(
      `${name}: real create→assign→edit→save→reload→preview→publish; tenant/Lock/revision/corrupt/revocation protection`,
    );
  }
  assert.equal(errors.length, 0, errors.join("\n"));
  assert.equal(new Set(sequences).size, selected.length);
  await page.close();
  bpass(
    selected.length === 3
      ? "Three published DOM section sequences are structurally distinct"
      : `${selected[0]} targeted contrast and public-page regression complete`,
  );
}
