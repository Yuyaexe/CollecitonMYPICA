"use client";

import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { CardPriceInput } from "@/lib/cardtrader";
import { resolveStoredBlueprintId, resolveCardTraderProductUrl, cardTraderBlueprintMatchesCard } from "@/lib/cardtrader";
import { digimonOwnedCardPriceFields, digimonEffectiveSetCodeForPricing } from "@/features/catalog/services/card-api/digimon.utils";
import {
  fetchCardTraderPriceMap,
  fetchCardTraderQuote,
  type CardTraderQuoteResult,
} from "@/features/market/services/card-trader-fetch";
import { normalizeCatalogPrice } from "@/features/market/utils/display-price";
import { useCollectionUIStore } from "@/features/collection/stores/collection-ui.store";
import type { DemoOwnedCard } from "@/lib/demo/types";
import type { Currency } from "@/types/tcg";

type CardTraderQuote = CardTraderQuoteResult & { currency: Currency };

const BATCH_SIZE = 8;
/** Pause between batch requests to stay under CardTrader rate limits. */
const BATCH_DELAY_MS = 180;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Unique print variants — no artificial cap. */
function dedupeOwnedCardsForPrices(cards: DemoOwnedCard[]): DemoOwnedCard[] {
  const seen = new Set<string>();
  const list: DemoOwnedCard[] = [];

  for (const item of cards) {
    const key = cardPriceKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    list.push(item);
  }

  return list;
}

function fingerprintPriceTargets(cards: DemoOwnedCard[]): string {
  const keys = cards.map((c) => cardPriceKey(c)).sort();
  if (keys.length === 0) return "0";

  let hash = 0;
  const payload = keys.join("\n");
  for (let i = 0; i < payload.length; i++) {
    hash = (Math.imul(31, hash) + payload.charCodeAt(i)) | 0;
  }

  return `${keys.length}:${hash}`;
}

export function ownedCardToPriceInput(item: DemoOwnedCard): CardPriceInput {
  const blueprintId = resolveStoredBlueprintId(
    item.card.externalId,
    item.card.imageUrl,
    item.card.cardTraderBlueprintId,
    item.card.gameSlug
  );

  const digimonFields =
    item.card.gameSlug === "digimon" ? digimonOwnedCardPriceFields(item.card) : null;
  const setCode =
    item.card.gameSlug === "digimon"
      ? digimonEffectiveSetCodeForPricing(item.card)
      : item.card.setCode;

  return {
    gameSlug: item.card.gameSlug,
    name: item.card.name,
    setName: item.card.setName,
    setCode,
    collectorNumber: item.card.collectorNumber ?? item.card.setCode,
    rarity: item.card.rarity,
    condition: item.condition,
    language: item.language,
    isFoil: item.isFoil,
    imageUrl: item.card.imageUrl,
    cardTraderBlueprintId: item.card.cardTraderBlueprintId,
    blueprintId,
    ...(digimonFields ?? {}),
  };
}

/** Live query wins over bulk cache when both exist (quick refresh). */
export function mergeCardTraderQuoteMaps(
  bulk: Record<string, CardTraderQuote> | undefined,
  live: Map<string, CardTraderQuote> | undefined
): Map<string, CardTraderQuote> {
  const merged = new Map<string, CardTraderQuote>();
  if (bulk) {
    for (const [key, quote] of Object.entries(bulk)) {
      merged.set(key, quote as CardTraderQuote);
    }
  }
  live?.forEach((quote, key) => merged.set(key, quote));
  return merged;
}

export function cardPriceKey(card: DemoOwnedCard): string {
  return [
    card.card.gameSlug,
    card.card.externalId ?? card.card.name,
    card.card.setName ?? "",
    card.card.setCode ?? "",
    card.card.collectorNumber ?? "",
    card.card.rarity ?? "",
  ].join("|");
}

export function variantPriceKey(
  gameSlug: string,
  name: string,
  setName?: string | null,
  setCode?: string | null
): string {
  return `${gameSlug}|${name}|${setName ?? ""}|${setCode ?? ""}`;
}

async function fetchPriceBatch(
  cards: DemoOwnedCard[],
  currency: Currency
): Promise<Map<string, CardTraderQuote>> {
  const keys = cards.map((item) => cardPriceKey(item));
  const inputs = cards.map((item) => ownedCardToPriceInput(item));
  return fetchCardTraderPriceMap(inputs, keys, currency) as Promise<Map<string, CardTraderQuote>>;
}

export function useCardTraderOwnedQuote(
  card: DemoOwnedCard | null,
  currency: Currency,
  enabled: boolean
) {
  const priceRefreshKey = useCollectionUIStore((s) => s.priceRefreshKey);

  const input = useMemo(() => (card ? ownedCardToPriceInput(card) : null), [card]);

  return useQuery({
    queryKey: [
      "cardtrader-owned-quote",
      priceRefreshKey,
      currency,
      card?.id,
      input?.name,
      input?.setName,
      input?.setCode,
      input?.rarity,
      input?.cardTraderBlueprintId,
    ],
    enabled: enabled && !!input,
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const quote = await fetchCardTraderQuote(input!, currency);
      return quote as CardTraderQuote | null;
    },
  });
}

