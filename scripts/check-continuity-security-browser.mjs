/** Opt-in authenticated browser acceptance; never targets normal application DB variables. */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import postgres from "postgres";
import {
  createContinuityFixtures,
  removeContinuityFixtures,
} from "./continuity-fixtures.mjs";
const adminUrl = process.env.CONTINUITY_TEST_ADMIN_URL,
  runtime = process.env.CONTINUITY_TEST_RUNTIME_URL;
if (
  !adminUrl ||
  !runtime ||
  new URL(adminUrl).pathname !== new URL(runtime).pathname ||
  !new URL(adminUrl).pathname.endsWith("_acceptance")
)
  throw Error(
    "Supply matching isolated *_acceptance database URLs in CONTINUITY_TEST_ADMIN_URL and CONTINUITY_TEST_RUNTIME_URL.",
  );
const { chromium } = await import(
  process.env.CONTINUITY_PLAYWRIGHT_MODULE || "playwright"
);
const root = process.cwd(),
  out = path.join(root, "docs/evidence/phase9");
fs.mkdirSync(out, { recursive: true });
const admin = postgres(adminUrl, { max: 1, prepare: false });
const runtimeCheck = postgres(runtime, { max: 1, prepare: false });
const [role] =
  await runtimeCheck`SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user`;
