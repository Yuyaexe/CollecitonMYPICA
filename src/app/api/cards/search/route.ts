import { NextRequest, NextResponse } from "next/server";
import { getCardAdapter, isApiSupported } from "@/features/catalog/services/card-api";
import { serializeSearchResultsForResponse } from "@/features/catalog/services/serialize-search-results";
import { rankSearchResults, dedupeSearchResults } from "@/features/catalog/services/search-ranking";
import { buildYgoImageUrl } from "@/lib/yugioh/urls";
import { isYugiohPasscodeId } from "@/lib/yugioh/passcode";
import {
  isCardTraderConfigured,
  isCardTraderGameSupported,
  isCardTraderPrimarySearch,
  searchCardTraderCatalog,
  CARDTRADER_PRIMARY_MAX_EXPANSIONS,
} from "@/lib/cardtrader";
import type { CardSearchResult } from "@/features/catalog/services/card-api/types";

const SEARCH_RESULT_LIMIT = 24;
const CT_MERGE_MAX_EXPANSIONS = 6;

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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawQuery = searchParams.get("q") ?? "";
  const query = rawQuery.replace(/:+\s*$/, "").trim() || rawQuery.trim();
  const game = searchParams.get("game") ?? "yugioh";
  const localeParam = searchParams.get("locale");
  const locale = localeParam === "pt" ? ("pt" as const) : ("en" as const);
  const quickSearch = searchParams.get("quick") === "1";

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
    let results: CardSearchResult[] = [];
    let source: "catalog" | "cardtrader" = "catalog";

    if (isApiSupported(game)) {
      const adapter = getCardAdapter(game);
      if (!adapter) {
        return NextResponse.json({ error: "Unknown game" }, { status: 400 });
      }

      results = await adapter.search(query, game === "yugioh" ? { locale } : undefined);

      if (cardTraderReady && locale === "en" && !quickSearch) {
        try {
          const ctSearchOpts = {
            maxExpansions: isCardTraderPrimarySearch(game)
              ? CARDTRADER_PRIMARY_MAX_EXPANSIONS
              : CT_MERGE_MAX_EXPANSIONS,
          };
          const cardTraderResults = await searchCardTraderCatalog(game, query, ctSearchOpts);

          if (results.length === 0) {
            results = cardTraderResults;
            source = "cardtrader";
          } else if (cardTraderResults.length > 0) {
            results = mergeSearchResults(results, cardTraderResults);
          }
        } catch (error) {
          if (results.length === 0) throw error;
        }
      }
    } else if (cardTraderReady) {
      results = await searchCardTraderCatalog(game, query, {
        maxExpansions: CARDTRADER_PRIMARY_MAX_EXPANSIONS,
      });
      source = "cardtrader";
    }

    results = dedupeSearchResults(rankSearchResults(query, results), game).slice(
      0,
      SEARCH_RESULT_LIMIT
    );

    if (game === "yugioh") {
      results = results.map((result) => {
        if (!isYugiohPasscodeId(result.externalId, result.imageUrl)) return result;
        const ygoUrl = buildYgoImageUrl(result.externalId, "small");
        return ygoUrl ? { ...result, imageUrl: ygoUrl } : result;
      });
    }

    return NextResponse.json(
      {
        results: serializeSearchResultsForResponse(results),
        priceSource: cardTraderReady ? "catalog-first" : source,
      },
      {
        headers: quickSearch
          ? { "Cache-Control": "private, max-age=120, stale-while-revalidate=300" }
          : undefined,
      }
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("GET /api/cards/search", error);
    return NextResponse.json({ error: "Search failed", message: detail }, { status: 500 });
  }
}
