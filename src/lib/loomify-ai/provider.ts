import { z } from "zod";
import { loomBlueprintSchema, type LoomBlueprint } from "@/lib/loom/blueprint";

export const loomifyAIBriefSchema = z.string().trim().min(20, "Describe the website in a little more detail.").max(4_000, "Keep the website brief under 4,000 characters.");

export type LoomifyAIProvider = {
  /** Stable provider adapter identifier for diagnostics, not customer-facing model branding. */
  readonly id: string;
  /** Return untrusted structured data. The engine validates it before any save or render. */
  generateBlueprint(input: { brief: string; signal: AbortSignal }): Promise<unknown>;
};

export type LoomifyAIErrorCode = "invalid_brief" | "provider_unavailable" | "timeout" | "invalid_blueprint";

export class LoomifyAIError extends Error {
  constructor(readonly code: LoomifyAIErrorCode, message: string) {
    super(message);
    this.name = "LoomifyAIError";
  }
}

export type LoomifyAIProposal = {
  blueprint: LoomBlueprint;
  providerId: string;
};

/**
 * Produce a proposal only. This function never persists, mutates a tenant draft,
 * renders arbitrary code, or publishes a site. Callers must authorise and save
 * the validated result through the normal website APIs after user review.
 */
export async function proposeLoomBlueprint(
  provider: LoomifyAIProvider | null,
  rawBrief: unknown,
  options: { timeoutMs?: number } = {},
): Promise<LoomifyAIProposal> {
  const briefResult = loomifyAIBriefSchema.safeParse(rawBrief);
  if (!briefResult.success) {
    throw new LoomifyAIError("invalid_brief", briefResult.error.issues[0]?.message ?? "Check your website brief.");
  }
  if (!provider) {
    throw new LoomifyAIError("provider_unavailable", "LoomifyAI is not configured yet. You can still choose a Loom and build your website in Studio.");
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
          reject(new LoomifyAIError("timeout", "LoomifyAI took too long. Your existing draft has not been changed."));
        }, timeoutMs);
      }),
    ]);
    const parsed = loomBlueprintSchema.safeParse(rawOutput);
    if (!parsed.success) {
      throw new LoomifyAIError("invalid_blueprint", "The proposed design did not pass LUCIA's website safety checks. Your existing draft has not been changed.");
    }
    return { blueprint: parsed.data, providerId: provider.id };
  } catch (error) {
    if (error instanceof LoomifyAIError) throw error;
    throw new LoomifyAIError("provider_unavailable", "LoomifyAI could not reach its provider. Your existing draft has not been changed.");
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
