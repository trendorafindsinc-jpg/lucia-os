import { z } from "zod";

export const formFieldTypes = ["text", "email", "phone", "textarea", "select", "consent"] as const;
export type FormFieldType = (typeof formFieldTypes)[number];

export const formFieldSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,40}$/),
  label: z.string().trim().min(1).max(80),
  type: z.enum(formFieldTypes),
  required: z.boolean(),
  options: z.array(z.string().trim().min(1).max(80)).max(20),
}).strict().superRefine((field, context) => {
  if (field.type === "select" && field.options.length < 1) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["options"], message: "Select fields need at least one option." });
  }
  if (field.type !== "select" && field.options.length > 0) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["options"], message: "Only select fields can have options." });
  }
});

export const formDefinitionSchema = z.object({
  id: z.string().regex(/^form-[a-z0-9-]{1,40}$/),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(240),
  submitLabel: z.string().trim().min(2).max(40),
  successMessage: z.string().trim().min(2).max(200),
  notificationEmail: z.union([z.literal(""), z.string().trim().email().max(254)]),
  enabled: z.boolean(),
  fields: z.array(formFieldSchema).min(1).max(20),
}).strict().superRefine((form, context) => {
  const ids = form.fields.map((field) => field.id);
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["fields"], message: "Form field IDs must be unique." });
  }
});

export const formSubmissionSchema = z.object({
  id: z.string().regex(/^submission-[a-z0-9-]{1,48}$/),
  formId: z.string().regex(/^form-[a-z0-9-]{1,40}$/),
  submittedAt: z.string().datetime(),
  values: z.record(z.string(), z.string().max(5000)).refine((values) => Object.keys(values).length <= 20),
  status: z.enum(["new", "reviewed", "archived"]),
}).strict();

export const notificationSettingsSchema = z.object({
  notifyOnSubmission: z.boolean(),
  recipientEmail: z.union([z.literal(""), z.string().trim().email().max(254)]),
  sendVisitorConfirmation: z.boolean(),
  confirmationSubject: z.string().trim().max(120),
  confirmationMessage: z.string().trim().max(1000),
}).strict();

export type FormDefinition = z.infer<typeof formDefinitionSchema>;
export type FormSubmission = z.infer<typeof formSubmissionSchema>;
export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;

export const initialContactForm: FormDefinition = {
  id: "form-contact",
  name: "Contact form",
  description: "Give visitors a simple way to get in touch.",
  submitLabel: "Send message",
  successMessage: "Thanks for getting in touch. Your message has been received in this demo.",
  notificationEmail: "",
  enabled: true,
  fields: [
    { id: "full-name", label: "Your name", type: "text", required: true, options: [] },
    { id: "email-address", label: "Email address", type: "email", required: true, options: [] },
    { id: "reason", label: "What can we help with?", type: "select", required: true, options: ["General enquiry", "Services", "Partnership"] },
    { id: "message", label: "Your message", type: "textarea", required: true, options: [] },
  ],
};

export const initialNotificationSettings: NotificationSettings = {
  notifyOnSubmission: true,
  recipientEmail: "",
  sendVisitorConfirmation: false,
  confirmationSubject: "We received your message",
  confirmationMessage: "Thank you for contacting us. We will get back to you as soon as we can.",
};

export function validateSubmission(form: FormDefinition, values: Record<string, string>) {
  if (!form.enabled) return { success: false as const, message: "This form is not accepting submissions." };
  const knownIds = new Set(form.fields.map((field) => field.id));
  if (Object.keys(values).some((key) => !knownIds.has(key))) {
    return { success: false as const, message: "Submission contains an unknown field." };
  }
  for (const field of form.fields) {
    const value = (values[field.id] ?? "").trim();
    if (field.required && !value) return { success: false as const, message: `${field.label} is required.` };
    if (field.type === "email" && value && !z.string().email().safeParse(value).success) {
      return { success: false as const, message: "Enter a valid email address." };
    }
    if (field.type === "select" && value && !field.options.includes(value)) {
      return { success: false as const, message: `Choose a valid option for ${field.label}.` };
    }
    if (field.type === "consent" && field.required && value !== "yes") {
      return { success: false as const, message: "Consent is required to continue." };
    }
  }
  return { success: true as const, values: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()])) };
}

export function makeSubmission(formId: string, values: Record<string, string>, now = new Date()): FormSubmission {
  return formSubmissionSchema.parse({
    id: `submission-${now.getTime().toString(36)}`,
    formId,
    submittedAt: now.toISOString(),
    values: { ...values },
    status: "new",
  });
}

export function getNotificationPlan(form: FormDefinition, settings: NotificationSettings) {
  const recipient = settings.recipientEmail.trim() || form.notificationEmail.trim();
  return {
    ownerNotificationReady: settings.notifyOnSubmission && z.string().email().safeParse(recipient).success,
    visitorConfirmationConfigured: settings.sendVisitorConfirmation && Boolean(settings.confirmationSubject.trim()) && Boolean(settings.confirmationMessage.trim()),
    sendsEmail: false as const,
    note: "Email delivery is not connected in this prototype. No messages are sent.",
  };
}
