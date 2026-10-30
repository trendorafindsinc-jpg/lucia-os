import { z } from "zod";

export const supportCaseInputSchema = z.object({
  organizationId: z.string().uuid(),
  subject: z.string().trim().min(3).max(180),
  body: z.string().trim().min(1).max(12000).optional(),
  category: z.enum(["general", "account", "website", "publishing", "billing", "security", "abuse", "other"]).default("general"),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
});

export const supportMessageInputSchema = z.object({
  body: z.string().trim().min(1).max(12000),
});

export const supportCaseTransitionSchema = z.object({
  status: z.enum(["open", "in_progress", "waiting_on_customer", "waiting_on_staff", "resolved", "closed"]),
});

export const supportCaseAssignmentSchema = z.object({
  staffUserId: z.string().uuid().nullable(),
});

export type SupportCaseInput = z.infer<typeof supportCaseInputSchema>;
export type SupportMessageInput = z.infer<typeof supportMessageInputSchema>;
export type SupportCaseTransition = z.infer<typeof supportCaseTransitionSchema>;
export type SupportCaseAssignment = z.infer<typeof supportCaseAssignmentSchema>;
