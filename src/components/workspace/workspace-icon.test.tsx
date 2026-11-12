import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WORKSPACE_APPS } from "@/lib/workspace/app-registry";
import { WorkspaceIcon } from "./workspace-icon";

describe("shared workspace icon rendering", () => {
  it("renders each registered app as a scalable, decorative SVG", () => {
    for (const app of WORKSPACE_APPS) {
      const markup=renderToStaticMarkup(<WorkspaceIcon icon={app.icon} />);
      expect(markup).toContain('<svg aria-hidden="true" viewBox="0 0 32 32"');
      expect(markup).toContain('stroke="currentColor"');
      expect(markup).not.toContain('<text');
    }
  });
  it("retains distinct app artwork and real Settings and dock icons", () => {
    const icons=WORKSPACE_APPS.map(app=>renderToStaticMarkup(<WorkspaceIcon icon={app.icon} />));
    expect(new Set(icons).size).toBe(WORKSPACE_APPS.length);
    for(const icon of ["settings","home","activity","more","domains","organizations"] as const) {
      expect(renderToStaticMarkup(<WorkspaceIcon icon={icon} />)).toContain('</svg>');
    }
  });
});
