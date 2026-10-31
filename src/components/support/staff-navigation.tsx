import Link from "next/link";

/** Links are navigation only: every destination independently checks its permission. */
export function StaffNavigation({ active }: { active: "overview" | "support" | "team" | "audit" | "tenants" | "storage" }) {
  return <aside className="workspace-sidebar"><span className="workspace-sidebar-label">LUCIA STAFF WORKSPACE</span>
    {([['overview', '/staff', 'Overview'], ['support', '/staff/support', 'Customer support'], ['team', '/staff/team', 'Staff access'], ['tenants', '/staff/organisations', 'Organisations'], ['audit', '/staff/audit', 'Audit history'], ['storage', '/staff/storage', 'Storage']] as const).map(([key, href, label]) => <Link key={key} className={`workspace-nav-item ${active === key ? 'workspace-nav-active' : ''}`} href={href} aria-current={active === key ? 'page' : undefined}>{label}</Link>)}
    <div className="workspace-sidebar-bottom"><span className="workspace-status-dot" /> Platform operations</div>
  </aside>;
}
