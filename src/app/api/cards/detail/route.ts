import { NextRequest, NextResponse } from "next/server";
import { getCardAdapter, isApiSupported } from "@/features/catalog/services/card-api";
import { cloneSearchResultForJson } from "@/features/catalog/services/serialize-search-results";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") ?? "";
  const game = searchParams.get("game") ?? "yugioh";

  if (!id.trim()) {
    return NextResponse.json({ error: "Card id required" }, { status: 400 });
  }

  if (!isApiSupported(game)) {
    return NextResponse.json({ result: null, relatedPrints: [] });
  }

  const adapter = getCardAdapter(game);
  if (!adapter) {
    return NextResponse.json({ error: "Unknown game" }, { status: 400 });
  }

  try {
    const result = await adapter.getById(id);
    if (!result) {
      return NextResponse.json({ result: null, relatedPrints: [] });
    }

    let relatedPrints: Awaited<ReturnType<typeof adapter.search>> = [];
    if (game === "yugioh" && result.name) {
      const prints = await adapter.search(result.name);
      relatedPrints = prints.filter((p) => p.externalId !== result.externalId);
    }

    return NextResponse.json({
      result: cloneSearchResultForJson(result),
      relatedPrints: relatedPrints.map(cloneSearchResultForJson),
    });
  } catch {
    return NextResponse.json({ error: "Failed to load card" }, { status: 500 });
  }
}
