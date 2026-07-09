/** CDN URLs safe to load directly in the browser preview (skip /api/proxy-image). */
const DIRECT_PREVIEW_HOSTS = [
  "ygoprodeck.com",
  "limitlesstcg",
  "digimoncard.io",
  "digimoncard.com",
  "pokemontcg.io",
  "digitaloceanspaces.com",
];

export function canLoadPreviewDirect(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return DIRECT_PREVIEW_HOSTS.some((h) => host.includes(h));
  } catch {
    return false;
  }
}

export function previewImageSrc(url: string | null | undefined): string | null {
  if (!url) return null;
  if (canLoadPreviewDirect(url)) return url;
  return `/api/proxy-image?url=${encodeURIComponent(url)}`;
}
