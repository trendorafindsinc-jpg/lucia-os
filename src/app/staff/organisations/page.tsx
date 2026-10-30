import { desc, ilike } from "drizzle-orm";
import { getCurrentStaffUser } from "@/lib/access/guards";
import { withPlatformStaffScope } from "@/lib/db/tenant-scope";
import { organizations } from "@/lib/db/schema";
import { StaffFrame } from "@/components/support/staff-frame";
export const dynamic = "force-dynamic";
export const metadata = { title: "Organisations | LUCIA Staff" };
export default async function StaffOrganisationsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await getCurrentStaffUser("tenants.read");
  if (!user) return <StaffFrame active="tenants"><h1>Organisation review access required</h1><p>Your staff role does not allow platform organisation review.</p></StaffFrame>;
  const raw = (await searchParams).q;
  const q = typeof raw === "string" ? raw.trim().slice(0, 100) : "";
  const rows = await withPlatformStaffScope(user.id, tx => tx.select({ id: organizations.id, name: organizations.name, status: organizations.status, createdAt: organizations.createdAt }).from(organizations).where(q ? ilike(organizations.name, `%${q}%`) : undefined).orderBy(desc(organizations.createdAt)).limit(100));
  return <StaffFrame active="tenants"><div className="workspace-heading"><div><span className="workspace-kicker">LUCIA TEAM · ORGANISATIONS</span><h1>Organisation directory</h1><p>Latest 100 matching organisations. Review registration and status without entering a customer workspace.</p></div></div><section className="workspace-panel"><form action="/staff/organisations" className="lucia-support-form"><label>Organisation name<input name="q" defaultValue={q} maxLength={100} /></label><button className="workspace-button workspace-button-secondary">Search organisations</button></form><div className="workspace-table-wrap"><table className="workspace-table"><thead><tr><th>Organisation</th><th>Status</th><th>Created</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{row.name}</td><td>{row.status}</td><td>{row.createdAt.toLocaleDateString("en-GB")}</td></tr>)}</tbody></table></div>{!rows.length ? <p className="workspace-empty">No matching organisations.</p> : null}</section></StaffFrame>;
}
