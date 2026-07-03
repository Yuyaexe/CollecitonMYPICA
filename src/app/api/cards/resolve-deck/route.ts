import { NextRequest, NextResponse } from "next/server";
import { resolveDeckEntries } from "@/features/import/services/decklist-resolver";
import type { DecklistGameSlug, ParsedDeckEntry } from "@/features/import/types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      gameSlug?: DecklistGameSlug;
      entries?: ParsedDeckEntry[];
    };

    const gameSlug = body.gameSlug ?? "unknown";
    const entries = body.entries ?? [];

    if (entries.length === 0) {
      return NextResponse.json({ resolved: [] });
    }

    const resolved = await resolveDeckEntries(entries, gameSlug);
    return NextResponse.json({ resolved });
  } catch (error) {
    console.error("POST /api/cards/resolve-deck", error);
    return NextResponse.json({ error: "Failed to resolve decklist" }, { status: 500 });
  }
}
