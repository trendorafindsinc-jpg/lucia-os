import Link from "next/link";
import { getCurrentStaffUser } from "@/lib/access/guards";
import { StaffTeamManager } from "./team-manager";

export const metadata = { title: "Staff access | LUCIA Staff" };
export const dynamic = "force-dynamic";

export default async function StaffTeamPage() {
  const operator = await getCurrentStaffUser("staff.grants.manage");
  if (!operator) {
    return <main className="workspace-shell"><section className="workspace-card workspace-denied"><span className="workspace-kicker">RESTRICTED WORKSPACE</span><h1>Platform-operator access required</h1><p>Only an authorised platform operator can manage staff access.</p><Link className="workspace-button workspace-button-secondary" href="/staff">Back to staff overview</Link></section></main>;
  }

  return <main className="workspace-shell">
    <header className="workspace-topbar">
      <Link className="workspace-brand" href="/staff"><span className="workspace-brand-mark">L</span><span>LUCIA <span className="workspace-brand-muted">OS</span></span></Link>
      <div className="workspace-topbar-right"><span className="workspace-context">Staff access control</span><span className="workspace-avatar" aria-label="Signed-in user">{(operator.displayName || "S").slice(0, 1).toUpperCase()}</span></div>
    </header>
    <div className="workspace-layout">
      <aside className="workspace-sidebar">
        <span className="workspace-sidebar-label">STAFF WORKSPACE</span>
        <Link className="workspace-nav-item" href="/staff"><span>▦</span> Overview</Link>
        <Link className="workspace-nav-item" href="/staff/support"><span>◎</span> Customer support</Link>
        <Link className="workspace-nav-item workspace-nav-active" href="/staff/team"><span>♙</span> Staff access</Link>
        <span className="workspace-sidebar-label workspace-sidebar-planned">NOT ENABLED YET</span>
        <div className="workspace-nav-item workspace-nav-muted" aria-disabled="true"><span>◇</span> Tenants &amp; websites</div>
        <div className="workspace-nav-item workspace-nav-muted" aria-disabled="true"><span>≋</span> Audit history</div>
        <div className="workspace-sidebar-bottom"><span className="workspace-status-dot" /> Operator permission verified</div>
      </aside>
      <section className="workspace-main">
        <div className="workspace-heading"><div><span className="workspace-kicker">LUCIA TEAM · ACCESS CONTROL</span><h1>Staff access</h1><p>Grant or revoke support roles for existing LUCIA OS users.</p></div><Link className="workspace-button workspace-button-secondary" href="/staff">Back to overview</Link></div>
        <section className="workspace-panel"><div className="workspace-panel-heading"><div><h2>Manage support access</h2><p>Staff must sign in with LUCIA ID at least once before they can be granted access.</p></div></div><StaffTeamManager /></section>
        <p className="workspace-footnote">Every change requires a reason and is written to the platform audit log. This page cannot create platform-operator or security-reviewer grants.</p>
      </section>
    </div>
  </main>;
}
