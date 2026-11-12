import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LATTICE_APPS, describeDesktopApp } from "@/lib/workspace/desktop";
import { LatticeLauncher } from "./lattice-launcher";

describe("Lattice entry points",()=>{
  it("lists only implemented split-capable apps",()=>{
    expect(LATTICE_APPS.map(app=>app.label)).toEqual(["Layout Studio","Layouts"]);
    for(const app of LATTICE_APPS)expect(describeDesktopApp(app.href)?.appKey).toBe(app.key);
  });
  it("starts collapsed with a supported-app list and real workspace destinations",()=>{
    const html=renderToStaticMarkup(<LatticeLauncher />);
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('hidden=""');
    expect(html).toContain('aria-label="Apps supported by Lattice"');
    expect(html).toContain('/workspace/desktop?app=%2Feditor');
    expect(html).toContain('/workspace/desktop?app=%2Ftemplates');
    expect(html).not.toContain('Room for your next idea');
  });
});
