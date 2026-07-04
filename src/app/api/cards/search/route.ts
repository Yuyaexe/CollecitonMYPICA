import { NextRequest, NextResponse } from "next/server";
import { getCardAdapter, isApiSupported } from "@/features/catalog/services/card-api";
import { digimonCardPriceFields } from "@/features/catalog/services/card-api/digimon.utils";
import { SearchDebugLog } from "@/features/catalog/services/search-debug";
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

const SEARCH_RESULT_LIMIT = 24;
/** Supplemental CardTrader merge — keep small to avoid rate limits during search. */
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
  const query = searchParams.get("q") ?? "";
  const game = searchParams.get("game") ?? "yugioh";
  const currency = (searchParams.get("currency") as "USD" | "BRL" | null) ?? "USD";
  const debugMode = searchParams.get("debug") === "1";
  const enrichPrices = searchParams.get("enrich") === "1";

  const log = new SearchDebugLog();

  if (!query.trim()) {
    return NextResponse.json({ results: [], debug: debugMode ? log.toJSON() : undefined });
  }

  const cardTraderReady = isCardTraderConfigured() && isCardTraderGameSupported(game);
  log.push(
    "info",
    "init",
    `Search "${query}" · game=${game} · CT=${cardTraderReady ? "on" : "off"} · enrich=${enrichPrices ? "on" : "off"}`
  );

  if (!isApiSupported(game) && !cardTraderReady) {
    return NextResponse.json({
      results: [],
      message: `Search not available for ${game}. Use CSV import.`,
      debug: debugMode ? log.toJSON() : undefined,
    });
  }

  try {
    let results: CardSearchResult[] = [];
    let source: "catalog" | "cardtrader" = "catalog";

    if (isApiSupported(game)) {
      const adapter = getCardAdapter(game);
      if (!adapter) {
        return NextResponse.json({ error: "Unknown game", debug: debugMode ? log.toJSON() : undefined }, { status: 400 });
      }

      try {
        results = await log.time("catalog", `YGOPRODeck / ${game} catalog`, () => adapter.search(query));
        log.push("info", "catalog", `${results.length} result(s) from catalog (images from catalog API)`);
      } catch (error) {
        log.push("error", "catalog", "Catalog search failed", {
          detail: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }

      if (cardTraderReady) {
        try {
          const ctSearchOpts = {
            maxExpansions: isCardTraderPrimarySearch(game)
              ? CARDTRADER_PRIMARY_MAX_EXPANSIONS
              : CT_MERGE_MAX_EXPANSIONS,
          };
          const cardTraderResults = await log.time(
            "cardtrader-merge",
            `CardTrader catalog merge (max ${ctSearchOpts.maxExpansions} expansions)`,
            () => searchCardTraderCatalog(game, query, ctSearchOpts)
          );

          if (results.length === 0) {
            results = cardTraderResults;
            source = "cardtrader";
            log.push("info", "cardtrader-merge", `Using ${cardTraderResults.length} CardTrader-only result(s)`);
          } else if (cardTraderResults.length > 0) {
            results = mergeSearchResults(results, cardTraderResults);
            log.push(
              "success",
              "cardtrader-merge",
              `Merged ${cardTraderResults.length} CT result(s) · total ${results.length}`
            );
          } else {
            log.push("warn", "cardtrader-merge", "No CardTrader matches (catalog results kept)");
          }
        } catch (error) {
          log.push("warn", "cardtrader-merge", "CardTrader merge skipped (rate limit or API error)", {
            detail: error instanceof Error ? error.message : String(error),
          });
          if (results.length === 0) {
            throw error;
          }
        }
      }
    } else if (cardTraderReady) {
      const ctSearchOpts = {
        maxExpansions: CARDTRADER_PRIMARY_MAX_EXPANSIONS,
      };
      results = await log.time(
        "cardtrader-primary",
        "CardTrader primary search",
        () => searchCardTraderCatalog(game, query, ctSearchOpts)
      );
      source = "cardtrader";
    }

    if (enrichPrices && cardTraderReady && results.length > 0) {
      log.push("warn", "enrich", "Price/image enrich enabled — may hit CardTrader rate limits");
      const enriched = [];
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (i >= 8) {
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
              cardTraderBlueprintId: blueprintId != null ? String(blueprintId) : null,
              ...(game === "digimon" ? digimonCardPriceFields(result) : {}),
            },
            currency
          );
          if (cardTrader) {
            enriched.push({
              ...result,
              price: cardTrader.price ?? result.price,
              imageUrl: result.imageUrl,
              metadata: {
                ...result.metadata,
                priceSource: "cardtrader",
                cardTraderBlueprintId: cardTrader.blueprintId,
              },
            });
          } else {
            enriched.push(result);
          }
        } catch (error) {
          enriched.push(result);
          log.push("warn", "enrich", `Enrich failed for "${result.name}"`, {
            detail: error instanceof Error ? error.message : String(error),
          });
        }
        if (i < Math.min(results.length, 8) - 1) {
          await new Promise((resolve) => setTimeout(resolve, 40));
        }
      }
      results = enriched;
    } else {
      log.push(
        "info",
        "images",
        "Using catalog images (YGOPRODeck etc.) — CardTrader art upgrades in collection later"
      );
    }

    log.push("success", "done", `Returning ${results.length} result(s)`);

    return NextResponse.json({
      results,
      priceSource: cardTraderReady ? "catalog-first" : source,
      debug: debugMode ? log.toJSON() : undefined,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    log.push("error", "fatal", "Search failed", { detail });
    console.error("GET /api/cards/search", error);
    return NextResponse.json(
      {
        error: "Search failed",
        message: detail,
        debug: debugMode ? log.toJSON() : undefined,
      },
      { status: 500 }
    );
  }
}
