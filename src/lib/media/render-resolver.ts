import "server-only";
import type { MediaResolver } from "@/lib/rendering/contracts";
import { getWebsiteMediaForRender } from "./service";

/** A private Studio resolver bound to the signed-in user and website scope. */
export function createWebsiteMediaResolver(userId: string): MediaResolver {
  return {
    resolve(assetId, websiteId) {
      return getWebsiteMediaForRender(userId, websiteId, assetId);
    },
  };
}
