/**
 * Layout eligibility is independent of device identity and pointer hardware.
 * The Lattice shell reserves 48px outer padding and 12px pane gap.
 * Its 45/55 balance limits keep the smaller native pane above 440px.
 * This is a UI capability check, never an entitlement or authorization grant.
 */
export const TABLET_MIN_SPLIT_VIEWPORT = 1100;
export function canUseLatticeSplit(viewportWidth: number, openPaneCount: number): boolean {
  return Number.isFinite(viewportWidth) &&
    viewportWidth >= TABLET_MIN_SPLIT_VIEWPORT &&
    openPaneCount === 2;
}
