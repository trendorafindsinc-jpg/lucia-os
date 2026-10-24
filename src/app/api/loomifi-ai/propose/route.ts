import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { hasOrganizationPermission } from "@/lib/access/policy";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { memberships, organizations, websites } from "@/lib/db/schema";
import { getConfiguredLoomifiAIProvider } from "@/lib/loomifi-ai/gateway";
import { LoomifiAIError, proposeLoomBlueprint } from "@/lib/loomifi-ai/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  websiteId: z.string().uuid(),
  brief: z.string().trim().min(20).max(4_000),
}).strict();

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return errorResponse("This request did not come from LUCIA OS.", 403);
  }

  const user = await getCurrentUser().catch(() => null);
  if (!user) return errorResponse("Sign in with LUCIA ID before using LoomifiAI.", 401);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return errorResponse("Submit a valid website brief.", 400);
  }
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) {
    return errorResponse("Provide a valid website and a brief of 20–4,000 characters.", 422);
  }

  let db: ReturnType<typeof getDb>;
  try {
    db = getDb();
  } catch {
    return errorResponse("Website storage is not configured. Your draft has not been changed.", 503);
  }

  let membershipsForUser: Array<{ organizationId: string; role: string; status: string }>;
  try {
    membershipsForUser = await db.select({
      organizationId: memberships.organizationId,
      role: memberships.role,
      status: memberships.status,
    }).from(memberships)
      .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
      .where(and(
        eq(memberships.userId, user.id),
        eq(memberships.status, "active"),
        eq(organizations.status, "active"),
      ));
  } catch {
    return errorResponse("We couldn't verify your website access. Your draft has not been changed.", 503);
  }

  let authorized = false;
  for (const membership of membershipsForUser) {
    if (!hasOrganizationPermission(membership, "website.edit")) continue;
    try {
      const exists = await db.transaction(async (tx) => {
        await tx.execute(sql`select set_config('app.current_organization_id', ${membership.organizationId}, true)`);
        const [website] = await tx.select({ id: websites.id })
          .from(websites)
          .where(and(
            eq(websites.id, parsed.data.websiteId),
            eq(websites.organizationId, membership.organizationId),
          )).limit(1);
        return Boolean(website);
      });
      if (exists) {
        authorized = true;
        break;
      }
    } catch {
      return errorResponse("We couldn't verify your website access. Your draft has not been changed.", 503);
    }
  }

  if (!authorized) return errorResponse("Website not found or you do not have editing access.", 404);

  try {
    const proposal = await proposeLoomBlueprint(getConfiguredLoomifiAIProvider(), parsed.data.brief);
    return NextResponse.json({
      proposal: proposal.blueprint,
      provider: proposal.providerId,
      persisted: false,
      published: false,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof LoomifiAIError) {
      const status = error.code === "invalid_brief" ? 422
        : error.code === "provider_unavailable" ? 503
        : error.code === "timeout" ? 504
        : 502;
      return errorResponse(error.message, status);
    }
    return errorResponse("LoomifiAI could not create a safe proposal. Your existing draft and live site have not been changed.", 502);
  }
}
