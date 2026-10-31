#!/usr/bin/env node
/** Manual Phase 14 browser screenshot audit. Uses the real shared renderer
 * through a development-only review route. Does NOT award design scores.
 * Setup: npm install --no-save playwright && npx playwright install chromium
 * Start: npm run dev
 * Run: node scripts/phase14-visual-audit.mjs [--ids=meridian,canvas]
 */
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const arg = process.argv.find((value) => value.startsWith("--ids="));
const filter = arg ? new Set(arg.slice(6).split(",")) : null;
const base = (process.env.PHASE14_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const origin = new URL(base);
if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(origin.hostname))
  throw Error("The review route is development-only and must be used on localhost");
const inventory = JSON.parse(await readFile("docs/phase-14-layout-inventory.json", "utf8"));
const targets = inventory.layouts.filter((item) => !filter || filter.has(item.id.replace("lucia.layout.", "")));
if (!targets.length) throw Error("No matching Layout candidates");
const viewports = [
  { name: "phone-320", width: 320, height: 720 },
  { name: "phone-390", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "landscape", width: 1180, height: 820 },
  { name: "desktop", width: 1440, height: 900 },
];
const directory = path.resolve(process.env.PHASE14_EVIDENCE_DIR || "artifacts/phase14-visual");
await mkdir(directory, { recursive: true });
let playwright;
try { playwright = await import("playwright"); }
catch { throw Error("Install Playwright locally: npm install --no-save playwright && npx playwright install chromium"); }
const browser = await playwright.chromium.launch({ headless: true });
const records = [];
let failed = false;
try {
  for (const entry of targets) {
    const id = entry.id.replace("lucia.layout.", "");
    const interior = entry.pageInventory.find((value) => value !== "/");
    for (const pageRoute of ["/", interior].filter(Boolean)) {
      for (const viewport of viewports) {
        const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1, reducedMotion: "reduce" });
        const issues = [];
        page.on("pageerror", (error) => issues.push("JavaScript: " + error.message));
        const url = base + "/phase14-review/" + id + (pageRoute === "/" ? "" : pageRoute);
        try {
          const response = await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
          if (response?.status() !== 200) issues.push("HTTP " + (response?.status() ?? "unknown"));
          const check = await page.evaluate(() => ({
            viewport: window.innerWidth,
            bodyWidth: document.documentElement.scrollWidth,
            h1Count: document.querySelectorAll(".premium-layout h1").length,
            renderer: Boolean(document.querySelector(".premium-layout")),
            brokenImages: Array.from(document.querySelectorAll(".premium-layout img")).filter((image) => !image.complete || image.naturalWidth === 0).length,
            emptyLinks: document.querySelectorAll('.premium-layout a[href=""], .premium-layout a[href="#"]').length,
          }));
          if (!check.renderer) issues.push("Production renderer missing");
          if (check.bodyWidth > check.viewport + 1) issues.push("Horizontal overflow: " + check.bodyWidth);
          if (check.h1Count !== 1) issues.push("Expected one H1, saw " + check.h1Count);
          if (check.brokenImages) issues.push("Broken image count: " + check.brokenImages);
          if (check.emptyLinks) issues.push("Empty link count: " + check.emptyLinks);
          if (viewport.width < 900) {
            const toggle = page.locator(".premium-mobile-menu summary");
            if (await toggle.count()) {
              await toggle.click();
              if (!await page.locator(".premium-mobile-menu[open]").count()) issues.push("Mobile menu failed");
              await toggle.click();
            }
          }
          const file = id + "-" + (pageRoute === "/" ? "home" : pageRoute.slice(1).replaceAll("/", "_")) + "-" + viewport.name + ".png";
          await page.screenshot({ path: path.join(directory, file), fullPage: true });
          records.push({ id, pageRoute, viewport: viewport.name, screenshot: file, issues, rubricScore: null, visualReviewed: false });
        } catch (error) {
          issues.push("Browser: " + String(error));
          records.push({ id, pageRoute, viewport: viewport.name, issues, rubricScore: null, visualReviewed: false });
        } finally {
          if (issues.length) failed = true;
          await page.close();
        }
      }
    }
  }
} finally { await browser.close(); }
const report = {
  createdAt: new Date().toISOString(), candidateCount: targets.length,
  screenshotCount: records.filter((record) => record.screenshot).length,
  automatedFailures: records.filter((record) => record.issues.length > 0).length,
  visualAcceptance: "UNREVIEWED: manual screenshot review and 40-point scoring mandatory",
  records,
};
await writeFile(path.join(directory, "results.json"), JSON.stringify(report, null, 2) + "\n");
process.stdout.write(JSON.stringify({
  candidates: report.candidateCount, screenshots: report.screenshotCount,
  automatedFailures: report.automatedFailures, output: directory,
}, null, 2) + "\n");
if (failed) process.exitCode = 1;
