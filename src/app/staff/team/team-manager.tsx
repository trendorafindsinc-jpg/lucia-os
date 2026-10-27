"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

type StaffRow = {
  id: string;
  displayName: string | null;
  active: boolean;
  role: string | null;
  status: string | null;
  expiresAt: string | null;
  reason: string | null;
  grantedAt: string | null;
};

export function StaffTeamManager() {
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<"support_agent" | "support_lead">("support_agent");
  const [action, setAction] = useState<"grant" | "revoke">("grant");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/staff/grants", { cache: "no-store" });
      const data = await response.json() as { users?: StaffRow[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to load staff directory.");
      setRows(data.users ?? []);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load staff directory.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const users = useMemo(() => {
    const unique = new Map<string, StaffRow>();
    for (const row of rows) if (!unique.has(row.id)) unique.set(row.id, row);
    return [...unique.values()].filter((user) => user.active);
  }, [rows]);

  const grants = useMemo(() => rows.filter((row) => row.role && row.status), [rows]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId || reason.trim().length < 5) {
      setMessage("Choose a user and provide a reason of at least five characters.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/staff/grants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, userId, role, reason: reason.trim() }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Staff access update failed.");
      setMessage(action === "grant" ? "Support access granted." : "Support access revoked.");
      setReason("");
      await loadUsers();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Staff access update failed.");
    } finally {
      setSaving(false);
    }
  }

  return <div className="workspace-team-manager">
    <form onSubmit={submit} className="workspace-team-form">
      <label className="workspace-field"><span>Existing LUCIA OS user</span><select required value={userId} onChange={(event) => setUserId(event.target.value)}><option value="">Choose a user…</option>{users.map((user) => <option key={user.id} value={user.id}>{user.displayName || "Unnamed user"} · {user.id.slice(0, 8)}</option>)}</select></label>
      <label className="workspace-field"><span>Role</span><select value={role} onChange={(event) => setRole(event.target.value as "support_agent" | "support_lead")}><option value="support_agent">Support agent</option><option value="support_lead">Support lead</option></select></label>
      <label className="workspace-field"><span>Action</span><select value={action} onChange={(event) => setAction(event.target.value as "grant" | "revoke")}><option value="grant">Grant access</option><option value="revoke">Revoke access</option></select></label>
      <label className="workspace-field workspace-field-reason"><span>Reason (required for audit)</span><input required minLength={5} maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="e.g. Assigned to customer support team" /></label>
      <button className="workspace-button workspace-button-primary" type="submit" disabled={saving || loading}>{saving ? "Saving…" : action === "grant" ? "Grant support access" : "Revoke support access"}</button>
    </form>
    {message ? <p role="status" className="workspace-team-message">{message}</p> : null}
    <div className="workspace-panel-heading"><div><h3>Current staff grants</h3><p>Users may have more than one role. Revocation is recorded, not deleted.</p></div><button type="button" className="workspace-button workspace-button-secondary" onClick={() => void loadUsers()} disabled={loading}>Refresh</button></div>
    {loading ? <p>Loading staff directory…</p> : grants.length ? <div className="workspace-table-wrap"><table className="workspace-table"><thead><tr><th>Staff member</th><th>Role</th><th>Status</th><th>Reason</th></tr></thead><tbody>{grants.map((grant, index) => <tr key={grant.id || `${grant.id}-${grant.role}-${index}`}><td><strong>{grant.displayName || "Unnamed user"}</strong><span className="workspace-table-sub">{grant.id}</span></td><td>{grant.role?.replaceAll("_", " ")}</td><td><span className="workspace-status workspace-status-neutral">{grant.status}</span></td><td>{grant.reason || "—"}</td></tr>)}</tbody></table></div> : <div className="workspace-empty"><h3>No staff grants found</h3><p>Once eligible users have signed in, you can grant them a support role here.</p></div>}
  </div>;
}
