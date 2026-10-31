import portfolio from "../../../public/layouts/structural/portfolio.svg";
import retreat from "../../../public/layouts/structural/retreat.svg";
import room from "../../../public/layouts/structural/room.svg";

/** Build-owned URLs live under /_next/static/media, already permitted by host routing.
 * Original geometric illustrations authored for this repository, not premium photography. */
const path = (asset: string | { src: string }) =>
  typeof asset === "string" ? asset : asset.src;
export const premiumAssets: Readonly<Record<string, string>> = Object.freeze({
  "builtin:portfolio/work-1": path(portfolio),
  "builtin:hospitality/hero": path(retreat),
  "builtin:hospitality/stay": path(room),
});
export const premiumAssetSources = [
  "public/layouts/structural/portfolio.svg",
  "public/layouts/structural/retreat.svg",
  "public/layouts/structural/room.svg",
] as const;
export function resolvePremiumAsset(reference: string): string {
  if (!Object.hasOwn(premiumAssets, reference))
    throw Error("Unknown built-in asset");
  return premiumAssets[reference];
}
