"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./settings.module.css";

type Site = { id: string; name: string; slug: string; status: string; organizationName: string };
export default function WebsiteRemovalSettings() {
  const router = useRouter();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Site | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/websites/manage", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw Error(body.error || "Unable to load your websites.");
      setSites(body.websites);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load websites.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  async function remove(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || confirmation !== selected.name || deleting) return;
    setDeleting(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/websites/" + encodeURIComponent(selected.id), {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });
      const body = await response.json();
      if (!response.ok) throw Error(body.error || "Website removal was not completed.");
      setSites((current) => current.filter((site) => site.id !== selected.id));
      setNotice(selected.name + " was removed from your workspace and taken offline.");
      setSelected(null);
      setConfirmation("");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Website removal failed. No other website was changed.");
    } finally {
      setDeleting(false);
    }
  }

  return <section className={styles.websiteRemoval} aria-labelledby="remove-websites-title">
    <h3 id="remove-websites-title">Remove a website</h3>
    <p>Only an organisation owner can remove its websites. Removal immediately takes the public website offline and disconnects its domain registrations. Saved website records and customer media remain securely retained for recovery and safe cleanup; this is not immediate permanent data erasure.</p>
    {loading ? <p role="status">Loading websites you own…</p> : null}
    {error ? <p role="alert">{error}</p> : null}
    {notice ? <p role="status">{notice}</p> : null}
    {!loading && sites.length === 0 && !error ? <p>No websites available for removal in organisations you own.</p> : null}
    <ul className={styles.websiteRemoveList}>
      {sites.map((site) => <li key={site.id} className={styles.websiteRemoveRow}>
        <div><strong>{site.name}</strong><small>{site.organizationName} · {site.slug}.lucia.name.ng · {site.status}</small></div>
        <button type="button" className={styles.dangerButton} disabled={deleting}
          onClick={() => { setSelected(site); setConfirmation(""); setNotice(""); setError(""); }}>
          Remove website
        </button>
      </li>)}
    </ul>
    {selected && <form className={styles.confirmRemoval} onSubmit={(event) => void remove(event)}>
      <h4>Confirm removal of {selected.name}</h4>
      <p>The live website will stop working immediately, and its domain registrations will be released. This does not delete your LUCIA ID, organisation, other websites or billing records.</p>
      <label htmlFor="confirm-website-removal">Type the exact website name to confirm</label>
      <input id="confirm-website-removal" value={confirmation} autoComplete="off" spellCheck={false}
        onChange={(event) => setConfirmation(event.target.value)} disabled={deleting} />
      <div className={styles.removalActions}>
        <button type="button" disabled={deleting} onClick={() => { setSelected(null); setConfirmation(""); }}>Cancel</button>
        <button type="submit" className={styles.dangerButton} disabled={deleting || confirmation !== selected.name}>
          {deleting ? "Removing…" : "Confirm website removal"}
        </button>
      </div>
    </form>}
  </section>;
}
