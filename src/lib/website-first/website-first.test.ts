import { describe, expect, it } from "vitest";
import { allCanonicalWebsiteLayouts, recommendWebsiteLayouts } from "./recommendations";
import { deriveOrganizationType, deriveWebsiteSlug, websiteFirstSetupSchema } from "./setup";

describe("website-first creation contract", () => {
  it("has all 48 unique premium Layouts", () => {
    const layouts = allCanonicalWebsiteLayouts();
    expect(layouts).toHaveLength(48);
    expect(new Set(layouts.map((l) => l.id)).size).toBe(48);
  });
  it("recommends relevant service and school designs", () => {
    expect(recommendWebsiteLayouts("I run a barbershop", "Get enquiries or bookings").map((l) => l.id))
      .toEqual(["lucia.layout.local", "lucia.layout.care", "lucia.layout.motion"]);
    expect(recommendWebsiteLayouts("School", "Introduce my organisation")[0].id).toBe("lucia.layout.academia");
  });
  it("provides a safe deterministic fallback", () => {
    const results = recommendWebsiteLayouts("A new business", "Introduce my organisation");
    expect(results).toHaveLength(3);
    expect(results[0].id).toBe("lucia.layout.meridian");
    expect(results.every((r) => Boolean(r.reason))).toBe(true);
  });
  it("validates three required answers and skips optional fields", () => {
    const input = { kind: "website-first", websiteName: "Mile Studio", whatDoYouDo: "Barbershop",
      purpose: "Get enquiries or bookings", layoutId: "lucia.layout.local" };
    expect(websiteFirstSetupSchema.safeParse(input).success).toBe(true);
    expect(websiteFirstSetupSchema.safeParse({ ...input, whatDoYouDo: "" }).success).toBe(false);
    expect(websiteFirstSetupSchema.safeParse({ ...input, layoutId: "fake" }).success).toBe(false);
    expect(websiteFirstSetupSchema.safeParse({ ...input, layoutId: "northstar-consulting" }).success).toBe(true);
    expect(websiteFirstSetupSchema.safeParse({ ...input, contact: "not a phone or email" }).success).toBe(false);
    expect(websiteFirstSetupSchema.safeParse({ ...input, contact: "hello@example.com" }).success).toBe(true);
  });
  it("derives reproducible scoped slugs and categories", () => {
    expect(deriveWebsiteSlug("My Barbershop", "account-a")).toBe(deriveWebsiteSlug("My Barbershop", "account-a"));
    expect(deriveWebsiteSlug("My Barbershop", "account-b")).not.toBe(deriveWebsiteSlug("My Barbershop", "account-a"));
    expect(deriveOrganizationType("School and tutoring")).toBe("School or education");
  });
});
