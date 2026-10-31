import { describe, expect, it } from "vitest";
import { makeInitialDraft } from "@/lib/editor/site-draft";
import { mutateWebsite, websiteMutationSchema } from "./website-definition";
import {
  applyPremiumEdit,
  parsePremiumLayout,
  premiumEditSchema,
} from "./premium-composition";
import { checkPremiumPublishContacts } from "./premium-publish-readiness";
import { premiumCandidateIds } from "./premium-layouts/catalogue-candidates";

function candidate(id: (typeof premiumCandidateIds)[number]) {
  return parsePremiumLayout(mutateWebsite(
    makeInitialDraft("northstar-consulting"),
    websiteMutationSchema.parse({ kind: "assign-layout", layoutId: id }),
  ));
}

describe("Phase 16 personalization across all 48 original Layout identities", () => {
  it.each(premiumCandidateIds)("%s: durable identity, shared contacts, safe page content and real artwork", (id) => {
    const original = candidate(id);
    const originalPages = structuredClone(original.pages);
    const edits = [
      { kind: "business-detail", field: "description", value: "A real business operated locally." },
      { kind: "business-detail", field: "tagline", value: "Built with care." },
      { kind: "business-detail", field: "contactEmail", value: "hello@mybusiness.ng" },
      { kind: "business-detail", field: "phone", value: "+234 801 234 5678" },
      { kind: "business-detail", field: "address", value: "24 Test Avenue, Lagos" },
      { kind: "business-detail", field: "serviceArea", value: "Nigeria" },
      { kind: "business-detail", field: "enquiryEmail", value: "enquiries@mybusiness.ng" },
      { kind: "business-social", network: "instagram", value: "https://instagram.com/mybusiness" },
      { kind: "business-logo", src: "builtin:premium/business", alt: "Our brand artwork" },
    ] as const;
    const personalized = edits.reduce(
      (draft, edit) => applyPremiumEdit(draft, "guided", premiumEditSchema.parse(edit)),
      original,
    );
    const stored = parsePremiumLayout(JSON.parse(JSON.stringify(personalized)));
    expect(stored.layoutId).toBe(id);
    expect(stored.pages.map(p => p.path)).toEqual(original.pages.map(p => p.path));
    expect(stored.identity.description).toBe("A real business operated locally.");
    expect(stored.identity.profile?.logo?.src).toBe("builtin:premium/business");
    expect(stored.identity.profile?.enquiryEmail).toBe("enquiries@mybusiness.ng");
    expect(stored.identity.profile?.social?.instagram).toBe("https://instagram.com/mybusiness");
    expect(stored.pages.every((page, i) => page.sections.every((section, j) => {
      const before = originalPages[i].sections[j];
      if (section.type === "contact-panel") return section.email === "enquiries@mybusiness.ng";
      return JSON.stringify(section) === JSON.stringify(before);
    }))).toBe(true);
    expect(checkPremiumPublishContacts(stored)).toEqual({ ready: true });
    expect(checkPremiumPublishContacts(original).ready).toBe(false);
    const page = stored.pages.find(p => p.sections.some(s => "heading" in s));
    const section = page?.sections.find(s => "heading" in s);
    if (!page || !section || !("heading" in section)) throw Error("Missing editable section");
    const updated = applyPremiumEdit(stored, "guided", {
      kind: "replace-section", pageId: page.id,
      section: { ...section, heading: "An updated business section" },
    });
    expect(updated.pages.find(p => p.id === page.id)?.sections.find(s => s.id === section.id)).toMatchObject({
      heading: "An updated business section",
    });
    expect(original.pages.find(p => p.id === page.id)?.sections.find(s => s.id === section.id))
      .not.toMatchObject({ heading: "An updated business section" });
    expect(stored.pages.map(p => p.path)).toEqual(updated.pages.map(p => p.path));
  });

  it("rejects unsupported HTML, insecure social links, invalid contact details and foreign assets", () => {
    const layout = candidate("lucia.layout.meridian");
    const edit = (field: "description" | "phone" | "enquiryEmail", value: string) =>
      applyPremiumEdit(layout, "guided", { kind: "business-detail", field, value });
    expect(() => edit("description", "<script>alert(1)</script>")).toThrow();
    expect(() => edit("enquiryEmail", "not-an-email")).toThrow();
    expect(() => edit("phone", "javascript:alert(1)")).toThrow();
    expect(() => applyPremiumEdit(layout, "guided", {
      kind: "business-social", network: "facebook", value: "http://example.com/",
    })).toThrow();
    expect(() => applyPremiumEdit(layout, "guided", {
      kind: "business-social", network: "x", value: "https://user:pass@example.com",
    })).toThrow();
    expect(() => applyPremiumEdit(layout, "guided", {
      kind: "business-logo", src: "https://attacker.example/pic.png", alt: "Unapproved" ,
    })).toThrow();
    expect(() => premiumEditSchema.parse({
      kind: "business-logo", src: null, alt: "orphaned",
    })).toThrow();
    const added = applyPremiumEdit(layout, "guided", {
      kind: "business-logo", src: "builtin:premium/business", alt: "Logo",
    });
    const removed = applyPremiumEdit(added, "guided", {
      kind: "business-logo", src: null, alt: null,
    });
    expect(removed.identity.profile?.logo).toBeUndefined();
  });

  it("keeps deliberately different page titles intact when the brand name changes", () => {
    const layout = candidate("lucia.layout.haven");
    const before = layout.pages.map(p => p.title);
    const updated = applyPremiumEdit(layout, "guided", {
      kind: "brand", name: "Brighter Hospitality",
    });
    expect(updated.identity.name).toBe("Brighter Hospitality");
    expect(updated.pages.map((p, i) => before[i] === layout.identity.name ? "Brighter Hospitality" :
        before[i].endsWith(" — " + layout.identity.name) ?
          before[i].slice(0, -layout.identity.name.length) + "Brighter Hospitality" : before[i]))
      .toEqual(updated.pages.map(p => p.title));
  });
});
