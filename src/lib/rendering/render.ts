import "server-only";

import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { RenderResult } from "./contracts";
import { renderWebsiteElement, type RenderOptions } from "./render-core";

export type { RenderOptions } from "./render-core";

/** Node/server adapter retained for tests and non-App-Router HTML consumers. */
export async function renderWebsite(input: unknown, options: RenderOptions = {}): Promise<RenderResult> {
  const result = await renderWebsiteElement(input, options);
  if (!result.ok) return { ok: false, html: null, diagnostics: result.diagnostics };
  const document = h("html", { lang: "en" },
    h("head", null,
      h("meta", { charSet: "utf-8" }),
      h("meta", { name: "viewport", content: "width=device-width, initial-scale=1" }),
      h("meta", { name: "color-scheme", content: "light" }),
      h("title", null, result.title),
      h("style", { "data-lucia-foundation": "core@1" }, result.css),
    ),
    h("body", null, result.body),
  );
  return { ok: true, html: "<!doctype html>" + renderToStaticMarkup(document), diagnostics: [] };
}
