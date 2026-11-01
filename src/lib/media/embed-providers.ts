export type ExternalEmbed = {
  provider: "youtube" | "vimeo" | "spotify" | "soundcloud" | "apple-podcasts" | "tiktok" | "instagram";
  src: string;
  title: string;
};

/** Convert supported public share URLs into fixed, privacy-conscious embed URLs. */
export function resolveExternalEmbed(input: string): ExternalEmbed | null {
  try {
    const url = new URL(input.trim());
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase();
    if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(host) || host === "youtu.be") {
      const id = host === "youtu.be"
        ? url.pathname.slice(1)
        : url.pathname.match(/^\/(?:shorts|live)\/([A-Za-z0-9_-]{6,20})\/?$/)?.[1]
          ?? (url.pathname === "/watch" ? url.searchParams.get("v") : null);
      return id && /^[A-Za-z0-9_-]{6,20}$/.test(id)
        ? { provider: "youtube", src: "https://www.youtube-nocookie.com/embed/" + id, title: "YouTube video" }
        : null;
    }
    if (["vimeo.com", "www.vimeo.com"].includes(host)) {
      const id = url.pathname.match(/^\/(?:video\/)?([0-9]+)\/?$/)?.[1];
      return id ? { provider: "vimeo", src: "https://player.vimeo.com/video/" + id, title: "Vimeo video" } : null;
    }
    if (host === "open.spotify.com") {
      const match = url.pathname.match(/^\/(track|album|playlist|episode|show)\/([A-Za-z0-9]+)\/?$/);
      return match ? { provider: "spotify", src: "https://open.spotify.com/embed/" + match[1] + "/" + match[2], title: "Spotify " + match[1] } : null;
    }
    if (["soundcloud.com", "www.soundcloud.com"].includes(host)) {
      if (!/^\/[A-Za-z0-9_/@.-]+\/?$/.test(url.pathname)) return null;
      const target = new URL(url.toString());
      target.hash = "";
      return { provider: "soundcloud", src: "https://w.soundcloud.com/player/?url=" + encodeURIComponent(target.toString()), title: "SoundCloud audio" };
    }
    if (["podcasts.apple.com", "itunes.apple.com"].includes(host)) {
      const match = url.pathname.match(/^\/([a-z]{2})\/podcast\/([a-z0-9-]+)\/(id[0-9]+)\/?$/i);
      return match ? { provider: "apple-podcasts", src: "https://embed.podcasts.apple.com/" + match[1] + "/podcast/" + match[2] + "/" + match[3], title: "Apple Podcasts" } : null;
    }
    if (host === "www.tiktok.com") {
      const id = url.pathname.match(/^\/@[A-Za-z0-9._-]+\/video\/([0-9]+)\/?$/)?.[1];
      return id ? { provider: "tiktok", src: "https://www.tiktok.com/embed/v2/" + id, title: "TikTok video" } : null;
    }
    if (host === "www.instagram.com") {
      const match = url.pathname.match(/^\/(p|reel|tv)\/([A-Za-z0-9_-]+)\/?$/);
      return match ? { provider: "instagram", src: "https://www.instagram.com/" + match[1] + "/" + match[2] + "/embed/", title: "Instagram " + match[1] } : null;
    }
    return null;
  } catch {
    return null;
  }
}

/** Accept a normal HTTPS destination for an explicitly customer-authored link section. */
export function resolveExternalHttpsLink(input: string): string | null {
  try {
    const url = new URL(input.trim());
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    if (!url.hostname.includes(".") || url.hostname.endsWith(".local") || url.hostname === "localhost") return null;
    return url.toString();
  } catch {
    return null;
  }
}
