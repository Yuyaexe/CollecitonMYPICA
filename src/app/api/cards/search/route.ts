import { NextRequest, NextResponse } from "next/server";
import { getCardAdapter, isApiSupported } from "@/features/catalog/services/card-api";
import { digimonCardPriceFields } from "@/features/catalog/services/card-api/digimon.utils";
import {
  getCardTraderPriceForProfile,
  isCardTraderConfigured,
  isCardTraderGameSupported,
  isCardTraderPrimarySearch,
  resolveStoredBlueprintId,
  searchCardTraderCatalog,
  CARDTRADER_PRIMARY_MAX_EXPANSIONS,
} from "@/lib/cardtrader";
import type { CardSearchResult } from "@/features/catalog/services/card-api/types";

const ENRICH_LIMIT = 8;
const SEARCH_RESULT_LIMIT = 24;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mergeSearchResults(
  primary: CardSearchResult[],
  supplemental: CardSearchResult[],
  limit = SEARCH_RESULT_LIMIT
): CardSearchResult[] {
  const merged = [...primary];
  const seen = new Set(
    primary.map(
      (r) =>
        `${r.metadata?.catalogSource ?? "catalog"}:${r.externalId}:${r.setName ?? ""}:${r.name}`
    )
  );

  for (const result of supplemental) {
    const key = `${result.metadata?.catalogSource ?? "catalog"}:${result.externalId}:${result.setName ?? ""}:${result.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(result);
    if (merged.length >= limit) break;
  }

  return merged;
}

async function enrichWithCardTraderPrices(
  results: Awaited<ReturnType<NonNullable<ReturnType<typeof getCardAdapter>>["search"]>>,
  game: string,
  currency: "USD" | "BRL"
) {
  const enriched = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (i >= ENRICH_LIMIT) {
      enriched.push(result);
      continue;
    }
    try {
      const blueprintId = resolveStoredBlueprintId(
        result.externalId,
        result.imageUrl,
        result.metadata?.catalogSource === "cardtrader" ? result.externalId : null
      );
      const cardTrader = await getCardTraderPriceForProfile(
        {
          gameSlug: game,
          name: result.name,
          setName: result.setName,
          setCode: result.setCode,
          rarity: result.rarity,
          blueprintId,
          imageUrl: result.imageUrl,
          cardTraderBlueprintId:
            blueprintId != null ? String(blueprintId) : null,
          ...(game === "digimon" ? digimonCardPriceFields(result) : {}),
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
        imageUrl: cardTrader.imageUrl ?? result.imageUrl,
        metadata: {
          ...result.metadata,
          priceSource: "cardtrader",
          cardTraderBlueprintId: cardTrader.blueprintId,
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
    const ctSearchOpts = {
      maxExpansions: isCardTraderPrimarySearch(game)
        ? CARDTRADER_PRIMARY_MAX_EXPANSIONS
        : 10,
    };

    if (isApiSupported(game)) {
      const adapter = getCardAdapter(game);
      if (!adapter) {
        return NextResponse.json({ error: "Unknown game" }, { status: 400 });
      }
      results = await adapter.search(query);

      if (cardTraderReady) {
        const cardTraderResults = await searchCardTraderCatalog(game, query, ctSearchOpts);
        if (results.length === 0) {
          results = cardTraderResults;
          source = "cardtrader";
        } else if (cardTraderResults.length > 0) {
          results = mergeSearchResults(results, cardTraderResults);
        }
      }
    } else {
      results = await searchCardTraderCatalog(game, query, ctSearchOpts);
      source = "cardtrader";
    }

    if (cardTraderReady) {
      results = await enrichWithCardTraderPrices(results, game, currency);
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
