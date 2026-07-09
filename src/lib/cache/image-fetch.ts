const PROXY_HOST_PATTERNS = [
  "ygoprodeck.com",
  "limitlesstcg",
  "digimoncard.io",
  "digimoncard.com",
  "pokemontcg.io",
  "pokemoncard.io",
  "digitaloceanspaces.com",
  "cardtrader.com",
];

function isProxyableUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return PROXY_HOST_PATTERNS.some((pattern) => host.includes(pattern));
  } catch {
    return false;
  }
}

/** Same-origin fetch URL for caching external card art (avoids CORS). */
export function cacheFetchUrl(remoteUrl: string): string {
  if (remoteUrl.startsWith("/")) return remoteUrl;
  if (isProxyableUrl(remoteUrl)) {
    return `/api/proxy-image?url=${encodeURIComponent(remoteUrl)}`;
  }
  return remoteUrl;
}
