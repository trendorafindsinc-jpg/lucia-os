import { describe, expect, it } from "vitest";
import { makeInitialDraft } from "@/lib/editor/site-draft";
import {
  mutateWebsite, websiteMutationSchema, websiteDefinitionSchema,
} from "./website-definition";
import { checkPremiumPublishContacts } from "./premium-publish-readiness";
import { premiumFlagshipIds } from "./premium-layouts/catalogue-candidates";
import { premiumLayoutSchema } from "./premium-composition";

describe("Phase 14 safe contact configuration before public promotion", () => {
  it.each(premiumFlagshipIds)(
    "%s: refuses starter contact, propagates one authorized edit and then permits publication",
    (id) => {
      const initial = makeInitialDraft("northstar-consulting");
      const candidate = premiumLayoutSchema.parse(mutateWebsite(
        initial, websiteMutationSchema.parse({ kind: "assign-layout", layoutId: id }),
      ));
      const blocked = checkPremiumPublishContacts(candidate);
      expect(blocked.ready).toBe(false);
      const page = candidate.pages.find((p) =>
        p.sections.some((s) => s.type === "contact-panel" && s.email),
      );
      const contact = page?.sections.find(
        (s) => s.type === "contact-panel" && s.email,
      );
      if (!page || contact?.type !== "contact-panel")
        throw Error("Every flagship needs an editable contact");
      const updated = premiumLayoutSchema.parse(mutateWebsite(
        candidate, websiteMutationSchema.parse({
          kind: "composition-edit", mode: "guided",
          edits: [{
            kind: "replace-section",
            pageId: page.id,
            section: { ...contact, email: "enquiries@business.ng" },
          }],
        }),
      ));
      const stored = premiumLayoutSchema.parse(
        websiteDefinitionSchema.parse(JSON.parse(JSON.stringify(updated))),
      );
      expect(checkPremiumPublishContacts(stored)).toEqual({ ready: true });
      const contacts = stored.pages.flatMap((p) =>
        p.sections.filter((s) => s.type === "contact-panel"),
      );
      expect(contacts.every((c) =>
        c.type === "contact-panel" && c.email === "enquiries@business.ng",
      )).toBe(true);
      expect(checkPremiumPublishContacts(candidate).ready).toBe(false);
      expect(() => mutateWebsite(updated, initial)).toThrow();
    },
  );

  it("rejects unconfigured contact and accepts existing nonflagship definitions unchanged", () => {
    const value = premiumLayoutSchema.parse(mutateWebsite(
      makeInitialDraft("northstar-consulting"),
      websiteMutationSchema.parse({
        kind: "assign-layout", layoutId: "lucia.layout.canvas",
      }),
    ));
    for (const page of value.pages) {
      for (const section of page.sections) {
        if (section.type === "contact-panel") section.email = undefined;
      }
    }
    expect(checkPremiumPublishContacts(value).ready).toBe(false);
  });
});
