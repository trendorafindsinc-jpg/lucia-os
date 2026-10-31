/** Real compiled-app acceptance. Setup is restricted to an explicit isolated *_acceptance DB. */
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { randomBytes, createHash } from "node:crypto";
import net from "node:net";
import http from "node:http";
import fs from "node:fs";
import postgres from "postgres";
import {
  createContinuityFixtures,
  removeContinuityFixtures,
} from "./continuity-fixtures.mjs";
const sourceFiles = execFileSync(
  "git",
  [
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
    "src",
    "scripts",
    "package.json",
    "package-lock.json",
    "next.config.ts",
  ],
  { encoding: "utf8" },
)
  .trim()
  .split("\n")
  .sort();
const sourceFingerprint = createHash("sha256");
for (const name of sourceFiles)
  sourceFingerprint.update(name + "\0").update(fs.readFileSync(name));
const testedSource = sourceFingerprint.digest("hex");
const adminUrl = process.env.WEBSITE_TEST_ADMIN_URL,
  runtimeUrl = process.env.WEBSITE_TEST_RUNTIME_URL;
if (
  !adminUrl ||
  !runtimeUrl ||
  new URL(adminUrl).pathname !== new URL(runtimeUrl).pathname ||
  !new URL(adminUrl).pathname.endsWith("_acceptance")
)
  throw Error(
    "Supply matching isolated *_acceptance WEBSITE_TEST_ADMIN_URL and WEBSITE_TEST_RUNTIME_URL.",
  );
const admin = postgres(adminUrl, { max: 1, prepare: false }),
  runtime = postgres(runtimeUrl, { max: 1, prepare: false });
const [role] =
  await runtime`SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user`;
assert(
  !role.rolsuper && !role.rolbypassrls,
  "Use a non-superuser NOBYPASSRLS runtime",
);
await runtime.end();
const f = await createContinuityFixtures(admin),
  created = [];
let child,
  browser,
  browserProxy,
  logs = "";
const checks = [],
  browserChecks = [];
