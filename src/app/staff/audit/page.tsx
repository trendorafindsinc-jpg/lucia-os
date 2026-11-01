import { desc, eq } from "drizzle-orm";
import { getCurrentStaffUser } from "@/lib/access/guards";
import { withPlatformStaffScope } from "@/lib/db/tenant-scope";
import { platformAuditEvents } from "@/lib/db/schema";
import { StaffFrame } from "@/components/support/staff-frame";
export const dynamic = "force-dynamic";
export const metadata = { title: "Audit history | LUCIA Staff" };
export default async function StaffAuditPage({ searchParams }: { searchParams: Promise<{ result?: string }> }) {
  // Operators can review their operational audit; security reviewers have explicit audit access.
  const user = await getCurrentStaffUser("audit.read") ?? await getCurrentStaffUser("staff.grants.manage");
  if (!user) return <StaffFrame active="audit"><h1>Audit access required</h1><p>Your staff role does not allow platform audit review.</p></StaffFrame>;
  const result = (await searchParams).result;
  const rows = await withPlatformStaffScope(user.id, tx => tx.select({ id: platformAuditEvents.id, action: platformAuditEvents.action, actorKind: platformAuditEvents.actorKind, targetType: platformAuditEvents.targetType, result: platformAuditEvents.result, createdAt: platformAuditEvents.createdAt }).from(platformAuditEvents).where(result === "success" || result === "denied" || result === "failure" ? eq(platformAuditEvents.result, result) : undefined).orderBy(desc(platformAuditEvents.createdAt)).limit(100));
  return <StaffFrame active="audit"><div className="workspace-heading"><div><span className="workspace-kicker">LUCIA TEAM · ACCOUNTABILITY</span><h1>Audit history</h1><p>Latest 100 matching events. Message bodies and private metadata are excluded.</p></div></div><section className="workspace-panel"><form action="/staff/audit" className="lucia-support-form"><label>Result<select name="result" defaultValue={result ?? ""}><option value="">All results</option><option value="success">Success</option><option value="denied">Denied</option><option value="failure">Failure</option></select></label><button className="workspace-button workspace-button-secondary">Filter events</button></form><div className="workspace-table-wrap"><table className="workspace-table"><thead><tr><th>When</th><th>Action</th><th>Actor</th><th>Resource</th><th>Result</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{row.createdAt.toLocaleString("en-GB", { timeZone: "Africa/Lagos" })}</td><td>{row.action}</td><td>{row.actorKind}</td><td>{row.targetType}</td><td>{row.result}</td></tr>)}</tbody></table></div>{!rows.length ? <p className="workspace-empty">No matching audit events.</p> : null}</section><p className="workspace-footnote">Times shown in Africa/Lagos. This view is read-only.</p></StaffFrame>;
}
