import {
  compositionRequestSchema,
  type CompositionDiagnostic,
  type CompositionRequest,
} from "./contracts";

export type NormalizeCompositionResult =
  | { ok: true; request: CompositionRequest; diagnostics: [] }
  | { ok: false; request: null; diagnostics: CompositionDiagnostic[] };

export function normalizePagePath(input: string): string | null {
  const path = input.trim();
  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("?") ||
    path.includes("#") ||
    path.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(path) ||
    /%(?:2f|5c)/i.test(path)
  ) return null;

  if (path === "/") return "/";
  const rawSegments = path.slice(1).split("/");
  if (rawSegments.at(-1) === "") rawSegments.pop();
  if (rawSegments.some((segment) => segment.length === 0)) return null;

  for (const segment of rawSegments) {
    if (!segment) continue;
    let decoded: string;
    try {
      decoded = decodeURIComponent(segment);
    } catch {
      return null;
    }
    if (
      decoded === "." ||
      decoded === ".." ||
      decoded.includes("/") ||
      decoded.includes("\\") ||
      /[\u0000-\u001f\u007f]/.test(decoded)
    ) return null;
  }

  if (path === "/") return "/";
  return path.replace(/\/+$/, "");
}

export function normalizeCompositionRequest(input: unknown): NormalizeCompositionResult {
  const parsed = compositionRequestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      request: null,
      diagnostics: parsed.error.issues.map((issue) => ({
        code: "INVALID_REQUEST",
        severity: "error",
        message: `${issue.path.join(".") || "request"}: ${issue.message}`,
      })),
    };
  }

  const diagnostics: CompositionDiagnostic[] = [];
  const requestKeys = new Set<string>();
  const pagePaths = new Set<string>();
  const pages = parsed.data.pages.map((page) => {
    const normalizedPath = normalizePagePath(page.path);
    if (normalizedPath === null) {
      diagnostics.push({
        code: "INVALID_PAGE_PATH",
        severity: "error",
        message: "Page paths must be absolute local paths without query strings, fragments, traversal segments or ambiguous separators.",
        pageKey: page.key,
      });
    }

    if (requestKeys.has(page.key)) {
      diagnostics.push({
        code: "DUPLICATE_REQUEST_KEY",
        severity: "error",
        message: `Duplicate composition request key: ${page.key}.`,
        requestKey: page.key,
        pageKey: page.key,
      });
    }
    requestKeys.add(page.key);

    if (normalizedPath !== null) {
      const canonicalPathKey = normalizedPath.toLocaleLowerCase("en-US");
      if (pagePaths.has(canonicalPathKey)) {
        diagnostics.push({
          code: "DUPLICATE_PAGE_PATH",
          severity: "error",
          message: `Page path conflicts with another requested page: ${normalizedPath}.`,
          pageKey: page.key,
        });
      }
      pagePaths.add(canonicalPathKey);
    }

    const sections = page.sections.map((section) => {
      if (requestKeys.has(section.key)) {
        diagnostics.push({
          code: "DUPLICATE_REQUEST_KEY",
          severity: "error",
          message: `Duplicate composition request key: ${section.key}.`,
          requestKey: section.key,
          pageKey: page.key,
          sectionKey: section.key,
        });
      }
      requestKeys.add(section.key);
      return section;
    });

    return { ...page, path: normalizedPath ?? page.path, sections };
  });

  if (diagnostics.length > 0) {
    return { ok: false, request: null, diagnostics };
  }

  return {
    ok: true,
    request: { ...parsed.data, pages },
    diagnostics: [],
  };
}
