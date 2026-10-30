/** Public interface hostnames. Host selection never grants resource authorization. */
const DEFAULT_PLATFORM_HOSTS = [
  "lucia.name.ng",
  "www.lucia.name.ng",
  "os.lucia.name.ng",
  "lucia-os.vercel.app",
  "lucia-os-three.vercel.app",
  "lucia-os-trendoraplc-5738.vercel.app",
  "lucia-os-git-main-trendoraplc-5738.vercel.app",
];
export function getPlatformHostnames() {
  const hosts = [...DEFAULT_PLATFORM_HOSTS];
  try {
    if (process.env.APP_BASE_URL)
      hosts.push(new URL(process.env.APP_BASE_URL).hostname.toLowerCase());
  } catch {
    /* Invalid configuration cannot disable the known platform hosts. */
  }
  for (const host of [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL])
    if (host) hosts.push(host.toLowerCase().replace(/:\d+$/, ""));
  return [...new Set(hosts)];
}
export function isPlatformHostname(hostname: string) {
  return (
    getPlatformHostnames().includes(hostname) ||
    (process.env.NODE_ENV !== "production" &&
      ["localhost", "127.0.0.1"].includes(hostname))
  );
}
