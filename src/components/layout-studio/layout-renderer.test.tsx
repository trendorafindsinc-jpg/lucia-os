import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { makeInitialDraft } from "@/lib/editor/site-draft";
import { siteDraftToLayoutBlueprint } from "@/lib/layout-blueprint/blueprint";
import { LayoutRenderer } from "./layout-renderer";
const blueprint=siteDraftToLayoutBlueprint(makeInitialDraft("northstar-consulting"));

describe("independent workspace preview anchors",()=>{
  it("namespaces previews and keeps their links in the same app",()=>{
    const a=renderToStaticMarkup(<LayoutRenderer blueprint={blueprint} preview idPrefix="pane-a-" />);
    const b=renderToStaticMarkup(<LayoutRenderer blueprint={blueprint} preview idPrefix="pane-b-" />);
    expect(a).toContain('id="pane-a-contact"');expect(a).toContain('href="#pane-a-contact"');
    expect(b).toContain('id="pane-b-contact"');expect(b).not.toContain('href="#pane-a-contact"');
    expect(a).not.toContain('<main');
  });
  it("preserves published page anchors and its main landmark",()=>{
    const html=renderToStaticMarkup(<LayoutRenderer blueprint={blueprint} idPrefix="ignored-on-public-sites-" />);
    expect(html).toContain('<main class="layout-site');
    expect(html).toContain('id="contact"');expect(html).toContain('href="#contact"');
    expect(html).not.toContain('ignored-on-public-sites-');
  });
});
