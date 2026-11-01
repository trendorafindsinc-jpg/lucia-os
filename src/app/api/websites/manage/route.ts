import { and, eq, ne, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getOrganizationMembershipsForUser } from "@/lib/access/guards";
import { hasOrganizationPermission } from "@/lib/access/policy";
import { getDb } from "@/lib/db/client";
import { websites } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) => NextResponse.json(body, {
  status, headers: { "Cache-Control": "no-store" },
});

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return json({ error: "Sign in with LUCIA ID." }, 401);
  try {
    const permitted = (await getOrganizationMembershipsForUser(user.id))
      .filter((org) => hasOrganizationPermission(
        { role: org.role, status: org.membershipStatus }, "organization.delete",
      ));
    const db = getDb();
    const results: Array<{ id: string; name: string; slug: string; status: string; organizationName: string }> = [];
    for (const org of permitted) {
      const rows = await db.transaction(async (tx) => {
        await tx.execute(sql`select set_config('app.current_user_id', ${user.id}, true), set_config('app.current_organization_id', ${org.id}, true)`);
        return tx.select({ id: websites.id, name: websites.name, slug: websites.slug, status: websites.status })
          .from(websites)
          .where(and(eq(websites.organizationId, org.id), ne(websites.status, "deleted")));
      });
      results.push(...rows.map((row) => ({ ...row, organizationName: org.name })));
    }
    return json({ websites: results });
  } catch {
    return json({ error: "Unable to load your websites. Try again." }, 503);
  }
}
