import { z } from "zod";
import { loomBlueprintSchema, type LoomBlueprint } from "@/lib/loom/blueprint";

export const loomifiAIBriefSchema = z.string().trim().min(20, "Describe the website in a little more detail.").max(4_000, "Keep the website brief under 4,000 characters.");

export type LoomifiAIProvider = {
  /** Stable provider adapter identifier for diagnostics, not customer-facing model branding. */
  readonly id: string;
  /** Return untrusted structured data. The engine validates it before any save or render. */
  generateBlueprint(input: { brief: string; signal: AbortSignal }): Promise<unknown>;
};

export type LoomifiAIErrorCode = "invalid_brief" | "provider_unavailable" | "timeout" | "invalid_blueprint";

export class LoomifiAIError extends Error {
  constructor(readonly code: LoomifiAIErrorCode, message: string) {
    super(message);
    this.name = "LoomifiAIError";
  }
}

export type LoomifiAIProposal = {
  blueprint: LoomBlueprint;
  providerId: string;
};

/**
 * Produce a proposal only. This function never persists, mutates a tenant draft,
 * renders arbitrary code, or publishes a site. Callers must authorise and save
 * the validated result through the normal website APIs after user review.
 */
export async function proposeLoomBlueprint(
  provider: LoomifiAIProvider | null,
  rawBrief: unknown,
  options: { timeoutMs?: number } = {},
): Promise<LoomifiAIProposal> {
  const briefResult = loomifiAIBriefSchema.safeParse(rawBrief);
  if (!briefResult.success) {
    throw new LoomifiAIError("invalid_brief", briefResult.error.issues[0]?.message ?? "Check your website brief.");
  }
  if (!provider) {
    throw new LoomifiAIError("provider_unavailable", "LoomifiAI is not configured yet. You can still choose a Loom and build your website in Studio.");
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
          reject(new LoomifiAIError("timeout", "LoomifiAI took too long. Your existing draft has not been changed."));
        }, timeoutMs);
      }),
    ]);
    const parsed = loomBlueprintSchema.safeParse(rawOutput);
    if (!parsed.success) {
      throw new LoomifiAIError("invalid_blueprint", "The proposed design did not pass LUCIA's website safety checks. Your existing draft has not been changed.");
    }
    return { blueprint: parsed.data, providerId: provider.id };
  } catch (error) {
    if (error instanceof LoomifiAIError) throw error;
    throw new LoomifiAIError("provider_unavailable", "LoomifiAI could not reach its provider. Your existing draft has not been changed.");
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
