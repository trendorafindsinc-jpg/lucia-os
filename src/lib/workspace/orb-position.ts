export type OrbPosition = { side: "left" | "right"; y: number };
export const DEFAULT_ORB_POSITION: OrbPosition = { side: "right", y: 0.65 };

export function snapOrb(x: number, y: number, width: number, height: number): OrbPosition {
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return DEFAULT_ORB_POSITION;
  return { side: x < width / 2 ? "left" : "right", y: Math.min(0.85, Math.max(0.15, y / height)) };
}

export function parseOrbPosition(raw: string | null): OrbPosition {
  try {
    const value: unknown = JSON.parse(raw || "null");
    if (value && typeof value === "object" && "side" in value && "y" in value &&
        (value.side === "left" || value.side === "right") && typeof value.y === "number" && Number.isFinite(value.y)) {
      return { side: value.side, y: Math.min(0.85, Math.max(0.15, value.y)) };
    }
  } catch { /* A corrupt placement preference must not prevent opening the assistant. */ }
  return DEFAULT_ORB_POSITION;
}
