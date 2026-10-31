import businessArtwork from "../../../public/layouts/premium/business.svg";
import creativeArtwork from "../../../public/layouts/premium/creative.svg";
import hospitalityArtwork from "../../../public/layouts/premium/hospitality.svg";
import educationArtwork from "../../../public/layouts/premium/education.svg";
import commerceArtwork from "../../../public/layouts/premium/commerce.svg";
import technologyArtwork from "../../../public/layouts/premium/technology.svg";
import communityArtwork from "../../../public/layouts/premium/community.svg";
import servicesArtwork from "../../../public/layouts/premium/services.svg";
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
  "builtin:premium/business": path(businessArtwork),
  "builtin:premium/creative": path(creativeArtwork),
  "builtin:premium/hospitality": path(hospitalityArtwork),
  "builtin:premium/education": path(educationArtwork),
  "builtin:premium/commerce": path(commerceArtwork),
  "builtin:premium/technology": path(technologyArtwork),
  "builtin:premium/community": path(communityArtwork),
  "builtin:premium/services": path(servicesArtwork),
});
export const premiumAssetSources = [
  "public/layouts/structural/portfolio.svg",
  "public/layouts/structural/retreat.svg",
  "public/layouts/structural/room.svg",
  "public/layouts/premium/business.svg",
  "public/layouts/premium/creative.svg",
  "public/layouts/premium/hospitality.svg",
  "public/layouts/premium/education.svg",
  "public/layouts/premium/commerce.svg",
  "public/layouts/premium/technology.svg",
  "public/layouts/premium/community.svg",
  "public/layouts/premium/services.svg",
] as const;
export function resolvePremiumAsset(reference: string): string {
  if (!Object.hasOwn(premiumAssets, reference))
    throw Error("Unknown built-in asset");
  return premiumAssets[reference];
}
