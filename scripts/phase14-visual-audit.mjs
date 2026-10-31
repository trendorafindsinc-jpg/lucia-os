#!/usr/bin/env node
/** Manual Phase 14 browser screenshot audit. Uses the real shared renderer
 * through a development-only review route. Does NOT award design scores.
 * Setup: npm install --no-save playwright && npx playwright install chromium
 * Start: npm run dev
 * Run: node scripts/phase14-visual-audit.mjs [--ids=meridian,canvas]
 */
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

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
try { playwright = await import(process.env.PHASE14_PLAYWRIGHT_MODULE || "playwright"); }
catch { throw Error("Install Playwright locally: npm install --no-save playwright && npx playwright install chromium"); }
const require = createRequire(import.meta.url);
const axePath = process.env.PHASE14_AXE_SCRIPT || require.resolve("axe-core/axe.min.js");
const axeSource = await readFile(axePath, "utf8");
async function fingerprint() {
  const sourceHash = createHash("sha256");
  for (const file of execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "src", "public", "scripts", "package.json", "package-lock.json", "next.config.ts"], { encoding: "utf8" }).trim().split("\n").sort()) {
    sourceHash.update(file).update("\0").update(await readFile(file)).update("\0");
  }
  return sourceHash.digest("hex");
}
const testedSource = await fingerprint();
const testedCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const browser = await playwright.chromium.launch({ headless: true,
  ...(process.env.PHASE14_CHROMIUM ? { executablePath: process.env.PHASE14_CHROMIUM,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"] } : {}),
});
const records = [];
let failed = false;
const completed = [];
let progressWrite = Promise.resolve();
async function captureTarget(entry) {
    const id = entry.id.replace("lucia.layout.", "");
    const interior = entry.pageInventory.find((value) => value !== "/");
    for (const pageRoute of ["/", interior].filter(Boolean)) {
      for (const viewport of viewports) {
        const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1, reducedMotion: "reduce" });
        const issues = [];
        const networkFailures = [];
        page.on("pageerror", (error) => issues.push("JavaScript: " + error.message));
        page.on("requestfailed", (request) => networkFailures.push({ url: request.url(), reason: request.failure()?.errorText }));
        await page.addInitScript(() => {
          window.__phase14Vitals = { cls: 0, lcp: null };
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__phase14Vitals.cls += entry.value;
          }).observe({ type: "layout-shift", buffered: true });
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) window.__phase14Vitals.lcp = entry.startTime;
          }).observe({ type: "largest-contentful-paint", buffered: true });
        });
        const url = base + "/phase14-review/" + id + (pageRoute === "/" ? "" : pageRoute);
        try {
          const response = await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
          if (response?.status() !== 200) issues.push("HTTP " + (response?.status() ?? "unknown"));
          // Lazy loading is not a broken asset. Decode all real registered images
          // before retaining the same completeness/natural-width assertions.
          await page.evaluate(async () => {
            const images = [...document.querySelectorAll(".premium-layout img")];
            await Promise.race([
              Promise.allSettled(images.map((image) => { image.loading = "eager"; return image.decode(); })),
              new Promise((_, reject) => setTimeout(() => reject(Error("Image decoding timed out")), 15000)),
            ]);
          });
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
          const diagnostics = await page.evaluate(() => ({
            sections: [...document.querySelectorAll("[data-section-type]")].map((node) => ({ type: node.dataset.sectionType, variant: node.dataset.variant, width: node.getBoundingClientRect().width, display: getComputedStyle(node).display, columns: getComputedStyle(node).gridTemplateColumns })),
            navigation: [...document.querySelectorAll('.premium-layout nav a')].map((node) => ({ label: node.textContent, href: node.getAttribute('href') })),
            images: [...document.querySelectorAll('.premium-layout img')].map((node) => ({ source: node.getAttribute('data-asset-ref'), width: node.naturalWidth, height: node.naturalHeight, alt: node.alt })),
            performance: { ...window.__phase14Vitals, navigation: performance.getEntriesByType('navigation').map((entry) => ({ domContentLoadedMs: entry.domContentLoadedEventEnd, transferBytes: entry.transferSize })), resources: performance.getEntriesByType('resource').map((entry) => ({ url: entry.name, bytes: entry.transferSize, durationMs: entry.duration, type: entry.initiatorType })) },
          }));
          let accessibility = null;
          if (viewport.width === 390 || viewport.width === 1440) {
            await page.addScriptTag({ content: axeSource });
            accessibility = await page.evaluate(async () => {
              const result = await window.axe.run('.premium-layout', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
              return { engine: result.testEngine, passes: result.passes.length,
                violations: result.violations.map(({ id, impact, description, helpUrl, nodes }) => ({ id, impact, description, helpUrl, nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })) })),
                incomplete: result.incomplete.map(({ id, nodes }) => ({ id, targets: nodes.map(({ target }) => target) })) };
            });
            for (const violation of accessibility.violations) if (['serious', 'critical'].includes(violation.impact)) issues.push('Accessibility: ' + violation.id);
          }
          if (viewport.width < 900) {
            const toggle = page.locator(".premium-mobile-menu summary");
            if (await toggle.count()) {
              await toggle.click();
              if (!await page.locator(".premium-mobile-menu[open]").count()) issues.push("Mobile menu failed");
              await toggle.click();
              await page.keyboard.press("Tab");
              await toggle.focus();
              const focus = await toggle.evaluate((node) => ({ outline: getComputedStyle(node).outlineStyle, width: getComputedStyle(node).outlineWidth }));
              if (focus.outline === "none" || parseFloat(focus.width) === 0) issues.push("Menu focus indicator missing");
              await toggle.press("Enter");
              if (!await page.locator(".premium-mobile-menu[open]").count()) issues.push("Keyboard menu open failed");
              await toggle.press("Enter");
              if (await page.locator(".premium-mobile-menu[open]").count()) issues.push("Keyboard menu close failed");
              await toggle.evaluate((node) => node.blur());
            }
          }
          const file = id + "-" + (pageRoute === "/" ? "home" : pageRoute.slice(1).replaceAll("/", "_")) + "-" + viewport.name + ".png";
          await page.screenshot({ path: path.join(directory, file), fullPage: true });
          records.push({ id, pageRoute, viewport: viewport.name, screenshot: file, issues, diagnostics, accessibility, networkFailures, rubricScore: null, visualReviewed: false });
        } catch (error) {
          issues.push("Browser: " + String(error));
          records.push({ id, pageRoute, viewport: viewport.name, issues, rubricScore: null, visualReviewed: false });
        } finally {
          if (issues.length) failed = true;
          await page.close();
        }
      }
    }
    completed.push(id);
    progressWrite = progressWrite.then(() => writeFile(path.join(directory, "progress.json"), JSON.stringify({ testedCommit, testedSource, completedLayouts: completed, records }, null, 2) + "\n"));
    await progressWrite;
    console.log("Captured " + id + ": " + records.filter((record) => record.id === id).length + " page/viewport checks");
}
try {
  const concurrency = Number(process.env.PHASE14_BROWSER_CONCURRENCY || 1);
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4) throw Error("Browser concurrency must be 1–4");
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, targets.length) }, async () => {
    while (next < targets.length) await captureTarget(targets[next++]);
  }));
} finally { await browser.close(); }
const sourceChangedDuringRun = testedSource !== await fingerprint();
if (sourceChangedDuringRun) failed = true;
const report = {
  createdAt: new Date().toISOString(), testedCommit, testedSource, sourceChangedDuringRun,
  environment: "Local Chromium emulation of development-only real renderer; not authenticated publishing, live OAuth, production CWV or physical-device acceptance",
  candidateCount: targets.length,
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