assert(
  !role.rolsuper && !role.rolbypassrls,
  "Acceptance requires a non-superuser NOBYPASSRLS runtime.",
);
await runtimeCheck.end();
const fixtures = await createContinuityFixtures(admin);
const base = "http://127.0.0.1:" + (process.env.CONTINUITY_TEST_PORT || "3219");
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    String(new URL(base).port),
  ],
  {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: "production",
      VERCEL_ENV: "preview",
      DATABASE_URL_RUNTIME: runtime,
      APP_BASE_URL: base,
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let logs = "";
child.stdout.on("data", (d) => (logs += d));
child.stderr.on("data", (d) => (logs += d));
const checks = [];
let browser, page;
const errors = [];
const pass = (name) => {
  checks.push(name);
  console.log("PASS", name);
};
async function readyEditor(p = page) {
  await p.getByLabel("Website name", { exact: true }).waitFor();
  await p.waitForFunction(() =>
    document.querySelector(".editor-recovery-controls")?.matches(":enabled"),
  );
}
async function open(href) {
  await page.goto(base + href, { waitUntil: "domcontentloaded" });
}
async function editorValue() {
  return page.getByLabel("Website name", { exact: true }).inputValue();
}
try {
  for (let i = 0; i < 120; i++) {
    try {
      await fetch(base);
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 150));
    }
  }
  browser = await chromium.launch({
    ...(process.env.CONTINUITY_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.CONTINUITY_CHROMIUM_EXECUTABLE }
      : {}),
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  await context.addCookies([
    { name: "lucia_os_session", value: fixtures.tokens.a, url: base },
  ]);
  page = await context.newPage();
  page.setDefaultTimeout(45000);
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", async (d) => await d.accept());
  await open("/editor?websiteId=" + fixtures.siteA);
  await readyEditor();
  let release, intercepted;
  const gate = new Promise((r) => (release = r)),
    seen = new Promise((r) => (intercepted = r));
  await page.route("**/api/websites/*/draft", async (route) => {
    if (route.request().method() !== "PATCH") return route.continue();
    const response = await route.fetch();
    intercepted();
    await gate;
    await route.fulfill({ response });
  });
  await page
    .getByLabel("Website name", { exact: true })
    .fill("Submitted earlier draft");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await seen;
  await page
    .getByLabel("Website name", { exact: true })
    .fill("Newer local changes");
  release();
  await page
    .getByRole("status")
    .filter({ hasText: "Your newer edits remain unsaved." })
    .waitFor();
  assert.equal(await editorValue(), "Newer local changes");
  assert(
    await page
      .getByRole("tab", { name: /Layout Studio editor/ })
      .getByLabel("Unsaved changes")
      .count(),
  );
  await page.unroute("**/api/websites/*/draft");
  pass("Delayed successful save preserves and marks newer local edits unsaved");
  await page
    .getByRole("link", { name: "Back to Websites", exact: true })
    .click();
  await page.getByRole("heading", { name: "Your saved websites." }).waitFor();
  await admin`INSERT INTO organization_memberships(organization_id,user_id,role,status) VALUES(${fixtures.orgB},${fixtures.a},'owner','active')`;
  await open("/workspace/settings?category=organizations");
  await page.getByLabel("Preferred organization").selectOption(fixtures.orgB);
  await page
    .getByRole("button", { name: "Save preferences", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Account preferences saved." })
    .waitFor();
  await page.getByRole("tab", { name: /Layout Studio editor/ }).click();
  await readyEditor();
  assert.equal(
    new URL(page.url()).searchParams.get("websiteId"),
    fixtures.siteA,
  );
  assert.equal(await editorValue(), "Newer local changes");
  const [site] =
    await admin`SELECT organization_id FROM websites WHERE id=${fixtures.siteA}`;
  assert.equal(site.organization_id, fixtures.orgA);
  pass(
    "Organization preference switch preserves unsaved website identity and tenant ownership",
  );
  await admin`UPDATE organization_memberships SET status='revoked' WHERE user_id=${fixtures.a} AND organization_id=${fixtures.orgB}`;
  await open("/workspace/settings?category=organizations");
  await page.getByLabel("Preferred organization").waitFor();
  assert.equal(
    await page
      .getByLabel("Preferred organization")
      .locator(`option[value="${fixtures.orgB}"]`)
      .count(),
    0,
  );
  pass(
    "Revoked preferred organization is removed by the server-authorized membership list",
  );
  await admin`DELETE FROM websites WHERE id=${fixtures.siteB}`;
  await open("/editor?websiteId=" + fixtures.siteB);
  await page
    .getByRole("status")
    .filter({ hasText: /not found|access denied/i })
    .waitFor();
  assert(
    await page
      .getByRole("button", { name: "Save draft", exact: true })
      .isDisabled(),
  );
  pass("Deleted resource deep link fails safely without a save action");
  await page.addInitScript(
    (id) =>
      sessionStorage.setItem(`lucia.workspace.recovery.v2:${id}`, "{corrupted"),
    fixtures.a,
  );
  await page.reload();
  await page
    .getByRole("status")
    .filter({ hasText: "Stored recovery is invalid or expired" })
    .waitFor();
  assert.equal(
    await page.evaluate(
      (id) => sessionStorage.getItem(`lucia.workspace.recovery.v2:${id}`),
      fixtures.a,
    ),
    "{corrupted",
  );
  pass("Corrupt recovery stays untouched while the application remains usable");
  const isolated = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  await isolated.addCookies([
    { name: "lucia_os_session", value: fixtures.tokens.a, url: base },
  ]);
  await isolated.addInitScript(() =>
    Object.defineProperty(window, "sessionStorage", {
      get() {
        throw new DOMException("Disabled for acceptance", "SecurityError");
      },
    }),
  );
  const disabled = await isolated.newPage();
  disabled.on("pageerror", (e) => errors.push(e.message));
  await disabled.goto(base + "/editor?websiteId=" + fixtures.siteA);
  await readyEditor(disabled);
  await disabled
    .getByLabel("Website name", { exact: true })
    .fill("Memory-only recovery");
  await disabled
    .getByRole("link", { name: "Back to Websites", exact: true })
    .click();
  await disabled
    .getByRole("heading", { name: "Your saved websites." })
    .waitFor();
  await disabled.getByRole("button", { name: "Apps", exact: true }).click();
  await disabled
    .locator("#lucia-mobile-app-list")
    .getByRole("button", { name: /Layout Studio editor/ })
    .click();
  await readyEditor(disabled);
  assert.equal(
    await disabled.getByLabel("Website name", { exact: true }).inputValue(),
    "Memory-only recovery",
  );
  pass(
    "Disabled storage keeps an honest memory-only draft across mobile app switches",
  );
  await isolated.close();
  assert.equal(errors.length, 0, errors.join("\n"));
  pass("No unhandled browser application errors");
  fs.writeFileSync(
    out + "/security-browser-acceptance.json",
    JSON.stringify(
      {
        date: "2026-10-30",
        environment:
          "Real compiled local application connected to isolated Neon database with synthetic users and NOBYPASSRLS runtime",
        checks,
        physicalTablet: "deferred",
        previewRuntime: "not claimed",
      },
      null,
      2,
    ),
  );
  console.log("COMPLETE", checks.length);
} catch (e) {
  console.error(e);
  if (page)
    console.log(
      "FAIL URL",
      page.url(),
      await page.getByRole("dialog").count(),
      await page.getByRole("status").allTextContents(),
    );
  fs.writeFileSync(out + "/server-failure.log", logs);
  if (page) {
    await page
      .screenshot({
        path: out + "/failure.jpg",
        type: "jpeg",
        quality: 80,
        fullPage: true,
      })
      .catch(
        () => {},
      ); /* Do not persist HTML containing serialized session or private form state. */
  }
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  child.kill();
  await removeContinuityFixtures(admin, fixtures);
  await admin.end();
  setTimeout(() => process.exit(process.exitCode ?? 0), 500);
}
