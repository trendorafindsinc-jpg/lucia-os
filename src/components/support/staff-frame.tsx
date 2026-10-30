import Link from "next/link";
import type { ReactNode } from "react";
import { StaffNavigation } from "./staff-navigation";
export function StaffFrame({ children, active }: { children: ReactNode; active: "audit" | "tenants" | "overview" }) {
  return <main className="workspace-shell"><header className="workspace-topbar"><Link className="workspace-brand" href="/staff"><span className="workspace-brand-mark">L</span>LUCIA Staff</Link><span className="workspace-context">Platform operations</span></header><div className="workspace-layout"><StaffNavigation active={active} /><section className="workspace-main">{children}</section></div></main>;
}
