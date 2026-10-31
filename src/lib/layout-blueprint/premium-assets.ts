import meridianProject from "../../../public/layouts/premium/projects/meridian.svg";
import canvasProject from "../../../public/layouts/premium/projects/canvas.svg";
import havenProject from "../../../public/layouts/premium/projects/haven.svg";
import academiaProject from "../../../public/layouts/premium/projects/academia.svg";
import maisonProject from "../../../public/layouts/premium/projects/maison.svg";
import nexusProject from "../../../public/layouts/premium/projects/nexus.svg";
import impactProject from "../../../public/layouts/premium/projects/impact.svg";
import estateProject from "../../../public/layouts/premium/projects/estate.svg";
import meridianHero from "../../../public/layouts/premium/flagships/meridian.svg";
import canvasHero from "../../../public/layouts/premium/flagships/canvas.svg";
import havenHero from "../../../public/layouts/premium/flagships/haven.svg";
import academiaHero from "../../../public/layouts/premium/flagships/academia.svg";
import maisonHero from "../../../public/layouts/premium/flagships/maison.svg";
import nexusHero from "../../../public/layouts/premium/flagships/nexus.svg";
import impactHero from "../../../public/layouts/premium/flagships/impact.svg";
import estateHero from "../../../public/layouts/premium/flagships/estate.svg";
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
  "builtin:premium/flagship-meridian": path(meridianHero),
  "builtin:premium/flagship-canvas": path(canvasHero),
  "builtin:premium/flagship-haven": path(havenHero),
  "builtin:premium/flagship-academia": path(academiaHero),
  "builtin:premium/flagship-maison": path(maisonHero),
  "builtin:premium/flagship-nexus": path(nexusHero),
  "builtin:premium/flagship-impact": path(impactHero),
  "builtin:premium/flagship-estate": path(estateHero),
  "builtin:premium/project-meridian": path(meridianProject),
  "builtin:premium/project-canvas": path(canvasProject),
  "builtin:premium/project-haven": path(havenProject),
  "builtin:premium/project-academia": path(academiaProject),
  "builtin:premium/project-maison": path(maisonProject),
  "builtin:premium/project-nexus": path(nexusProject),
  "builtin:premium/project-impact": path(impactProject),
  "builtin:premium/project-estate": path(estateProject),
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
  "public/layouts/premium/flagships/meridian.svg",
  "public/layouts/premium/flagships/canvas.svg",
  "public/layouts/premium/flagships/haven.svg",
  "public/layouts/premium/flagships/academia.svg",
  "public/layouts/premium/flagships/maison.svg",
  "public/layouts/premium/flagships/nexus.svg",
  "public/layouts/premium/flagships/impact.svg",
  "public/layouts/premium/flagships/estate.svg",
  "public/layouts/premium/projects/meridian.svg",
  "public/layouts/premium/projects/canvas.svg",
  "public/layouts/premium/projects/haven.svg",
  "public/layouts/premium/projects/academia.svg",
  "public/layouts/premium/projects/maison.svg",
  "public/layouts/premium/projects/nexus.svg",
  "public/layouts/premium/projects/impact.svg",
  "public/layouts/premium/projects/estate.svg",
] as const;
export function resolvePremiumAsset(reference: string): string {
  if (!Object.hasOwn(premiumAssets, reference))
    throw Error("Unknown built-in asset");
  return premiumAssets[reference];
}
