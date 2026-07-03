import { NextRequest, NextResponse } from "next/server";
import { getCardAdapter, isApiSupported } from "@/features/catalog/services/card-api";
import {
  getCardTraderPriceForProfile,
  isCardTraderConfigured,
  isCardTraderGameSupported,
  parseCardTraderBlueprintId,
  searchCardTraderCatalog,
} from "@/lib/cardtrader";

const ENRICH_LIMIT = 8;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function enrichWithCardTraderPrices(
  results: Awaited<ReturnType<NonNullable<ReturnType<typeof getCardAdapter>>["search"]>>,
  game: string,
  currency: "USD" | "BRL",
  preserveCatalogImages: boolean
) {
  const enriched = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (i >= ENRICH_LIMIT) {
      enriched.push(result);
      continue;
    }
    try {
      const blueprintId = parseCardTraderBlueprintId(result.externalId);
      const cardTrader = await getCardTraderPriceForProfile(
        {
          gameSlug: game,
          name: result.name,
          setName: result.setName,
          setCode: result.setCode,
          rarity: result.rarity,
          blueprintId,
        },
        currency
      );
      if (!cardTrader) {
        enriched.push(result);
        continue;
      }
      enriched.push({
        ...result,
        price: cardTrader.price ?? result.price,
        imageUrl: preserveCatalogImages
          ? result.imageUrl
          : cardTrader.imageUrl ?? result.imageUrl,
        metadata: {
          ...result.metadata,
          priceSource: "cardtrader",
        },
      });
    } catch {
      enriched.push(result);
    }
    if (i < Math.min(results.length, ENRICH_LIMIT) - 1) {
      await sleep(40);
    }
  }
  return enriched;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const game = searchParams.get("game") ?? "yugioh";
  const currency = (searchParams.get("currency") as "USD" | "BRL" | null) ?? "USD";

  if (!query.trim()) {
    return NextResponse.json({ results: [] });
  }

  const cardTraderReady = isCardTraderConfigured() && isCardTraderGameSupported(game);

  if (!isApiSupported(game) && !cardTraderReady) {
    return NextResponse.json({
      results: [],
      message: `Search not available for ${game}. Use CSV import.`,
    });
  }

  try {
    let results;
    let source: "catalog" | "cardtrader" = "catalog";

    if (isApiSupported(game)) {
      const adapter = getCardAdapter(game);
      if (!adapter) {
        return NextResponse.json({ error: "Unknown game" }, { status: 400 });
      }
      results = await adapter.search(query);
    } else {
      results = await searchCardTraderCatalog(game, query);
      source = "cardtrader";
    }

    if (cardTraderReady) {
      results = await enrichWithCardTraderPrices(
        results,
        game,
        currency,
        isApiSupported(game)
      );
    }

    return NextResponse.json({
      results,
      priceSource: cardTraderReady ? "cardtrader" : source,
    });
  } catch (error) {
    console.error("GET /api/cards/search", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
