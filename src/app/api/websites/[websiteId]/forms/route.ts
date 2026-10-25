import { and, desc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { hasOrganizationPermission } from "@/lib/access/policy";
import { getDb } from "@/lib/db/client";
import { memberships, organizations, websiteFormSubmissions, websiteForms, websites } from "@/lib/db/schema";
import { formDefinitionSchema, formSubmissionSchema, initialContactForm, initialNotificationSettings, notificationSettingsSchema } from "@/lib/forms/forms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ websiteId: string }> };
const updateSchema = z.object({ form: formDefinitionSchema, notificationSettings: notificationSettingsSchema }).strict();

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in with LUCIA ID to view forms." }, { status: 401 });
  const { websiteId } = await context.params;
  if (!z.string().uuid().safeParse(websiteId).success) return NextResponse.json({ error: "Invalid website id." }, { status: 400 });
  const db = getDb();
  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_user_id', ${user.id}, true)`);
    const orgs = await tx.select({ id: organizations.id, role: memberships.role, status: memberships.status })
      .from(memberships).innerJoin(organizations, eq(memberships.organizationId, organizations.id))
      .where(and(eq(memberships.userId, user.id), eq(memberships.status, "active"), eq(organizations.status, "active")));
    for (const org of orgs) {
      if (!hasOrganizationPermission({ role: org.role, status: org.status }, "website.read")) continue;
      await tx.execute(sql`select set_config('app.current_organization_id', ${org.id}, true)`);
      const [website] = await tx.select({ id: websites.id }).from(websites)
        .where(and(eq(websites.id, websiteId), eq(websites.organizationId, org.id))).limit(1);
      if (!website) continue;
      const [savedForm] = await tx.select().from(websiteForms)
        .where(and(eq(websiteForms.organizationId, org.id), eq(websiteForms.websiteId, website.id), eq(websiteForms.formKey, "form-contact"))).limit(1);
      const rows = await tx.select().from(websiteFormSubmissions)
        .where(and(eq(websiteFormSubmissions.organizationId, org.id), eq(websiteFormSubmissions.websiteId, website.id), eq(websiteFormSubmissions.formKey, "form-contact")))
        .orderBy(desc(websiteFormSubmissions.submittedAt)).limit(100);
      return { websiteId: website.id, savedForm: savedForm ?? null, rows };
    }
    return null;
  });
  if (!result) return NextResponse.json({ error: "Website not found or access denied." }, { status: 404, headers: { "Cache-Control": "no-store" } });

  let form = initialContactForm;
  let notificationSettings = initialNotificationSettings;
  if (result.savedForm) {
    try {
      const parsedForm = formDefinitionSchema.safeParse(JSON.parse(result.savedForm.definition));
      const parsedNotifications = notificationSettingsSchema.safeParse(JSON.parse(result.savedForm.notificationSettings));
      if (!parsedForm.success || !parsedNotifications.success || parsedForm.data.id !== "form-contact") {
        return NextResponse.json({ error: "Saved form settings failed validation and were not changed." }, { status: 500, headers: { "Cache-Control": "no-store" } });
      }
      form = parsedForm.data;
      notificationSettings = parsedNotifications.data;
    } catch {
      return NextResponse.json({ error: "Saved form settings are invalid and were not changed." }, { status: 500, headers: { "Cache-Control": "no-store" } });
    }
  }

  const submissions = [];
  for (const row of result.rows) {
    try {
      const values = JSON.parse(row.values) as unknown;
      const submission = formSubmissionSchema.safeParse({
        id: `submission-${row.id}`, formId: row.formKey, submittedAt: row.submittedAt.toISOString(), values, status: row.status,
      });
      if (submission.success) submissions.push(submission.data);
    } catch { /* Ignore malformed historical rows; never return unvalidated values. */ }
  }
  return NextResponse.json({ websiteId: result.websiteId, form, notificationSettings, submissions, saved: Boolean(result.savedForm) }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in with LUCIA ID to save form settings." }, { status: 401 });
  const { websiteId } = await context.params;
  if (!z.string().uuid().safeParse(websiteId).success) return NextResponse.json({ error: "Invalid website id." }, { status: 400 });
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "Submit valid form settings." }, { status: 400 }); }
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success || parsed.data.form.id !== "form-contact") {
    return NextResponse.json({ error: "Form settings are invalid or unsupported.", ...(parsed.success ? {} : { issues: parsed.error.flatten() }) }, { status: 422 });
  }
  const db = getDb();
  const saved = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_user_id', ${user.id}, true)`);
    const orgs = await tx.select({ id: organizations.id, role: memberships.role, status: memberships.status })
      .from(memberships).innerJoin(organizations, eq(memberships.organizationId, organizations.id))
      .where(and(eq(memberships.userId, user.id), eq(memberships.status, "active"), eq(organizations.status, "active")));
    for (const org of orgs) {
      if (!hasOrganizationPermission({ role: org.role, status: org.status }, "website.edit")) continue;
      await tx.execute(sql`select set_config('app.current_organization_id', ${org.id}, true)`);
      const [website] = await tx.select({ id: websites.id }).from(websites)
        .where(and(eq(websites.id, websiteId), eq(websites.organizationId, org.id))).limit(1);
      if (!website) continue;
      await tx.insert(websiteForms).values({
        organizationId: org.id, websiteId: website.id, formKey: "form-contact", createdByUserId: user.id,
        definition: JSON.stringify(parsed.data.form), notificationSettings: JSON.stringify(parsed.data.notificationSettings), updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: [websiteForms.organizationId, websiteForms.websiteId, websiteForms.formKey],
        set: { definition: JSON.stringify(parsed.data.form), notificationSettings: JSON.stringify(parsed.data.notificationSettings), updatedAt: new Date() },
      });
      return website.id;
    }
    return null;
  });
  if (!saved) return NextResponse.json({ error: "Website not found or you do not have editing access." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ saved: true, websiteId: saved }, { headers: { "Cache-Control": "no-store" } });
}
