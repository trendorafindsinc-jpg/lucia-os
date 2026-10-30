"use client";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  DEFAULT_PREFERENCES,
  WALLPAPERS,
  migrateLegacy,
  safeWallpaperData,
  preferencesSchema,
  type WorkspacePreferences,
  type PreferenceEnvelope,
} from "@/lib/workspace/preferences";

type Context = {
  preferences: WorkspacePreferences;
  loaded: boolean;
  revision: number;
  error: string;
  custom: string;
  setCustom: (image: string) => void;
  apply: (p: WorkspacePreferences) => void;
  save: (p: WorkspacePreferences) => Promise<boolean>;
  reload: () => Promise<void>;
};
const PreferencesContext = createContext<Context | null>(null);
export function PreferenceProvider({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES),
    [revision, setRevision] = useState(0),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState("");
  const [custom, setCustomState] = useState("");
  const revisionRef = useRef(0);
  const saving = useRef(false);
  const deviceMarker = `lucia-os:wallpaper-migrated:v1:${userId}`;
  const imageKey = `lucia-os:wallpaper:v1:${userId}`;
  const reload = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/workspace/preferences", {
        cache: "no-store",
      });
      if (!response.ok)
        throw Error(
          "Unable to load saved settings. Retry before saving changes.",
        );
      const body: PreferenceEnvelope = await response.json();
      const p = preferencesSchema.parse(body.preferences);
      revisionRef.current = body.revision;
      setRevision(body.revision);
      setPreferences(p);
      setLoaded(true);
      // Migrate only when the server has never stored this account's settings.
      if (body.revision === 0) {
        try {
          const marker = `lucia-os:migration:v1:${userId}`;
          if (!localStorage.getItem(marker)) {
            const legacy = localStorage.getItem(
              `lucia-os:appearance:${userId}`,
            );
            const migrated = migrateLegacy(legacy);
            if (migrated) {
              const next = preferencesSchema.parse({ ...p, ...migrated });
              setPreferences(next);
              const res = await fetch("/api/workspace/preferences", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ preferences: next, revision: 0 }),
              });
              if (res.ok) {
                const saved: PreferenceEnvelope = await res.json();
                revisionRef.current = saved.revision;
                setRevision(saved.revision);
                setPreferences(saved.preferences);
                localStorage.setItem(marker, "complete");
              } else {
                setError(
                  "Your previous choices are applied locally. Reload saved settings to retry migration.",
                );
                if (res.status === 409) setLoaded(false);
              }
            } else localStorage.setItem(marker, "complete");
          }
        } catch {
          setError(
            "Browser preference migration is unavailable. Existing stored data has been preserved.",
          );
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load settings.");
    }
  }, [userId]);
  useEffect(() => {
    void reload();
    try {
      const v = localStorage.getItem(imageKey);
      if (safeWallpaperData(v)) setCustomState(v);
      else if (!localStorage.getItem(deviceMarker)) {
        const old = JSON.parse(
          localStorage.getItem(`lucia-os:appearance:${userId}`) || "null",
        );
        if (old?.wallpaper === "custom" && safeWallpaperData(old.custom)) {
          localStorage.setItem(imageKey, old.custom);
          setCustomState(old.custom);
        }
        localStorage.setItem(deviceMarker, "complete");
      }
    } catch {
      /* No private image is sent to the server. */
    }
  }, [reload, imageKey, userId, deviceMarker]);
  const setCustom = useCallback(
    (image: string) => {
      if (image && !safeWallpaperData(image)) {
        setError("Invalid wallpaper image.");
        return;
      }
      setCustomState(image);
      try {
        if (image) localStorage.setItem(imageKey, image);
        else localStorage.removeItem(imageKey);
      } catch {
        setError(
          "Wallpaper applied for this session; device storage is unavailable.",
        );
      }
    },
    [imageKey],
  );
  useEffect(() => {
    let cancelled = false;
    const target = document.querySelector<HTMLElement>(
      "[data-workspace-preferences]",
    );
    if (!target) return;
    const apply = () => {
      target.dataset.appearance =
        preferences.theme === "system"
          ? matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light"
          : preferences.theme;
      target.dataset.motion = preferences.motion;
      target.dataset.transparency = preferences.transparency;
      target.dataset.readability = preferences.readability;
      target.dataset.density = preferences.iconLayout;
      target.style.setProperty(
        "--lucia-workspace-wallpaper",
        WALLPAPERS[preferences.wallpaper],
      );
      target.style.setProperty(
        "--lucia-mobile-wallpaper",
        WALLPAPERS[preferences.wallpaper],
      );
      if (custom) {
        const img = new Image();
        img.onload = () => {
          if (!cancelled) {
            const bg = `linear-gradient(#030c1e66,#030c1e66),url("${custom}") center / cover`;
            target.style.setProperty("--lucia-workspace-wallpaper", bg);
            target.style.setProperty("--lucia-mobile-wallpaper", bg);
          }
        };
        img.src = custom;
      }
    };
    apply();
    const media = matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", apply);
    return () => {
      cancelled = true;
      media.removeEventListener("change", apply);
    };
  }, [preferences, custom]);
  const save = useCallback(
    async (p: WorkspacePreferences) => {
      if (!loaded || saving.current) return false;
      saving.current = true;
      setError("");
      setPreferences(p);
      try {
        const response = await fetch("/api/workspace/preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            preferences: p,
            revision: revisionRef.current,
          }),
        });
        const body = await response.json();
        if (!response.ok) {
          if (response.status === 409) setLoaded(false);
          throw Error(body.error || "Save failed. Retry when connected.");
        }
        const saved = preferencesSchema.parse(body.preferences);
        revisionRef.current = body.revision;
        setRevision(body.revision);
        setPreferences(saved);
        return true;
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Unable to save. Retry when connected.",
        );
        return false;
      } finally {
        saving.current = false;
      }
    },
    [loaded],
  );
  return (
    <PreferencesContext.Provider
      value={{
        preferences,
        loaded,
        revision,
        error,
        custom,
        setCustom,
        apply: setPreferences,
        save,
        reload,
      }}
    >
      <div data-workspace-preferences>{children}</div>
    </PreferencesContext.Provider>
  );
}
export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw Error("Workspace preference provider required");
  return context;
}
