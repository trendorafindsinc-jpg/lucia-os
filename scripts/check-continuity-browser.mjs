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
  await page
    .getByLabel("Website name", { exact: true })
    .fill("Unsaved continuity A");
  await page.getByLabel("Main headline", { exact: true }).fill("");
  await page
    .getByRole("link", { name: "Back to Websites", exact: true })
    .click();
  await page.getByRole("heading", { name: "Your saved websites." }).waitFor();
  await page.getByRole("tab", { name: /Layout Studio editor/ }).click();
  await readyEditor();
  assert.equal(await editorValue(), "Unsaved continuity A");
  assert.equal(
    await page.getByLabel("Main headline", { exact: true }).inputValue(),
    "",
  );
  pass(
    "Editor app switch restores valid and temporarily invalid text without save claims",
  );
  await page
    .getByLabel("Main headline", { exact: true })
    .fill("Restored valid headline");
  await open("/editor?websiteId=" + fixtures.siteB);
  await readyEditor();
  assert.notEqual(await editorValue(), "Unsaved continuity A");
  await page
    .getByLabel("Website name", { exact: true })
    .fill("Unsaved continuity B");
  await page
    .getByRole("tab", { name: /Layout Studio editor/ })
    .first()
    .click();
  await page.waitForURL(base + "/editor?websiteId=" + fixtures.siteA);
  await readyEditor();
  assert.equal(await editorValue(), "Unsaved continuity A");
  pass("Two website contexts keep independent drafts and routes");
  await page
    .getByRole("button", {
      name: "Close Layout Studio editor tab",
      exact: true,
    })
    .last()
    .click();
  await page.getByRole("dialog").waitFor();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  assert.equal(
    await page
      .getByRole("button", {
        name: "Close Layout Studio editor tab",
        exact: true,
      })
      .count(),
    2,
  );
  await page
    .getByRole("button", {
      name: "Close Layout Studio editor tab",
      exact: true,
    })
    .last()
    .click();
  await page
    .getByRole("button", { name: "Discard changes", exact: true })
    .click();
  assert.equal(await editorValue(), "Unsaved continuity A");
  assert(
    await page.evaluate(
      (id) =>
        !JSON.stringify(
          JSON.parse(
            sessionStorage.getItem(`lucia.workspace.recovery.v2:${id}`),
          ),
        ).includes("Unsaved continuity B"),
      fixtures.a,
    ),
  );
  pass("Inactive dirty close supports Cancel and discards only that resource");
  await page
    .getByRole("button", {
      name: "Close Layout Studio editor tab",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Save and continue", exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await open("/editor?websiteId=" + fixtures.siteA);
  await readyEditor();
  assert.equal(await editorValue(), "Unsaved continuity A");
  pass("Save and Continue invokes real authorized database persistence");
  await page
    .getByLabel("Website name", { exact: true })
    .fill("Failed then retried A");
  await page.route("**/api/websites/*/draft", async (r) => {
    if (r.request().method() === "PATCH") await r.abort();
    else await r.continue();
  });
  await page
    .getByRole("button", {
      name: "Close Layout Studio editor tab",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Save and continue", exact: true })
    .click();
  await page.getByRole("dialog").getByRole("alert").waitFor();
  assert.equal(await editorValue(), "Failed then retried A");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.unroute("**/api/websites/*/draft");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await page.getByText("Saved just now", { exact: true }).waitFor();
  pass(
    "Failed save retains dirty work; genuine retry clears it only after success",
  );
  await open("/editor?template=northstar-consulting");
  await readyEditor();
  await page
    .getByLabel("Website name", { exact: true })
    .fill("Private preview continuity");
  await page
    .getByRole("link", { name: "Back to Websites", exact: true })
    .click();
  await page.waitForURL(base + "/workspace/websites");
  await page.getByRole("heading", { name: "Your saved websites." }).waitFor();
  await page.goBack();
  await page.waitForURL(base + "/editor?template=northstar-consulting");
  await readyEditor();
  assert.equal(await editorValue(), "Private preview continuity");
  await page.goForward();
  await page.waitForURL(base + "/workspace/websites");
  await page.getByRole("heading", { name: "Your saved websites." }).waitFor();
  await page.goBack();
  await page.waitForURL(base + "/editor?template=northstar-consulting");
  await readyEditor();
  assert.equal(await editorValue(), "Private preview continuity");
  pass(
    "Back and Forward preserve address, context and recoverable preview draft",
  );
  await page
    .getByRole("button", {
      name: "Close Layout Studio editor tab",
      exact: true,
    })
    .last()
    .click();
  await page.getByRole("dialog").waitFor();
  assert.equal(
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Save and continue", exact: true })
      .count(),
    0,
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  pass("Preview-only dirty close offers no fabricated save action");
  await open("/workspace/settings");
  await page.getByRole("radio", { name: "dark", exact: true }).waitFor();
  await page.waitForFunction(() =>
    document.querySelector("input[name=theme]")?.matches(":enabled"),
  );
  const theme = (await page
    .getByRole("radio", { name: "dark", exact: true })
    .isChecked())
    ? "light"
    : "dark";
  await page.getByRole("radio", { name: theme, exact: true }).check();
  await page
    .getByRole("link", { name: "Back to workspace", exact: true })
    .click();
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.waitForFunction(() =>
    document.querySelector("input[name=theme]")?.matches(":enabled"),
  );
  assert(
    await page.getByRole("radio", { name: theme, exact: true }).isChecked(),
  );
  await page
    .getByRole("button", { name: "Save preferences", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Account preferences saved." })
    .waitFor();
  pass("Settings unsaved choices recover; account save remains authoritative");
  await open("/templates");
  await page.getByLabel("Search layouts", { exact: true }).fill("school");
  await page
    .getByRole("link", { name: "Back to workspace", exact: false })
    .first()
    .click();
  await page.getByRole("link", { name: "App Library", exact: true }).click();
  await page.getByRole("link", { name: "Open Layouts", exact: true }).click();
  await page.waitForFunction(
    () => document.querySelector("#template-search")?.value === "school",
  );
  assert.equal(
    await page.getByLabel("Search layouts", { exact: true }).inputValue(),
    "school",
  );
  pass("Layouts filter adapter restores catalogue browsing state");
  await open("/workspace/desktop");
  await page.getByLabel("Website name", { exact: true }).waitFor();
  await page
    .getByLabel("Website name", { exact: true })
    .fill("Independent Lattice preview");
  await page.getByLabel("Search layouts", { exact: true }).fill("school");
  await page.getByRole("button", { name: "Single app", exact: true }).click();
  await page.getByRole("button", { name: "Split view", exact: true }).click();
  await page.getByRole("button", { name: "Swap sides", exact: true }).click();
  await page.getByLabel("Left pane width").fill("55");
  await page
    .getByRole("button", { name: "Close Layout Studio pane", exact: true })
    .click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("link", { name: "Home", exact: true }).click();
  await page.getByRole("link", { name: "App Library", exact: true }).click();
  await page.getByRole("tab", { name: /^Lattice/ }).click();
  await page.getByLabel("Website name", { exact: true }).waitFor();
  assert.equal(await editorValue(), "Independent Lattice preview");
  assert.equal(
    await page.getByLabel("Search layouts", { exact: true }).inputValue(),
    "school",
  );
  assert.equal(await page.getByLabel("Left pane width").inputValue(), "55");
  await page.reload();
  await page.getByLabel("Website name", { exact: true }).waitFor();
  assert.equal(await editorValue(), "Independent Lattice preview");
  pass(
    "Lattice independent panes, close cancellation, mode/order/ratio and reload recovery",
  );
  for (const [w, h] of [
    [390, 844],
    [768, 1024],
    [820, 1180],
    [1024, 768],
    [1180, 820],
    [1280, 800],
    [1440, 900],
  ]) {
    await page.setViewportSize({ width: w, height: h });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `overflow ${w}`,
    );
    const canSplit = w >= 1100;
    await page.waitForFunction(
      (expected) =>
        [...document.querySelectorAll("button")].find(
          (b) => b.textContent.trim() === "Split view",
        )?.disabled === !expected,
      canSplit,
    );
    const region = page.getByRole("region", {
      name: "Layout Studio editor scrollable content",
      exact: true,
    });
    await region.focus();
    await region.press("End");
    assert(
      await region.evaluate(
        (e) => e.scrollHeight <= e.clientHeight || e.scrollTop > 0,
      ),
      `native pane scrolling ${w}`,
    );
    await region.press("Home");
    assert.equal(
      await page
        .getByRole("button", { name: "Split view", exact: true })
        .isEnabled(),
      canSplit,
    );
    await page.screenshot({
      path: `${out}/lattice-${w}x${h}.jpg`,
      type: "jpeg",
      quality: 80,
    });
    pass(`Responsive Lattice continuity and overflow ${w}x${h}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Apps", exact: true }).click();
  await page
    .locator("#lucia-mobile-app-list")
    .getByRole("button", { name: "Settings", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Control Center", exact: true })
    .waitFor();
  assert(
    await page.getByRole("radio", { name: theme, exact: true }).isChecked(),
  );
  await page
    .getByRole("button", { name: "Expand LUCIA Assistive Orb", exact: true })
    .click();
  await page
    .getByRole("region", { name: "LUCIA assistant information" })
    .getByRole("button", { name: /Lattice/ })
    .click();
  await page
    .getByRole("region", { name: "LUCIA assistant information" })
    .getByRole("link", { name: "Layouts ↗", exact: true })
    .click();
  await page.getByLabel("Search layouts", { exact: true }).waitFor();
  assert.equal(
    await page.getByLabel("Search layouts", { exact: true }).inputValue(),
    "school",
  );
  pass(
    "Mobile switcher and Orb launch preserve Settings and independent Lattice context",
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await open("/editor?websiteId=" + fixtures.foreign);
  await page
    .getByRole("status")
    .filter({ hasText: /not found|access denied/i })
    .waitFor();
  assert(
    await page
      .getByRole("button", { name: "Save draft", exact: true })
      .isDisabled(),
  );
  pass("Foreign tenant resource cannot be opened or saved");
  await open("/editor?websiteId=" + fixtures.siteA);
  await readyEditor();
  await page
    .getByLabel("Website name", { exact: true })
    .fill("Revoked draft must stay private");
  await admin`UPDATE organization_memberships SET status='revoked' WHERE user_id=${fixtures.a} AND organization_id=${fixtures.orgA}`;
  await page.reload();
  await page
    .getByRole("status")
    .filter({ hasText: /access denied|not found/i })
    .waitFor();
  assert.notEqual(await editorValue(), "Revoked draft must stay private");
  assert(
    await page
      .getByRole("button", { name: "Save draft", exact: true })
      .isDisabled(),
  );
  await admin`UPDATE organization_memberships SET status='active' WHERE user_id=${fixtures.a} AND organization_id=${fixtures.orgA}`;
  pass("Revoked membership prevents private draft restoration");
  await context.addCookies([
    { name: "lucia_os_session", value: fixtures.tokens.b, url: base },
  ]);
  await page.reload();
  await page
    .getByRole("status")
    .filter({ hasText: /access denied|not found/i })
    .waitFor();
  assert.notEqual(await editorValue(), "Revoked draft must stay private");
  assert.equal(
    await page.evaluate(
      (id) =>
        sessionStorage.getItem(`lucia.workspace.recovery.v2:${id}`) !== null,
      fixtures.b,
    ),
    true,
  );
  pass(
    "Account switch derives a separate recovery namespace from authenticated session",
  );
  assert.equal(errors.length, 0, errors.join("\n"));
  pass("No unhandled browser application errors");
  fs.writeFileSync(
    out + "/browser-acceptance.json",
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
