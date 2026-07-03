import { NextRequest, NextResponse } from "next/server";
import { getCardAdapter, isApiSupported } from "@/features/catalog/services/card-api";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const game = searchParams.get("game") ?? "yugioh";

  if (!query.trim()) {
    return NextResponse.json({ results: [] });
  }

  if (!isApiSupported(game)) {
    return NextResponse.json({
      results: [],
      message: `API not yet implemented for ${game}. Use CSV import.`,
    });
  }

  const adapter = getCardAdapter(game);
  if (!adapter) {
    return NextResponse.json({ error: "Unknown game" }, { status: 400 });
  }

  try {
    const results = await adapter.search(query);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
