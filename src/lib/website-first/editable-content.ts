import type { PremiumSection } from "@/lib/layout-blueprint/premium-composition";

/** Editable text follows the canonical section schema, not arbitrary DOM mutations. */
export type EditableField =
  | "heading" | "body" | "eyebrow" | "email"
  | "trust-item" | "service-title" | "service-body"
  | "project-title" | "project-description" | "action-label" | "media-title" | "media-description";

export type TextSelection = { field: EditableField; index?: number };

export function editableText(section: PremiumSection, selection: TextSelection): string | null {
  const { field, index } = selection;
  if (field === "trust-item" && section.type === "trust-strip" && index !== undefined)
    return section.items[index] ?? null;
  if ((field === "service-title" || field === "service-body") && section.type === "service-journey" && index !== undefined) {
    const item = section.items[index];
    return item ? item[field === "service-title" ? "title" : "body"] : null;
  }
  if ((field === "project-title" || field === "project-description") && section.type === "project-gallery" && index !== undefined) {
    const item = section.projects[index];
    return item ? item[field === "project-title" ? "title" : "description"] ?? "" : null;
  }
  if (field === "action-label" && section.type === "premium-hero") return section.action?.label ?? null;
  if (field === "eyebrow" && section.type === "premium-hero") return section.eyebrow;
  if (field === "email" && section.type === "contact-panel") return section.email ?? "";
  if (field === "media-title" && section.type === "media-embed") return section.title;
  if (field === "media-description" && section.type === "media-embed") return section.description ?? "";
  if (field === "heading" && "heading" in section) return section.heading;
  if (field === "body" && "body" in section) return section.body;
  return null;
}

export function editableTextMax(section: PremiumSection, field: EditableField): number {
  if (field === "trust-item" || field === "eyebrow") return 100;
  if (field === "action-label") return 50;
  if (field === "service-title" || field === "project-title") return 120;
  if (field === "service-body" || field === "project-description") return 500;
  if (field === "email") return 254;
  if (field === "media-title") return 120;
  if (field === "media-description") return 500;
  if (field === "heading") return section.type === "premium-hero" ? 160 : 150;
  if (field === "body") {
    if (section.type === "editorial-story") return 3000;
    if (section.type === "experience") return 2000;
    if (section.type === "contact-panel") return 1000;
    return 800;
  }
  return 3000;
}

export function replaceEditableText(section: PremiumSection, selection: TextSelection, value: string): PremiumSection {
  if (editableText(section, selection) === null) throw Error("This element cannot be edited directly.");
  const { field, index } = selection;
  if (value.length > editableTextMax(section, field)) throw Error("Text exceeds this Layout's limit.");
  if (field === "trust-item" && section.type === "trust-strip" && index !== undefined) {
    return { ...section, items: section.items.map((item, i) => i === index ? value : item) };
  }
  if (section.type === "service-journey" && index !== undefined && (field === "service-title" || field === "service-body")) {
    return { ...section, items: section.items.map((item, i) => i !== index ? item : { ...item, [field === "service-title" ? "title" : "body"]: value }) };
  }
  if (section.type === "project-gallery" && index !== undefined && (field === "project-title" || field === "project-description")) {
    return { ...section, projects: section.projects.map((item, i) => i !== index ? item : { ...item, [field === "project-title" ? "title" : "description"]: field === "project-description" && !value ? undefined : value }) };
  }
  if (field === "action-label" && section.type === "premium-hero" && section.action)
    return { ...section, action: { ...section.action, label: value } };
  if (field === "eyebrow" && section.type === "premium-hero") return { ...section, eyebrow: value };
  if (field === "email" && section.type === "contact-panel") return { ...section, email: value || undefined };
  if (field === "media-title" && section.type === "media-embed") return { ...section, title: value };
  if (field === "media-description" && section.type === "media-embed") return { ...section, description: value || undefined };
  if (field === "heading" && "heading" in section) return { ...section, heading: value };
  if (field === "body" && "body" in section) return { ...section, body: value };
  throw Error("This element cannot be edited directly.");
}

/** DOM selection follows rendered semantics, matching the canonical data rather than concatenated article text. */
export function targetFromRenderedElement(section: PremiumSection, target: HTMLElement, container: HTMLElement): TextSelection | null {
  const closest = (selector: string) => target.closest<HTMLElement>(selector);
  if (section.type === "trust-strip") {
    const li = closest("li");
    if (li && container.contains(li)) {
      const index = Array.from(li.parentElement?.children ?? []).indexOf(li);
      if (index >= 0 && index < section.items.length) return { field: "trust-item", index };
    }
  }
  if (section.type === "service-journey") {
    const li = closest("li");
    if (li && container.contains(li)) {
      const index = Array.from(li.parentElement?.children ?? []).indexOf(li);
      if (index >= 0 && index < section.items.length) {
        if (closest("h3")) return { field: "service-title", index };
        if (closest("p")) return { field: "service-body", index };
      }
    }
  }
  if (section.type === "project-gallery") {
    const article = closest("article");
    if (article && container.contains(article)) {
      const index = Array.from(article.parentElement?.children ?? []).indexOf(article);
      if (index >= 0 && index < section.projects.length) {
        if (closest("h3")) return { field: "project-title", index };
        if (closest("p")) return { field: "project-description", index };
      }
    }
  }
  if (section.type === "premium-hero" && closest(".layout-primary-action")) return { field: "action-label" };
  if (section.type === "media-embed" && closest("h1,h2")) return { field: "media-title" };
  if (section.type === "media-embed" && closest("p")) return { field: "media-description" };
  const text = target.textContent?.trim();
  if (!text) return null;
  for (const field of ["heading", "body", "eyebrow", "email"] as const) {
    if (editableText(section, { field }) === text) return { field };
  }
  return null;
}