const pass = (name) => {
  checks.push(name);
  console.log("PASS", name);
};
const reserve = net.createServer();
await new Promise((r) => reserve.listen(0, "127.0.0.1", r));
const port = reserve.address().port;
await new Promise((r) => reserve.close(r)); // Next's compiled rewrite origin is localhost. Keep the trusted test platform origin consistent.
const base = "http://localhost:" + port;
async function api(who, path, method = "GET", body, extra = {}) {
  return fetch(base + path, {
    method,
    signal: AbortSignal.timeout(60000),
    headers: {
      ...(who ? { cookie: "lucia_os_session=" + f.tokens[who] } : {}),
      ...(method !== "GET"
        ? { origin: base, "content-type": "application/json" }
        : {}),
      ...extra,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
const context = (id) => "/api/websites/" + id + "/draft";
const setup = {
  organisationName: "Continuity organization A",
  websiteName: "Foundation website",
  organisationType: "Business or service",
  goal: "Introduce my organisation",
  templateId: "northstar-consulting",
  country: "Nigeria",
  siteSlug: "foundation-" + randomBytes(6).toString("hex"),
};
  async function publicSite(
    path = "/",
    hostname = setup.siteSlug + ".lucia.name.ng",
  ) {
    return new Promise((resolve, reject) => {
      const req = http.get(
        { hostname: "127.0.0.1", port, path, headers: { host: hostname } },
        (res) => {
          let body = "";
          res.setEncoding("utf8");
          res.on("data", (d) => (body += d));
          res.on("end", () =>
            resolve({ status: res.statusCode, text: async () => body }),
          );
        },
      );
      req.on("error", reject);
      req.setTimeout(30000, () =>
        req.destroy(Error("Public response timed out")),
      );
    });
  }

let id, saved, settings;
try {
  child = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      env: {
        ...process.env,
        NODE_ENV: "production",
        VERCEL_ENV: "preview",
        DATABASE_URL_RUNTIME: runtimeUrl,
        APP_BASE_URL: base,
        LUCIA_SITE_DOMAIN: "lucia.name.ng",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  child.stdout.on("data", (d) => (logs += d));
  child.stderr.on("data", (d) => (logs += d));
  for (let i = 0; i < 100; i++) {
    try {
      await fetch(base);
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 150));
    }
  }
  if (process.env.WEBSITE_TEST_PREMIUM_FAST !== "1") {
  assert.equal(
    (await api(null, "/api/onboarding/website", "POST", setup)).status,
    401,
  );
  assert.equal(
    (
      await api("a", "/api/onboarding/website", "POST", {
        ...setup,
        siteSlug: "staff",
      })
    ).status,
    422,
  );
  assert.equal(
    (
      await api("a", "/api/onboarding/website", "POST", {
        ...setup,
        templateId: "not-real",
      })
    ).status,
    422,
  );
  assert.equal(
    (
      await api("a", "/api/onboarding/website", "POST", setup, {
        origin: "https://evil.test",
      })
    ).status,
    403,
  );
  await admin`UPDATE organization_memberships SET role='viewer' WHERE user_id=${f.a} AND organization_id=${f.orgA}`;
  assert.equal(
    (await api("a", "/api/onboarding/website", "POST", setup)).status,
    403,
  );
  await admin`UPDATE organization_memberships SET role='owner' WHERE user_id=${f.a} AND organization_id=${f.orgA}`;
  pass(
    "Creation denies signed-out, invalid/reserved Layout/address, cross-origin and viewer writes",
  );
  const response = await api("a", "/api/onboarding/website", "POST", setup);
  const creation = await response.json();
  assert.equal(response.status, 201, creation.error);
  id = creation.website.id;
  created.push(id);
  assert.equal(creation.organization.id, f.orgA);
  const retry = await api("a", "/api/onboarding/website", "POST", setup);
  assert.equal(retry.status, 200);
  assert.equal((await retry.json()).website.id, id);
  saved = await (await api("a", context(id))).json();
  assert.equal(saved.draft.templateId, setup.templateId);
  assert.equal(saved.draft.siteName, setup.websiteName);
  assert.equal(
    (await api("a", context(id))).headers.get("etag"),
    saved.revision,
  );
  pass(
    "Create persists real authorized website/home draft, and retry reuses the exact project without payment",
  );
  assert.equal((await api("b", context(id))).status, 404);
  assert.equal(
    (
      await api("b", context(id), "PATCH", saved.draft, {
        "if-match": saved.revision,
      })
    ).status,
    404,
  );
  assert.equal((await api("a", context(id), "PATCH", saved.draft)).status, 428);
  assert.equal(
    (
      await api(
        "a",
        context(id),
        "PATCH",
        { ...saved.draft, headline: "" },
        { "if-match": saved.revision },
      )
    ).status,
    422,
  );
  assert.equal(
    (
      await api("a", context(id), "PATCH", saved.draft, {
        "if-match": saved.revision,
        origin: "https://evil.test",
      })
    ).status,
    403,
  );
  const writes = await Promise.all(
    ["Writer A", "Writer B"].map((headline) =>
      api(
        "a",
        context(id),
        "PATCH",
        { ...saved.draft, headline },
        { "if-match": saved.revision },
      ),
    ),
  );
  assert.deepEqual(writes.map((r) => r.status).sort(), [200, 409]);
  saved = await (await api("a", context(id))).json();
  assert(["Writer A", "Writer B"].includes(saved.draft.headline));
  pass(
    "Two concurrent editor saves produce one commit and one 409; invalid and cross-tenant writes cannot change it",
  );
  settings = () => ({
    action: "publish",
    websiteId: id,
    siteSlug: setup.siteSlug,
    siteName: saved.draft.siteName,
    headline: saved.draft.headline,
    description: saved.draft.description,
    customDomain: "",
  });
  assert.equal(
    (
      await api("b", "/api/publishing/publish", "POST", settings(), {
        "if-match": saved.revision,
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await api(
        "a",
        "/api/publishing/publish",
        "POST",
        { ...settings(), websiteId: f.siteB },
        { "if-match": saved.revision },
      )
    ).status,
    409,
  );
  assert.equal(
    (await api("a", "/api/publishing/publish", "POST", settings())).status,
    428,
  );
  // Same slug in a second authorized organization must not change selected project identity.
  await admin`UPDATE websites SET slug=${setup.siteSlug} WHERE id=${f.foreign}`;
  await admin`INSERT INTO organization_memberships(organization_id,user_id,role,status) VALUES(${f.orgB},${f.a},'owner','active')`;
  const list = await (await api("a", "/api/publishing/websites")).json();
  assert.equal(
    list.websites.filter((s) => s.slug === setup.siteSlug).length,
    2,
  );
  const publication = await api(
    "a",
    "/api/publishing/publish",
    "POST",
    settings(),
    { "if-match": saved.revision },
  );
  const pub = await publication.json();
  assert.equal(publication.status, 200, pub.error);
  assert(pub.published);
  assert.equal(pub.website.id, id);
  const [foreign] =
    await admin`SELECT status FROM websites WHERE id=${f.foreign}`;
  assert.equal(foreign.status, "draft");
  const [live] =
    await admin`SELECT organization_id,website_id,status FROM website_domains WHERE hostname=${setup.siteSlug + ".lucia.name.ng"}`;
  assert.equal(live.organization_id, f.orgA);
  assert.equal(live.website_id, id);
  assert.equal(live.status, "active");
  const publicHome = await publicSite();
  assert.equal(publicHome.status, 200);
  assert((await publicHome.text()).includes(saved.draft.headline));
  assert.equal((await publicSite("/services")).status, 200);
  assert.equal((await publicSite("/workspace")).status, 404);
  assert.equal((await publicSite("/staff")).status, 404);
  pass(
    "Free publication activates exact hostname and public snapshot for selected ID despite duplicate authorized slugs",
  );
  const beforePublishRevision = saved.revision;
  saved = await (await api("a", context(id))).json();
  const edit = await api(
    "a",
    context(id),
    "PATCH",
    { ...saved.draft, headline: "Private later draft" },
    { "if-match": saved.revision },
  );
  assert.equal(edit.status, 200);
  saved = await (await api("a", context(id))).json();
  assert(!(await (await publicSite()).text()).includes("Private later draft"));
  assert.equal(
    (
      await api("a", "/api/publishing/publish", "POST", settings(), {
        "if-match": beforePublishRevision,
      })
    ).status,
    409,
  );
  const [prior] =
    await admin`SELECT published_content FROM website_pages WHERE website_id=${id} AND path='/'`;
  // Deliberate address collision late in the publish transaction tests real rollback, not a mocked success.
  await admin`UPDATE website_domains SET website_id=${f.foreign},organization_id=${f.orgB},status='pending' WHERE hostname=${setup.siteSlug + ".lucia.name.ng"}`;
  const collision = await api(
    "a",
    "/api/publishing/publish",
    "POST",
    settings(),
    { "if-match": saved.revision },
  );
  assert.equal(collision.status, 409);
  const [after] =
    await admin`SELECT published_content FROM website_pages WHERE website_id=${id} AND path='/'`;
  assert.equal(after.published_content, prior.published_content);
  await admin`UPDATE website_domains SET website_id=${id},organization_id=${f.orgA},status='active' WHERE hostname=${setup.siteSlug + ".lucia.name.ng"}`;
  assert(!(await (await publicSite()).text()).includes("Private later draft"));
  pass(
    "Private saving and stale/late-conflict publishing preserve the previous real public version atomically",
  );
  const [home] =
    await admin`SELECT content FROM website_pages WHERE website_id=${id} AND path='/'`;
  await admin`UPDATE website_pages SET content='{corrupt' WHERE website_id=${id} AND path='/'`;
  const corrupt = await (await api("a", context(id))).json();
  assert.equal(corrupt.draft, null);
  assert.equal(
    (
      await api("a", "/api/publishing/publish", "POST", settings(), {
        "if-match": corrupt.revision,
      })
    ).status,
    422,
  );
  assert(!(await (await publicSite()).text()).includes("Private later draft"));
  await admin`UPDATE website_pages SET content=${home.content} WHERE website_id=${id} AND path='/'`;
  pass(
    "Corrupt saved drafts are rejected without publishing demo defaults or damaging live content",
  );
  await admin`DELETE FROM organization_memberships WHERE organization_id=${f.orgB} AND user_id=${f.a}`;
  }
  if (process.env.WEBSITE_TEST_PLAYWRIGHT_MODULE) {
    const { chromium } = await import(
      process.env.WEBSITE_TEST_PLAYWRIGHT_MODULE
    );
    // Local transport only: preserve the original URL and Host while forwarding
    // genuine application responses. No HTML/API response is fabricated.
    browserProxy = http.createServer((request, response) => {
      let target;
      try {
        target = new URL(request.url);
      } catch {
        response.writeHead(400).end();
        return;
      }
      // This is a test-only local transport. Chromium may send localhost
      // requests to this proxy despite the bypass list. Permit ONLY the
      // compiled application on its assigned ephemeral port, plus synthetic
      // LUCIA subdomains; never proxy arbitrary external URLs.
      const localApp =
        target.hostname === "localhost" || target.hostname === "127.0.0.1";
      const publicTestSite =
        /^[a-z0-9-]+\.lucia\.name\.ng$/.test(target.hostname);
      if (
        target.protocol !== "http:" ||
        target.port !== String(port) ||
        (!localApp && !publicTestSite)
      ) {
        response.writeHead(403).end();
        return;
      }
      const upstream = http.request(
        {
          hostname: "127.0.0.1",
          port,
          method: request.method,
          path: target.pathname + target.search,
          headers: { ...request.headers, host: target.host },
        },
        (result) => {
          response.writeHead(result.statusCode, result.headers);
          result.pipe(response);
        },
      );
      upstream.on("error", () => {
        if (!response.headersSent) response.writeHead(502);
        response.end();
      });
      request.pipe(upstream);
    });
    await new Promise((resolve) =>
      browserProxy.listen(0, "127.0.0.1", resolve),
    );
    browser = await chromium.launch({
      ...(process.env.WEBSITE_TEST_CHROMIUM
        ? { executablePath: process.env.WEBSITE_TEST_CHROMIUM }
        : {}),
      headless: true,
      proxy: {
        server: "http://127.0.0.1:" + browserProxy.address().port,
        bypass: "localhost,127.0.0.1",
      },
      args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    });
    const browserContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: "reduce",
    });
    await browserContext.addCookies([
      { name: "lucia_os_session", value: f.tokens.a, url: base },
    ]);
    const page = await browserContext.newPage();
    page.setDefaultTimeout(60000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    let acceptDialog = true;
    page.on("dialog", (d) => (acceptDialog ? d.accept() : d.dismiss()));
    const bpass = (name) => {
      browserChecks.push(name);
      console.log("PASS browser", name);
    };
    if (process.env.WEBSITE_TEST_PREMIUM_ONLY !== "1") {
    await page.goto(base + "/templates", { waitUntil: "networkidle" });
    await page
      .getByRole("link", { name: /Preview current design/ })
      .first()
      .click();
    await page
      .getByRole("heading", { name: "Shape your website.", exact: true })
      .waitFor();
    assert(await page.locator(".layout-site").count());
    bpass("Discover opens actual current renderer, not just a thumbnail");
    await page.waitForFunction(() =>
      document.querySelector(".editor-recovery-controls")?.matches(":enabled"),
    );
    const families = [
      ["northstar-consulting", "editorial"],
      ["atlas-studio", "split"],
      ["civic-legal", "classic"],
      ["meridian-nonprofit", "cards"],
      ["folio-atelier", "gallery"],
      ["market-goods", "storefront"],
    ];
    for (const [layout, family] of families) {
      await page.getByLabel(/Starting design/).selectOption(layout);
      await page.waitForFunction(
        (f) =>
          document
            .querySelector(".layout-site")
            ?.classList.contains("layout-" + f),
        family,
      );
      for (const [width, height] of [
        [320, 740],
        [390, 844],
        [768, 1024],
        [1180, 820],
        [1440, 900],
      ]) {
        await page.setViewportSize({ width, height });
        assert.equal(await page.locator(".layout-site section").count(), 3);
        assert(
          await page
            .locator(".layout-hero h1")
            .evaluate(
              (e) =>
                e.scrollWidth <= e.clientWidth + 1 &&
                e.getBoundingClientRect().right <=
                  e.parentElement.getBoundingClientRect().right + 1,
            ),
          "Heading exceeds preview container " + layout + " " + width,
        );
        const geometry = await page.evaluate(() => ({
          width: innerWidth,
          scroll: document.documentElement.scrollWidth,
          nodes: [...document.querySelectorAll("body *")]
            .map((e) => ({
              tag: e.tagName,
              cls: e.className,
              text: e.textContent?.slice(0, 70),
              x: e.getBoundingClientRect().x,
              right: e.getBoundingClientRect().right,
              width: e.getBoundingClientRect().width,
            }))
            .filter((e) => e.right > innerWidth + 1 || e.x < -1)
            .slice(0, 20),
        }));
        if (geometry.scroll > width)
          console.log("OVERFLOW", JSON.stringify(geometry));
        assert(
          geometry.scroll <= width,
          "editor viewport overflow " + layout + " " + width,
        );
      }
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    bpass(
      "All six actual renderer families inspected at phone/tablet/desktop; shared three-section composition confirmed",
    );

    const uiSlug = "browser-" + randomBytes(6).toString("hex");
    await page.goto(base + "/create?template=northstar-consulting", {
      waitUntil: "networkidle",
    });
    await page
      .getByLabel("Organisation name", { exact: true })
      .fill("Continuity organization A");
    await page.getByRole("button", { name: /Continue/ }).click();
    await page
      .getByLabel("Website name", { exact: true })
      .fill("Browser website");
    await page.getByLabel(/Suggested website address/).fill(uiSlug);
    await page.getByRole("button", { name: /Continue/ }).click();
    const createdRequest = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/onboarding/website") &&
        r.request().method() === "POST",
    );
    await page.getByRole("button", { name: /Create workspace/ }).click();
    const createdResponse = await createdRequest;
    const ui = await createdResponse.json();
    assert.equal(createdResponse.status(), 201, ui.error);
    created.push(ui.website.id);
    await page
      .getByRole("link", {
        name: /Open.*Studio|Open visual editor|Open Layout Studio/i,
      })
      .first()
      .click();
    await page.getByLabel("Website name", { exact: true }).waitFor();
    await page.waitForFunction(() =>
      document.querySelector(".editor-recovery-controls")?.matches(":enabled"),
    );
    await page
      .getByLabel("Main headline", { exact: true })
      .fill("Browser persisted headline");
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await page
      .getByRole("status")
      .filter({ hasText: "Your website draft is saved" })
      .waitFor();
    await page.reload({ waitUntil: "networkidle" });
    await page.getByLabel("Main headline", { exact: true }).waitFor();
    await page.waitForFunction(() =>
      document.querySelector(".editor-recovery-controls")?.matches(":enabled"),
    );
    assert.equal(
      await page.getByLabel("Main headline", { exact: true }).inputValue(),
      "Browser persisted headline",
    );
    bpass(
      "Create → edit → real save → reload retains the correct project content",
    );
    await page.goto(base + "/publish?websiteId=" + ui.website.id, {
      waitUntil: "networkidle",
    });
    await page.getByLabel("Website to publish").waitFor();
    await page.waitForFunction(() =>
      document.querySelector(".publish-primary")?.matches(":enabled"),
    );
    await page
      .getByRole("button", { name: "Preview website", exact: true })
      .click();
    await page.getByRole("dialog").waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "Close preview", exact: true })
        .evaluate((e) => document.activeElement === e),
      true,
    );
    for (let index = 0; index < 12; index++) {
      await page.keyboard.press("Tab");
      assert(
        await page
          .getByRole("dialog")
          .evaluate(
            (e) =>
              e.matches(":modal") &&
              (document.activeElement === document.body ||
                e.contains(document.activeElement)),
          ),
        "A modal preview must prevent focus on underlying page controls (browser chrome remains available)",
      );
    }

    // Chromium uses BODY transiently while cycling through browser chrome. It must
    // never focus an underlying page control, even when focus is requested directly.
    await page
      .getByRole("button", { name: "Preview website", exact: true })
      .evaluate((e) => e.focus());
    assert(
      await page
        .getByRole("dialog")
        .evaluate(
          (e) =>
            e.matches(":modal") &&
            (document.activeElement === document.body ||
              e.contains(document.activeElement)),
        ),
    );
    assert.equal(
      await page
        .getByRole("dialog")
        .getByRole("heading", {
          name: "Browser persisted headline",
          exact: true,
        })
        .count(),
      1,
    );
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "detached" });
    await page.waitForFunction(
      () => document.activeElement?.textContent === "Preview website",
    );
    assert(
      await page
        .getByRole("button", { name: "Preview website", exact: true })
        .evaluate((e) => document.activeElement === e),
    );
    await page
      .getByRole("button", { name: "Preview website", exact: true })
      .click();
    await page.getByRole("dialog").waitFor();
    await page
      .getByRole("button", { name: "Close preview", exact: true })
      .click();
    await page.getByRole("dialog").waitFor({ state: "detached" });
    await page.waitForFunction(
      () => document.activeElement?.textContent === "Preview website",
    );
    bpass(
      "Preview keyboard focus stays within the modal page; Escape and Close restore the trigger",
    );

    await page
      .getByRole("button", { name: "Publish website", exact: true })
      .click();
    await page
      .getByRole("link", { name: "Open live website", exact: false })
      .waitFor();
    const publicResponse = await publicSite("/", uiSlug + ".lucia.name.ng");
    assert.equal(publicResponse.status, 200);
    assert(
      (await publicResponse.text()).includes("Browser persisted headline"),
    );
    const publicPage = await browserContext.newPage();
    publicPage.on("pageerror", (e) => errors.push(e.message));
    await publicPage.goto(`http://${uiSlug}.lucia.name.ng:${port}/`);
    assert.equal(
      await publicPage
        .getByRole("heading", {
          name: "Browser persisted headline",
          exact: true,
        })
        .count(),
      1,
    );
    assert.equal(await publicPage.getByRole("tablist").count(), 0);
    fs.mkdirSync("/tmp/p1112-browser", { recursive: true });
    for (const [width, height] of [
      [390, 844],
      [768, 1024],
      [1180, 820],
      [1440, 900],
    ]) {
      await publicPage.setViewportSize({ width, height });
      assert(
        await publicPage.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        "Public viewport overflow " + width,
      );
      const contact = publicPage
        .getByRole("link", { name: /Get in touch/ })
        .first();
      assert(await contact.isVisible());
      await contact.focus();
      assert(await contact.evaluate((e) => e === document.activeElement));
      await publicPage.screenshot({
        path: `/tmp/p1112-browser/public-${width}.png`,
      });
      bpass(
        "Public website geometry and keyboard controls at " +
          width +
          " × " +
          height +
          " (emulated)",
      );
    }

    bpass(
      "Authorized preview → publish → real browser public hostname uses persisted content without workspace UI",
    );
    // A stale local recovery must require explicit review, even after refresh fetches a newer server revision.
    await page.goto(base + "/editor?websiteId=" + ui.website.id, {
      waitUntil: "networkidle",
    });
    await page.waitForFunction(() =>
      document.querySelector(".editor-recovery-controls")?.matches(":enabled"),
    );
    await page
      .getByLabel("Main headline", { exact: true })
      .fill("Local recovery must not overwrite");
    let current = await (await api("a", context(ui.website.id))).json();
    assert.equal(
      (
        await api(
          "a",
          context(ui.website.id),
          "PATCH",
          { ...current.draft, headline: "Other session committed" },
          { "if-match": current.revision },
        )
      ).status,
      200,
    );
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("alert", { name: "Saved draft conflict" }).waitFor();
    assert(
      await page
        .getByRole("button", { name: "Save draft", exact: true })
        .isDisabled(),
    );
    assert.equal(
      (await (await api("a", context(ui.website.id))).json()).draft.headline,
      "Other session committed",
    );
    acceptDialog = false;
    await page
      .getByRole("button", { name: "Load saved draft", exact: true })
      .click();
    assert.equal(
      await page.getByLabel("Main headline", { exact: true }).inputValue(),
      "Local recovery must not overwrite",
    );
    assert(
      await page
        .getByRole("alert", { name: "Saved draft conflict" })
        .isVisible(),
    );
    bpass("Cancel retains the intended recovered local edits");
    acceptDialog = true;
    await page
      .getByRole("button", { name: "Load saved draft", exact: true })
      .click();
    assert.equal(
      await page.getByLabel("Main headline", { exact: true }).inputValue(),
      "Other session committed",
    );
    bpass(
      "Recovered stale edits cannot silently overwrite a newer saved draft",
    );
    const escaped = "<script>window.customerCodeExecuted=true</script>";
    current = await (await api("a", context(ui.website.id))).json();
    await api(
      "a",
      context(ui.website.id),
      "PATCH",
      { ...current.draft, headline: escaped },
      { "if-match": current.revision },
    );
    const latest = await (await api("a", context(ui.website.id))).json();
    const safe = await api(
      "a",
      "/api/publishing/publish",
      "POST",
      {
        action: "publish",
        websiteId: ui.website.id,
        siteSlug: uiSlug,
        siteName: latest.draft.siteName,
        headline: latest.draft.headline,
        description: latest.draft.description,
        customDomain: "",
      },
      { "if-match": latest.revision },
    );
    assert.equal(safe.status, 200);
    await publicPage.reload({ waitUntil: "domcontentloaded" });
    assert.equal(
      await publicPage.evaluate(() => window.customerCodeExecuted),
      undefined,
    );
    assert.equal(
      await publicPage
        .getByRole("heading", { name: escaped, exact: true })
        .count(),
      1,
    );
    bpass("Customer-controlled markup renders as text, not executable code");
    await page.goto(
      base +
        "/workspace/desktop?app=" +
        encodeURIComponent("/editor?websiteId=" + ui.website.id),
      { waitUntil: "networkidle" },
    );
    await page.waitForFunction(() =>
      document.querySelector(".editor-recovery-controls")?.matches(":enabled"),
    );
    await page
      .getByLabel("Main headline", { exact: true })
      .fill("Lattice saved content");
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await page
      .getByRole("status")
      .filter({ hasText: "Your website draft is saved" })
      .waitFor();
    assert.equal(
      (await (await api("a", context(ui.website.id))).json()).draft.headline,
      "Lattice saved content",
    );
    bpass(
      "Existing Lattice native editor saves the correct resource with the revision contract",
    );
    await page.goto(base + "/versions?websiteId=" + ui.website.id, {
      waitUntil: "networkidle",
    });
    await page
      .getByRole("button", { name: "Save checkpoint", exact: true })
      .waitFor();
    await page.waitForFunction(() =>
      [...document.querySelectorAll("button")].some(
        (e) => e.textContent === "Save checkpoint" && !e.disabled,
      ),
    );
    await page
      .getByLabel("Version name", { exact: true })
      .fill("Foundation restore checkpoint");
    await page
      .getByRole("button", { name: "Save checkpoint", exact: true })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "Checkpoint saved to this website's version history" })
      .waitFor();
    const beforeRestore = await (await api("a", context(ui.website.id))).json();
    const advanced = await api(
      "a",
      context(ui.website.id),
      "PATCH",
      { ...beforeRestore.draft, headline: "Newer than version history" },
      { "if-match": beforeRestore.revision },
    );
    assert.equal(advanced.status, 200);
    await page
      .getByRole("button", { name: "Restore to draft", exact: true })
      .first()
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "Nothing was overwritten" })
      .waitFor();
    assert.equal(
      (await (await api("a", context(ui.website.id))).json()).draft.headline,
      "Newer than version history",
    );
    await page
      .getByRole("button", { name: "Refresh history", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Restore to draft", exact: true })
      .first()
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "Checkpoint restored to the saved draft only" })
      .waitFor();
    assert.equal(
      (await (await api("a", context(ui.website.id))).json()).draft.headline,
      "Lattice saved content",
    );
    bpass(
      "Version History saves a real checkpoint, rejects stale restoration, and restores after explicit refresh without publishing",
    );

    await page.goto(base + "/create", { waitUntil: "networkidle" });
    await page
      .getByLabel("Organisation name", { exact: true })
      .fill("Private setup A");
    await page.waitForFunction(
      (id) =>
        sessionStorage
          .getItem(`lucia-os:website-setup:v2:${id}`)
          ?.includes("Private setup A"),
      f.a,
    );
    await page.evaluate(() =>
      localStorage.setItem(
        "lucia-os-website-setup-draft",
        JSON.stringify({
          organisationName: "Legacy private setup",
          websiteName: "Legacy private site",
          organisationType: "Business or service",
          goal: "Introduce my organisation",
          templateId: "northstar-consulting",
          country: "Nigeria",
          siteSlug: "legacy-private",
        }),
      ),
    );
    await browserContext.addCookies([
      { name: "lucia_os_session", value: f.tokens.b, url: base },
    ]);
    await page.reload({ waitUntil: "networkidle" });
    assert.equal(
      await page.getByLabel("Organisation name", { exact: true }).inputValue(),
      "",
    );
    assert(
      await page.evaluate(
        (id) =>
          sessionStorage
            .getItem(`lucia-os:website-setup:v2:${id}`)
            .includes("Private setup A"),
        f.a,
      ),
    );
    bpass(
      "Setup recovery is account-scoped and never imports unowned legacy names",
    );
    const noStorage = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    await noStorage.addCookies([
      { name: "lucia_os_session", value: f.tokens.a, url: base },
    ]);
    await noStorage.addInitScript(() =>
      Object.defineProperty(window, "sessionStorage", {
        get() {
          throw new DOMException("Disabled for acceptance", "SecurityError");
        },
      }),
    );
    const noStorePage = await noStorage.newPage();
    noStorePage.setDefaultTimeout(60000);
    noStorePage.on("pageerror", (e) => errors.push(e.message));
    await noStorePage.goto(base + "/create?template=northstar-consulting", {
      waitUntil: "networkidle",
    });
    await noStorePage
      .getByLabel("Organisation name", { exact: true })
      .fill("Continuity organization A");
    await noStorePage.getByRole("button", { name: /Continue/ }).click();
    await noStorePage
      .getByLabel("Website name", { exact: true })
      .fill("Storage-disabled project");
    await noStorePage
      .getByLabel(/Suggested website address/)
      .fill("memory-" + randomBytes(5).toString("hex"));
    await noStorePage.getByRole("button", { name: /Continue/ }).click();
    const noStoreResponse = noStorePage.waitForResponse(
      (r) =>
        r.url().endsWith("/api/onboarding/website") &&
        r.request().method() === "POST",
    );
    await noStorePage.getByRole("button", { name: /Create workspace/ }).click();
    const noStoreResult = await noStoreResponse;
    const noStoreBody = await noStoreResult.json();
    assert.equal(noStoreResult.status(), 201, noStoreBody.error);
    created.push(noStoreBody.website.id);
    await noStorePage
      .getByRole("link", { name: "Open Layout Studio", exact: true })
      .waitFor();
    await noStorage.close();
    bpass("Unavailable browser storage does not crash setup or turn a committed project into failure");
    }
    if (process.env.WEBSITE_TEST_PREMIUM === "1") {
      const {checkPremiumComposition} = await import("./premium-composition-acceptance.mjs");
      await checkPremiumComposition({api,admin,f,base,browserContext,created,bpass,publicSite});
    }
    if (process.env.WEBSITE_TEST_PHASE14 === "1") {
      const { checkPhase14FlagshipPublishing } = await import(
        "./phase14-premium-publishing-acceptance.mjs"
      );
      await checkPhase14FlagshipPublishing({
        api, admin, f, base, browserContext, created, bpass, publicSite,
      });
    }
    assert.equal(errors.length, 0, errors.join("\n"));
    bpass("No unhandled application errors");
  }
  if (process.env.WEBSITE_TEST_PREMIUM_FAST !== "1") {
  await admin`UPDATE organization_memberships SET status='revoked' WHERE user_id=${f.a} AND organization_id=${f.orgA}`;
  assert.equal((await api("a", context(id))).status, 404);
  assert.equal(
    (
      await api("a", "/api/publishing/publish", "POST", settings(), {
        "if-match": saved.revision,
      })
    ).status,
    403,
  );
  pass("Revoked tenant membership cannot read or publish");
  }
  assert.equal((await api("b", "/api/staff/grants")).status, 403);
  pass("Ordinary customer session cannot access staff grants");
  console.log(
    "COMPLETE",
    checks.length,
    "HTTP checks",
    browserChecks.length,
    "browser checks",
  );
  if (process.env.WEBSITE_TEST_EVIDENCE_FILE)
    fs.writeFileSync(
      process.env.WEBSITE_TEST_EVIDENCE_FILE,
      JSON.stringify(
        {
          environment:
            "compiled local application; synthetic isolated acceptance database; NOBYPASSRLS runtime",
          testedSource,
          checks,
          browserChecks,
        },
        null,
        2,
      ),
    );
} catch (error) {
  console.error(error);
  if (process.env.WEBSITE_TEST_FAILURE_LOG)
    fs.writeFileSync(process.env.WEBSITE_TEST_FAILURE_LOG, logs);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (browserProxy) browserProxy.close();
  if (child) child.kill();
  for (const id of created) await admin`DELETE FROM websites WHERE id=${id}`;
  await removeContinuityFixtures(admin, f);
  await admin.end();
  setTimeout(() => process.exit(process.exitCode ?? 0), 250);
}
