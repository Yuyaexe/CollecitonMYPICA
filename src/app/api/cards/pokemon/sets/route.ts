import { NextResponse } from "next/server";

const API = "https://api.pokemontcg.io/v2";
const TCGDEX_API = "https://api.tcgdex.net/v2/en";

async function tcgdexSetsResponse() {
  const fallback = await fetch(`${TCGDEX_API}/sets`, {
    next: { revalidate: 3600 },
  });
  if (!fallback.ok) {
    return NextResponse.json({ sets: [] }, { status: fallback.status });
  }
  const sets = (await fallback.json()) as Array<{
    id: string;
    name: string;
    cardCount?: { official?: number };
  }>;
  return NextResponse.json({
    sets: sets.map((set) => ({
      id: set.id,
      name: set.name,
      series: null,
      printedTotal: set.cardCount?.official ?? null,
    })),
  });
}

export async function GET() {
  const headers: HeadersInit = {
    Accept: "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) DeckVault/0.2.19",
  };
  const key = process.env.POKEMON_TCG_API_KEY;
  if (key) headers["X-Api-Key"] = key;

  try {
    const response = await fetch(`${API}/sets?pageSize=250&orderBy=-releaseDate`, {
      headers,
      next: { revalidate: 3600 },
    });
    if (!response.ok) {
      return tcgdexSetsResponse();
    }
    const data = (await response.json()) as {
      data?: Array<{ id: string; name: string; series?: string; printedTotal?: number }>;
    };
    return NextResponse.json({
      sets: (data.data ?? []).map((set) => ({
        id: set.id,
        name: set.name,
        series: set.series ?? null,
        printedTotal: set.printedTotal ?? null,
      })),
    });
  } catch {
    try {
      return await tcgdexSetsResponse();
    } catch {
      return NextResponse.json({ sets: [] }, { status: 502 });
    }
  }
}
