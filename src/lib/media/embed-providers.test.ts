import { describe, expect, it } from "vitest";
import { resolveExternalEmbed } from "./embed-providers";

describe("website embed providers", () => {
  it.each([
    ["https://youtu.be/dQw4w9WgXcQ", "youtube", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"],
    ["https://vimeo.com/12345678", "vimeo", "https://player.vimeo.com/video/12345678"],
    ["https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC", "spotify", "https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC"],
    ["https://soundcloud.com/artist/example-track", "soundcloud", "https://w.soundcloud.com/player/?url=https%3A%2F%2Fsoundcloud.com%2Fartist%2Fexample-track"],
    ["https://podcasts.apple.com/us/podcast/example/id1234567890", "apple-podcasts", "https://embed.podcasts.apple.com/us/podcast/example/id1234567890"],
    ["https://www.tiktok.com/@creator/video/1234567890", "tiktok", "https://www.tiktok.com/embed/v2/1234567890"],
    ["https://www.instagram.com/reel/AbCdEf12345/", "instagram", "https://www.instagram.com/reel/AbCdEf12345/embed/"],
  ] as const)("normalizes %s", (input, provider, src) => {
    expect(resolveExternalEmbed(input)).toMatchObject({ provider, src });
  });

  it.each([
    "http://youtu.be/dQw4w9WgXcQ",
    "https://youtu.be/short",
    "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ",
    "https://user:pass@vimeo.com/12345",
    "https://open.spotify.com.evil.example/track/123",
    "javascript:alert(1)",
    "https://example.com/embed",
  ])("rejects unsafe or unsupported URL %s", (input) => {
    expect(resolveExternalEmbed(input)).toBeNull();
  });
});
