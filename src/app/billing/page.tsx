import type { Metadata } from "next";
import { and, desc, eq, sql } from "drizzle-orm";
import { BillingWorkspace } from "@/components/billing/billing-workspace";
import { getCurrentUser } from "@/lib/auth/session";
import { getOrganizationMembershipsForUser } from "@/lib/access/guards";
import { hasOrganizationPermission } from "@/lib/access/policy";
import { getDb } from "@/lib/db/client";
import { billingInvoices, memberships } from "@/lib/db/schema";
import "./billing.css";

export const metadata: Metadata = { title: "Plans & billing | LUCIA OS", description: "Review saved billing records and the current payment integration status." };

export default async function BillingPage() {
  const user = await getCurrentUser();
  const invoices: Array<{ id: string; invoiceNumber: string; organizationName: string; amountDueMinor: number; amountPaidMinor: number; currency: string; status: string; dueAt: string | null; createdAt: string }> = [];
  if (user) {
    const db = getDb();
    const orgs = await getOrganizationMembershipsForUser(user.id);
    const grouped = await Promise.all(orgs.map(async (org) => db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.current_user_id', ${user.id}, true)`);
      const [membership] = await tx.select({ role: memberships.role, status: memberships.status })
        .from(memberships)
        .where(and(eq(memberships.organizationId, org.id), eq(memberships.userId, user.id), eq(memberships.status, "active")))
        .limit(1);
      if (!membership || !hasOrganizationPermission({ role: membership.role, status: membership.status }, "billing.read")) return [];
      await tx.execute(sql`select set_config('app.current_organization_id', ${org.id}, true)`);
      return tx.select({
        id: billingInvoices.id,
        invoiceNumber: billingInvoices.invoiceNumber,
        amountDueMinor: billingInvoices.amountDueMinor,
        amountPaidMinor: billingInvoices.amountPaidMinor,
        currency: billingInvoices.currency,
        status: billingInvoices.status,
        dueAt: billingInvoices.dueAt,
        createdAt: billingInvoices.createdAt,
      }).from(billingInvoices).where(eq(billingInvoices.organizationId, org.id)).orderBy(desc(billingInvoices.createdAt)).limit(50)
        .then((rows) => rows.map((row) => ({ ...row, organizationName: org.name, dueAt: row.dueAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString() })));
    })));
    invoices.push(...grouped.flat());
  }
  return <BillingWorkspace invoices={invoices.sort((a,b) => b.createdAt.localeCompare(a.createdAt))} signedIn={Boolean(user)} />;
}
