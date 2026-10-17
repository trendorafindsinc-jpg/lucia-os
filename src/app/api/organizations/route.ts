import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/auth/session";
import { memberships, organizations } from "@/lib/db/schema";
import { normalizeOrganizationName, organizationSlugBase } from "@/lib/organizations/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function GET() {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401, headers: { "Cache-Control": "no-store" } });

  const rows = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      role: memberships.role,
      status: memberships.status,
    })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(eq(memberships.userId, user.id));

  return NextResponse.json({ organizations: rows.filter((row) => row.status === "active") }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const db = getDb();
  if (!isSameOrigin(request)) return NextResponse.json({ error: "ORIGIN_NOT_ALLOWED" }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401, headers: { "Cache-Control": "no-store" } });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  const name = normalizeOrganizationName(
    body && typeof body === "object" ? (body as Record<string, unknown>).name : undefined,
  );
  if (!name) return NextResponse.json({ error: "INVALID_ORGANIZATION_NAME" }, { status: 400 });

  const slug = `${organizationSlugBase(name)}-${randomBytes(4).toString("hex")}`;
  try {
    const created = await db.transaction(async (tx) => {
      const [organization] = await tx
        .insert(organizations)
        .values({ name, slug, status: "active" })
        .returning({ id: organizations.id, name: organizations.name, slug: organizations.slug });
      await tx.insert(memberships).values({
        organizationId: organization.id,
        userId: user.id,
        role: "owner",
        status: "active",
      });
      return organization;
    });
    return NextResponse.json({ organization: { ...created, role: "owner" } }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "WORKSPACE_CREATE_FAILED" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
