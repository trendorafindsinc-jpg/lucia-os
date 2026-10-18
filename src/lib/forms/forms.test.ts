import { describe, expect, it } from "vitest";
import { formDefinitionSchema, getNotificationPlan, initialContactForm, initialNotificationSettings, makeSubmission, validateSubmission } from "./forms";

describe("form definition", () => {
  it("accepts the starter contact form", () => {
    expect(formDefinitionSchema.safeParse(initialContactForm).success).toBe(true);
  });

  it("requires unique field IDs and select options", () => {
    expect(formDefinitionSchema.safeParse({ ...initialContactForm, fields: [initialContactForm.fields[0], { ...initialContactForm.fields[1], id: "full-name" }] }).success).toBe(false);
    expect(formDefinitionSchema.safeParse({ ...initialContactForm, fields: [{ id: "reason", label: "Reason", type: "select", required: true, options: [] }] }).success).toBe(false);
  });
});

describe("submission validation", () => {
  it("accepts valid values and trims them", () => {
    const result = validateSubmission(initialContactForm, { "full-name": " Ada ", "email-address": "ada@example.com", reason: "Services", message: " Hello " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.values["full-name"]).toBe("Ada");
  });

  it("rejects missing required fields, invalid email, and unknown field IDs", () => {
    expect(validateSubmission(initialContactForm, {}).success).toBe(false);
    expect(validateSubmission(initialContactForm, { "full-name": "Ada", "email-address": "not-email", reason: "Services", message: "Hello" }).success).toBe(false);
    expect(validateSubmission(initialContactForm, { "full-name": "Ada", "email-address": "ada@example.com", reason: "Services", message: "Hello", injected: "bad" }).success).toBe(false);
  });

  it("does not accept submissions for a disabled form", () => {
    expect(validateSubmission({ ...initialContactForm, enabled: false }, { "full-name": "Ada" }).success).toBe(false);
  });

  it("creates a schema-valid submission record", () => {
    const submission = makeSubmission(initialContactForm.id, { "full-name": "Ada" }, new Date("2026-01-01T00:00:00.000Z"));
    expect(submission.status).toBe("new");
    expect(submission.submittedAt).toBe("2026-01-01T00:00:00.000Z");
  });
});

describe("notification plan", () => {
  it("reports readiness but never claims email was sent", () => {
    const plan = getNotificationPlan({ ...initialContactForm, notificationEmail: "owner@example.com" }, initialNotificationSettings);
    expect(plan.ownerNotificationReady).toBe(true);
    expect(plan.sendsEmail).toBe(false);
  });
});
