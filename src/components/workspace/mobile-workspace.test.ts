import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Phase 4 mobile workspace contract", () => {
  const shell = readFileSync(new URL("./workspace-tab-shell.tsx", import.meta.url), "utf8");
  const theme = readFileSync(new URL("../../styles/phase-3-blue-glass.css", import.meta.url), "utf8");
  const orb = readFileSync(new URL("./assistive-orb.tsx", import.meta.url), "utf8");
  const orbStyles = readFileSync(new URL("./assistive-orb.module.css", import.meta.url), "utf8");

  it("uses the same validated workspace tabs rather than a separate mobile store", () => {
    expect(shell).toContain('className="lucia-mobile-switcher"');
    expect(shell).toContain("tabs.map((tab) =>");
    expect(shell).toContain("onClick={() => activateTab(tab)}");
    expect(shell).toContain("isSafeWorkspaceTabHref(tab.href)");
  });

  it("exposes switcher state and keeps its list hidden when collapsed", () => {
    expect(shell).toContain("aria-expanded={mobileSwitcherOpen}");
    expect(shell).toContain('aria-controls="lucia-mobile-app-list"');
    expect(shell).toContain("hidden={!mobileSwitcherOpen}");
    expect(shell).toContain("setMobileSwitcherOpen(false)");
  });

  it("shows the phone switcher and hides desktop tabs only at mobile widths", () => {
    expect(theme).toContain("@media (max-width: 680px)");
    expect(theme).toContain(".workspace-tabbar { display: none !important; }");
    expect(theme).toContain(".lucia-mobile-app-list[hidden] { display: none; }");
    expect(theme).toContain("safe-area-inset-left");
  });

  it("supports keyboard Escape and safe-area mobile Orb panel sizing", () => {
    expect(orb).toContain('event.key === "Escape"');
    expect(orb).toContain("orbRef.current?.focus()");
    expect(orbStyles).toContain(".panel[hidden] { display: none; }");
    expect(orbStyles).toContain("max-height: min(65dvh,520px)");
  });
});
