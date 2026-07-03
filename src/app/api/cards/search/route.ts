import { NextRequest, NextResponse } from "next/server";
import { getCardAdapter, isApiSupported } from "@/features/catalog/services/card-api";
import { getCardTraderPriceForProfile, isCardTraderConfigured } from "@/lib/cardtrader";

const ENRICH_LIMIT = 8;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const game = searchParams.get("game") ?? "yugioh";
  const currency = (searchParams.get("currency") as "USD" | "BRL" | null) ?? "USD";

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
    let results = await adapter.search(query);

    if (isCardTraderConfigured()) {
      results = await Promise.all(
        results.map(async (result, index) => {
          if (index >= ENRICH_LIMIT) return result;
          try {
            const cardTrader = await getCardTraderPriceForProfile(
              {
                gameSlug: game,
                name: result.name,
                setName: result.setName,
                setCode: result.setCode,
              },
              currency
            );
            if (!cardTrader) return result;
            return {
              ...result,
              price: cardTrader.price,
              metadata: {
                ...result.metadata,
                cardtrader: cardTrader,
                priceSource: "cardtrader",
              },
            };
          } catch {
            return result;
          }
        })
      );
    }

    return NextResponse.json({ results, priceSource: isCardTraderConfigured() ? "cardtrader" : "catalog" });
  } catch {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
