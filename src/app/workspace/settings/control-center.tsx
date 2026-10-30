"use client";
import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { usePreferences } from "@/components/workspace/preference-provider";
import { useWorkspaceTab } from "@/components/workspace/workspace-tab-shell";
import { WorkspaceIcon } from "@/components/workspace/workspace-icon";
import {
  formatWorkspaceDate,
  DEFAULT_PREFERENCES,
  HOME_ELIGIBLE,
  WALLPAPERS,
  resolveOrganization,
  validateWallpaper,
  type WorkspacePreferences,
} from "@/lib/workspace/preferences";
import styles from "./settings.module.css";
const categories = [
  { id: "appearance", name: "Appearance & display", icon: "layouts" },
  { id: "home", name: "Home & applications", icon: "overview" },
  { id: "account", name: "LUCIA ID & account", icon: "settings" },
  { id: "organizations", name: "Organizations", icon: "organizations" },
  { id: "accessibility", name: "Accessibility & region", icon: "activity" },
  { id: "software", name: "Software & websites", icon: "website" },
] as const;
export default function ControlCenter({
  user,
  organizations,
}: {
  user: { displayName: string };
  organizations: { id: string; name: string; role: string }[];
}) {
  const context = usePreferences();
  const params = useSearchParams();
  const router = useRouter();
  const { setActiveTabDirty } = useWorkspaceTab();
  const category =
    categories.find((c) => c.id === params.get("category")) ?? categories[0];
  const [draft, setDraft] = useState(context.preferences);
  const [baseline, setBaseline] = useState(context.preferences);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [uploading, setUploading] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
  }, []);
  const seenRevision = useRef(-1);
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  useEffect(() => {
    if (context.loaded && context.revision !== seenRevision.current) {
      seenRevision.current = context.revision;
      setDraft(context.preferences);
      setBaseline(context.preferences);
    }
  }, [context.preferences, context.revision, context.loaded]); // Saved revisions replace only a clean form.
  useEffect(() => {
    setActiveTabDirty(dirty);
    return () => setActiveTabDirty(false);
  }, [dirty, setActiveTabDirty]);
  useEffect(() => {
    if (!dirty) return;
    const guard = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);
  function change<K extends keyof WorkspacePreferences>(
    key: K,
    value: WorkspacePreferences[K],
  ) {
    const next = { ...draft, [key]: value };
    setDraft(next);
    context.apply(next);
    setNotice("");
  }
  async function save() {
    setBusy(true);
    setNotice("");
    if (await context.save(draft)) {
      setBaseline(draft);
      setNotice("Account preferences saved.");
      router.refresh();
    }
    setBusy(false);
  }
  function cancel() {
    setDraft(baseline);
    context.apply(baseline);
    setNotice("Unsaved changes cancelled.");
  }
  const current = resolveOrganization(
    organizations,
    baseline.preferredOrganizationId,
  );
  const preview = now
    ? formatWorkspaceDate(now, draft)
    : "Loading device date and time…";
  function move(id: string, delta: number) {
    const next = [...draft.homeApps];
    const i = next.indexOf(id);
    if (i + delta < 0 || i + delta >= next.length) return;
    [next[i], next[i + delta]] = [next[i + delta], next[i]];
    change("homeApps", next);
  }
  return (
    <main className={`${styles.center} lucia-workspace-theme`}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>LUCIA OS · YOUR SPACE</p>
          <h1>Control Center</h1>
          <p>Small choices. A workspace that feels like yours.</p>
        </div>
        <Link
          href="/workspace"
          onClick={(e) => {
            if (
              dirty &&
              !confirm("Leave Settings with unsaved account changes?")
            )
              e.preventDefault();
          }}
        >
          Back to workspace
        </Link>
      </header>
      <div className={styles.layout}>
        <nav className={styles.sidebar} aria-label="Settings categories">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/workspace/settings?category=${c.id}`}
              aria-current={category.id === c.id ? "page" : undefined}
            >
              <WorkspaceIcon icon={c.icon} />
              <span>{c.name}</span>
            </Link>
          ))}
          <div className={styles.identity}>
            <strong>{user.displayName}</strong>
            <span>Connected through LUCIA ID</span>
          </div>
        </nav>
        <section className={styles.panel} aria-labelledby="category-title">
          <p className={styles.eyebrow}>PERSONAL WORKSPACE</p>
          <h2 id="category-title">{category.name}</h2>
          {!context.loaded && (
            <div role="status">
              {context.error
                ? "Saved settings are unavailable. Reload before saving."
                : "Loading your saved preferences…"}
            </div>
          )}
          {category.id === "appearance" && (
            <>
              <p>
                Appearance follows your account. Your uploaded image stays in
                this browser for this account.
              </p>
              <fieldset disabled={!context.loaded || busy}>
                <legend>Color appearance</legend>
                <div className={styles.choices}>
                  {["system", "light", "dark"].map((t) => (
                    <label key={t}>
                      <input
                        type="radio"
                        name="theme"
                        value={t}
                        checked={draft.theme === t}
                        onChange={() =>
                          change("theme", t as WorkspacePreferences["theme"])
                        }
                      />
                      {t}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div
                className={styles.wallpaperPreview}
                style={{
                  background: context.custom
                    ? `linear-gradient(#030c1e66,#030c1e66),url("${context.custom}") center / cover`
                    : WALLPAPERS[draft.wallpaper],
                }}
                role="img"
                aria-label="Workspace wallpaper preview"
              >
                <span>LUCIA · Your workspace</span>
              </div>
              <fieldset disabled={!context.loaded || busy}>
                <legend>Wallpaper presets</legend>
                <div className={styles.wallpapers}>
                  {Object.entries(WALLPAPERS).map(([id, bg]) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={!context.custom && draft.wallpaper === id}
                      onClick={() => {
                        context.setCustom("");
                        change(
                          "wallpaper",
                          id as WorkspacePreferences["wallpaper"],
                        );
                      }}
                    >
                      <span style={{ background: bg }} />
                      {id}
                    </button>
                  ))}
                </div>
              </fieldset>
              <label className={styles.upload}>
                Custom wallpaper · this device only
                <input
                  disabled={!context.loaded || uploading}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploading(true);
                    setNotice("");
                    try {
                      context.setCustom(await validateWallpaper(file));
                      setNotice(
                        "Wallpaper applied on this device. It is never uploaded.",
                      );
                    } catch (err) {
                      setNotice(
                        err instanceof Error
                          ? err.message
                          : "Unable to decode image.",
                      );
                    } finally {
                      setUploading(false);
                      e.target.value = "";
                    }
                  }}
                />
              </label>
              <p>
                JPG, PNG or WebP, under 900 KB.{" "}
                {uploading ? "Validating image…" : ""}
              </p>
              <button
                disabled={!context.loaded || busy}
                onClick={() => {
                  context.setCustom("");
                  change("wallpaper", "aurora");
                }}
              >
                Restore default wallpaper
              </button>
            </>
          )}
          {category.id === "home" && (
            <>
              <p>
                Settings and Overview remain available. Hidden apps stay
                accessible in the App Library. New apps are never pinned
                automatically.
              </p>
              <label className={styles.row}>
                <span>Show optional applications on Home</span>
                <input
                  type="checkbox"
                  disabled={!context.loaded || busy}
                  checked={draft.showHomeApps}
                  onChange={(e) => change("showHomeApps", e.target.checked)}
                />
              </label>
              <fieldset disabled={!context.loaded || busy}>
                <legend>Choose Home applications</legend>
                {HOME_ELIGIBLE.map((app) => (
                  <label className={styles.row} key={app.id}>
                    <span>{app.label}</span>
                    <input
                      type="checkbox"
                      checked={draft.homeApps.includes(app.id)}
                      onChange={(e) =>
                        change(
                          "homeApps",
                          e.target.checked
                            ? [...draft.homeApps, app.id]
                            : draft.homeApps.filter((id) => id !== app.id),
                        )
                      }
                    />
                  </label>
                ))}
              </fieldset>
              <ol className={styles.order}>
                {draft.homeApps.map((id, i) => (
                  <li key={id}>
                    <span>{HOME_ELIGIBLE.find((a) => a.id === id)?.label}</span>
                    <button
                      disabled={!context.loaded || busy || i === 0}
                      aria-label={`Move ${HOME_ELIGIBLE.find((a) => a.id === id)?.label} up`}
                      onClick={() => move(id, -1)}
                    >
                      Move up
                    </button>
                    <button
                      disabled={
                        !context.loaded ||
                        busy ||
                        i === draft.homeApps.length - 1
                      }
                      aria-label={`Move ${HOME_ELIGIBLE.find((a) => a.id === id)?.label} down`}
                      onClick={() => move(id, 1)}
                    >
                      Move down
                    </button>
                  </li>
                ))}
              </ol>
              <button
                disabled={!context.loaded || busy}
                onClick={() => {
                  change("homeApps", DEFAULT_PREFERENCES.homeApps);
                  const next = {
                    ...draft,
                    homeApps: DEFAULT_PREFERENCES.homeApps,
                    showHomeApps: false,
                    iconLayout: "comfortable" as const,
                  };
                  setDraft(next);
                  context.apply(next);
                }}
              >
                Restore default arrangement
              </button>
            </>
          )}
          {category.id === "account" && (
            <>
              <div className={styles.account}>
                <WorkspaceIcon icon="settings" />
                <div>
                  <h3>{user.displayName}</h3>
                  <p>Authenticated LUCIA ID session</p>
                </div>
              </div>
              <p>
                LUCIA ID manages your identity and authentication. LUCIA OS does
                not store your password or authentication factors.
              </p>
              <p>
                A customer account-management destination has not yet been
                verified for this integration. Profile editing, password
                controls, MFA, active sessions, recovery and privacy controls
                are unavailable here.
              </p>
              <p>
                Your email and verification status are not included in the
                current OS session contract, so they are not displayed.
              </p>
              <form action="/api/auth/logout" method="post">
                <button>Sign out of LUCIA OS</button>
              </form>
            </>
          )}
          {category.id === "organizations" && (
            <>
              <p>
                Current context:{" "}
                <strong>{current?.name ?? "Personal workspace"}</strong>
              </p>
              <p>
                This selects a workspace context. It never moves a website,
                grants a role, or changes another open app’s resource. Save work
                in other apps before switching.
              </p>
              {!organizations.length ? (
                <div className={styles.empty}>
                  <h3>No organizations available</h3>
                  <p>
                    You can still personalize your personal workspace. Your
                    existing website setup flow creates its own authorized
                    organization.
                  </p>
                  <Link href="/create">Create a website</Link>
                </div>
              ) : (
                <label className={styles.field}>
                  Preferred organization
                  <select
                    aria-label="Preferred organization"
                    value={draft.preferredOrganizationId ?? ""}
                    disabled={!context.loaded || busy}
                    onChange={(e) => {
                      if (
                        confirm(
                          "Switch the preferred organization? Save any unsaved work in other apps first. Existing resources will stay with their current organization.",
                        )
                      )
                        change(
                          "preferredOrganizationId",
                          e.target.value || null,
                        );
                    }}
                  >
                    <option value="">
                      Automatic · first accessible organization
                    </option>
                    {organizations.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} · {o.role.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {baseline.preferredOrganizationId &&
                !organizations.some(
                  (o) => o.id === baseline.preferredOrganizationId,
                ) && (
                  <p role="alert">
                    Your preferred organization is no longer accessible. Choose
                    an available organization or Automatic, then save.
                  </p>
                )}
              <ul>
                {organizations.map((o) => (
                  <li key={o.id}>
                    {o.name} · {o.role.replaceAll("_", " ")}
                    {o.id === current?.id ? " · Current context" : ""}
                  </li>
                ))}
              </ul>
              <Link href="/workspace/team">
                Open authorized team & access settings
              </Link>
            </>
          )}
          {category.id === "accessibility" && (
            <>
              <p>
                System motion and transparency preferences are respected by
                default. These overrides affect the workspace shell and Control
                Center.
              </p>
              <fieldset disabled={!context.loaded || busy}>
                <legend>Accessibility</legend>
                <label className={styles.field}>
                  Motion
                  <select
                    aria-label="Motion"
                    value={draft.motion}
                    onChange={(e) =>
                      change(
                        "motion",
                        e.target.value as WorkspacePreferences["motion"],
                      )
                    }
                  >
                    <option value="system">Follow system</option>
                    <option value="reduce">Reduce motion</option>
                  </select>
                </label>
                <label className={styles.field}>
                  Transparency
                  <select
                    aria-label="Transparency"
                    value={draft.transparency}
                    onChange={(e) =>
                      change(
                        "transparency",
                        e.target.value as WorkspacePreferences["transparency"],
                      )
                    }
                  >
                    <option value="system">Follow system</option>
                    <option value="reduce">Reduce transparency</option>
                  </select>
                </label>
                <label className={styles.field}>
                  Readability
                  <select
                    aria-label="Readability"
                    value={draft.readability}
                    onChange={(e) =>
                      change(
                        "readability",
                        e.target.value as WorkspacePreferences["readability"],
                      )
                    }
                  >
                    <option value="standard">Standard text</option>
                    <option value="large">Larger text</option>
                  </select>
                </label>
                <label className={styles.field}>
                  Icon density
                  <select
                    aria-label="Icon density"
                    value={draft.iconLayout}
                    onChange={(e) =>
                      change(
                        "iconLayout",
                        e.target.value as WorkspacePreferences["iconLayout"],
                      )
                    }
                  >
                    <option value="comfortable">Comfortable</option>
                    <option value="compact">Compact</option>
                  </select>
                </label>
              </fieldset>
              <fieldset disabled={!context.loaded || busy}>
                <legend>Dates & time · workspace display</legend>
                <label className={styles.field}>
                  Date format
                  <select
                    aria-label="Date format"
                    value={draft.dateFormat}
                    onChange={(e) =>
                      change(
                        "dateFormat",
                        e.target.value as WorkspacePreferences["dateFormat"],
                      )
                    }
                  >
                    <option value="system">System format</option>
                    <option value="dmy">Day / month / year</option>
                    <option value="mdy">Month / day / year</option>
                    <option value="iso">Year-month-day</option>
                  </select>
                </label>
                <label className={styles.field}>
                  Clock
                  <select
                    aria-label="Clock"
                    value={draft.timeFormat}
                    onChange={(e) =>
                      change(
                        "timeFormat",
                        e.target.value as WorkspacePreferences["timeFormat"],
                      )
                    }
                  >
                    <option value="system">System clock</option>
                    <option value="12">12-hour</option>
                    <option value="24">24-hour</option>
                  </select>
                </label>
                <label className={styles.field}>
                  Time zone
                  <select
                    aria-label="Time zone"
                    value={draft.timeZone}
                    onChange={(e) => change("timeZone", e.target.value)}
                  >
                    {[
                      ...new Set([
                        "system",
                        draft.timeZone,
                        ...Intl.supportedValuesOf("timeZone"),
                      ]),
                    ].map((t) => (
                      <option key={t} value={t}>
                        {t === "system" ? "Device time zone" : t}
                      </option>
                    ))}
                  </select>
                </label>
                <p>Preview: {preview}</p>
                <p>Language: English. Other translations are not available.</p>
              </fieldset>
            </>
          )}
          {category.id === "software" && (
            <>
              <p>
                Your website’s settings belong to its project. Choose a website
                before changing domains, content or publishing.
              </p>
              <div className={styles.links}>
                <Link href="/workspace/websites">Open your websites →</Link>
                <Link href="/workspace/domains">Manage website domains →</Link>
                <Link href="/support">Help & support →</Link>
              </div>
              <p>
                Purchased software, licensing, business branding, customer
                subscriptions and deployment management will arrive in their
                designated commercial phases. No installations or business
                statistics are displayed.
              </p>
            </>
          )}
          <footer className={styles.savebar}>
            <p role="status" aria-live="polite">
              {busy
                ? "Saving…"
                : notice ||
                  (dirty
                    ? "Changes applied locally · not saved to your account"
                    : "Your account preferences")}
            </p>
            {context.error && <p role="alert">{context.error}</p>}
            <div>
              <button disabled={busy || !dirty} onClick={cancel}>
                Cancel changes
              </button>
              <button
                disabled={busy || !context.loaded || !dirty}
                onClick={() => void save()}
              >
                {busy
                  ? "Saving…"
                  : context.error
                    ? "Retry save"
                    : "Save preferences"}
              </button>
              <button
                disabled={busy}
                onClick={() => {
                  if (
                    !dirty ||
                    confirm(
                      "Reload saved settings and discard unsaved account choices?",
                    )
                  ) {
                    setDraft(baseline);
                    context.apply(baseline);
                    void context.reload();
                  }
                }}
              >
                Reload saved settings
              </button>
            </div>
          </footer>
        </section>
      </div>
    </main>
  );
}