export function useCardTraderVariantPrices(
  cardName: string,
  gameSlug: string,
  variants: Array<{
    key: string;
    setName: string | null;
    setCode: string | null;
    collectorNumber?: string | null;
    rarity?: string | null;
    variantLabel?: string | null;
    tcgPlayerId?: string | null;
    cardTraderRarityHint?: string | null;
    blueprintId?: number | null;
    imageUrl?: string | null;
    cardTraderBlueprintId?: string | null;
  }>,
  currency: Currency,
  enabled: boolean
) {
  const priceRefreshKey = useCollectionUIStore((s) => s.priceRefreshKey);

  const queryKey = useMemo(
    () => [
      "cardtrader-variant-prices",
      priceRefreshKey,
      gameSlug,
      cardName,
      currency,
      variants
        .map((v) => `${v.key}|${v.setName ?? ""}|${v.setCode ?? ""}|${v.rarity ?? ""}|${v.blueprintId ?? ""}`)
        .join(","),
    ],
    [priceRefreshKey, gameSlug, cardName, currency, variants]
  );

  return useQuery({
    queryKey,
    enabled: enabled && variants.length > 0,
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const merged = new Map<string, CardTraderQuote>();
      for (let i = 0; i < variants.length; i += BATCH_SIZE) {
        const batch = variants.slice(i, i + BATCH_SIZE);
        const keys = batch.map((v) => v.key);
        const inputs: CardPriceInput[] = batch.map((v) => ({
          gameSlug,
          name: cardName,
          setName: v.setName,
          setCode: v.setCode,
          collectorNumber: v.collectorNumber,
          rarity: v.cardTraderRarityHint ?? v.rarity,
          variantLabel: v.variantLabel,
          tcgPlayerId: v.tcgPlayerId,
          blueprintId: v.blueprintId,
          imageUrl: v.imageUrl,
          cardTraderBlueprintId: v.cardTraderBlueprintId,
        }));
        const batchMap = await fetchCardTraderPriceMap(inputs, keys, currency);
        batchMap.forEach((value, key) => merged.set(key, value as CardTraderQuote));
        if (i + BATCH_SIZE < variants.length) {
          await sleep(BATCH_DELAY_MS);
        }
      }
      return merged;
    },
  });
}

export function useCardTraderPrices(
  cards: DemoOwnedCard[],
  currency: Currency,
  enabled = true
) {
  const queryClient = useQueryClient();
  const priceRefreshKey = useCollectionUIStore((s) => s.priceRefreshKey);

  const targets = useMemo(() => dedupeOwnedCardsForPrices(cards), [cards]);

  const queryKey = useMemo(
    () => ["cardtrader-prices", priceRefreshKey, currency, fingerprintPriceTargets(targets)],
    [priceRefreshKey, currency, targets]
  );

  return useQuery({
    queryKey,
    enabled: enabled && targets.length > 0,
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const merged = new Map<string, CardTraderQuote>();

      for (let i = 0; i < targets.length; i += BATCH_SIZE) {
        const batch = targets.slice(i, i + BATCH_SIZE);
        const batchMap = await fetchPriceBatch(batch, currency);
        batchMap.forEach((value, key) => merged.set(key, value));

        // Progressive UI: show prices as each batch completes.
        queryClient.setQueryData(queryKey, new Map(merged));

        if (i + BATCH_SIZE < targets.length) {
          await sleep(BATCH_DELAY_MS);
        }
      }

      return merged;
    },
  });
}

export function resolveDisplayPrice(
  item: DemoOwnedCard,
  livePrices: Map<string, CardTraderQuote> | undefined,
  profileCurrency: Currency = "USD"
): number | null {
  const live = livePrices?.get(cardPriceKey(item));
  if (live?.price != null) return live.price;
  // Catalog marketPrice is USD (TCGPlayer/YGOPRODeck) — do not inflate to BRL when CardTrader is unavailable.
  if (profileCurrency !== "USD") return null;
  return normalizeCatalogPrice(item.card.marketPrice, profileCurrency);
}

export function resolveCardTraderUrl(
  item: DemoOwnedCard,
  livePrices: Map<string, CardTraderQuote> | undefined
): string | null {
  const live = livePrices?.get(cardPriceKey(item));
  if (live?.url) {
    const bpId = live.blueprintId ? Number(live.blueprintId) : null;
    if (
      bpId == null ||
      cardTraderBlueprintMatchesCard(bpId, {
        rarity: item.card.rarity,
        gameSlug: item.card.gameSlug,
        imageUrl: item.card.imageUrl,
        setCode: item.card.setCode,
      })
    ) {
      return live.url;
    }
  }
  return resolveCardTraderProductUrl({
    name: item.card.name,
    gameSlug: item.card.gameSlug,
    externalId: item.card.externalId,
    cardTraderBlueprintId: item.card.cardTraderBlueprintId,
    setName: item.card.setName,
    setCode: item.card.setCode,
    rarity: item.card.rarity,
    imageUrl: item.card.imageUrl,
  });
}

export function resolveCardTraderImage(
  item: DemoOwnedCard,
  livePrices: Map<string, CardTraderQuote> | undefined
): string | null {
  return livePrices?.get(cardPriceKey(item))?.imageUrl ?? null;
}
