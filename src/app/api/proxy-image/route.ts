import { NextRequest, NextResponse } from "next/server";

const TRUSTED_HOST_PATTERNS = [
  "ygoprodeck.com",
  "limitlesstcg",
  "digimoncard.io",
  "digimoncard.com",
  "world.digimoncard.com",
  "pokemontcg.io",
  "pokemoncard.io",
  "digitaloceanspaces.com",
  "cardtrader.com",
  "product-images.cardtrader",
  "tcgplayer.com",
];

function isTrustedImageUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    return TRUSTED_HOST_PATTERNS.some((p) => host.includes(p));
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url");
  if (!raw || !isTrustedImageUrl(raw)) {
    return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
  }

  try {
    const upstream = await fetch(raw, {
      headers: { "User-Agent": "DeckVault/1.0 (proxy-image-proxy)" },
      next: { revalidate: 86400 },
    });
    if (!upstream.ok) {
      return NextResponse.json({ error: "Upstream failed" }, { status: upstream.status });
    }
    const bytes = await upstream.arrayBuffer();
    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (error) {
    console.error("GET /api/proxy-image", error);
    return NextResponse.json({ error: "Failed to fetch image" }, { status: 502 });
  }
}
