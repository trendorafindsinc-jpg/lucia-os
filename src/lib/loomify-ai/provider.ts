import { z } from "zod";
import { loomBlueprintSchema, type LoomBlueprint } from "@/lib/loom/blueprint";

export const loomifyAIBriefSchema = z.string().trim().min(20, "Describe the website in a little more detail.").max(4_000, "Keep the website brief under 4,000 characters.");

export type loomifyAIProvider = {
  /** Stable provider adapter identifier for diagnostics, not customer-facing model branding. */
  readonly id: string;
  /** Return untrusted structured data. The engine validates it before any save or render. */
  generateBlueprint(input: { brief: string; signal: AbortSignal }): Promise<unknown>;
};

export type loomifyAIErrorCode = "invalid_brief" | "provider_unavailable" | "timeout" | "invalid_blueprint";

export class loomifyAIError extends Error {
  constructor(readonly code: loomifyAIErrorCode, message: string) {
    super(message);
    this.name = "loomifyAIError";
  }
}

export type loomifyAIProposal = {
  blueprint: LoomBlueprint;
  providerId: string;
};

/**
 * Produce a proposal only. This function never persists, mutates a tenant draft,
 * renders arbitrary code, or publishes a site. Callers must authorise and save
 * the validated result through the normal website APIs after user review.
 */
export async function proposeLoomBlueprint(
  provider: loomifyAIProvider | null,
  rawBrief: unknown,
  options: { timeoutMs?: number } = {},
): Promise<loomifyAIProposal> {
  const briefResult = loomifyAIBriefSchema.safeParse(rawBrief);
  if (!briefResult.success) {
    throw new loomifyAIError("invalid_brief", briefResult.error.issues[0]?.message ?? "Check your website brief.");
  }
  if (!provider) {
    throw new loomifyAIError("provider_unavailable", "loomifyAI is not configured yet. You can still choose a Layout and build your website in Layout Studio.");
  }

  const timeoutMs = options.timeoutMs ?? 30_000;
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const rawOutput = await Promise.race([
      provider.generateBlueprint({ brief: briefResult.data, signal: controller.signal }),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          controller.abort();
          reject(new loomifyAIError("timeout", "loomifyAI took too long. Your existing draft has not been changed."));
        }, timeoutMs);
      }),
    ]);
    const parsed = loomBlueprintSchema.safeParse(rawOutput);
    if (!parsed.success) {
      throw new loomifyAIError("invalid_blueprint", "The proposed design did not pass LUCIA's website safety checks. Your existing draft has not been changed.");
    }
    return { blueprint: parsed.data, providerId: provider.id };
  } catch (error) {
    if (error instanceof loomifyAIError) throw error;
    throw new loomifyAIError("provider_unavailable", "loomifyAI could not reach its provider. Your existing draft has not been changed.");
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
