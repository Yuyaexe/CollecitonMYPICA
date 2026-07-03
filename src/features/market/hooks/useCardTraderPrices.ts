"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { CardPriceInput } from "@/lib/cardtrader";
import type { DemoOwnedCard } from "@/lib/demo/types";
import type { Currency } from "@/types/tcg";

interface CardTraderQuote {
  price: number;
  currency: Currency;
  url: string;
  imageUrl?: string | null;
}

const BATCH_SIZE = 8;
const PARALLEL_BATCHES = 2;
const MAX_CARDS = 48;

export function cardPriceKey(card: DemoOwnedCard): string {
  return `${card.card.gameSlug}|${card.card.externalId ?? card.card.name}|${card.card.setName ?? ""}`;
}

export function variantPriceKey(
  gameSlug: string,
  name: string,
  setName?: string | null,
  setCode?: string | null
): string {
  return `${gameSlug}|${name}|${setName ?? ""}|${setCode ?? ""}`;
}

async function fetchPriceBatchByInput(
  inputs: CardPriceInput[],
  keys: string[],
  currency: Currency
): Promise<Map<string, CardTraderQuote>> {
  const map = new Map<string, CardTraderQuote>();
  if (inputs.length === 0) return map;

  const res = await fetch("/api/cards/prices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currency, cards: inputs }),
  });

  if (!res.ok) return map;
  const json = (await res.json()) as {
    configured: boolean;
    prices: Array<CardTraderQuote | null>;
  };
  if (!json.configured) return map;

  inputs.forEach((_input, index) => {
    const quote = json.prices[index];
    if (quote) map.set(keys[index], quote);
  });

  return map;
}

async function fetchPriceBatch(
  cards: DemoOwnedCard[],
  currency: Currency
): Promise<Map<string, CardTraderQuote>> {
  const keys = cards.map((item) => cardPriceKey(item));
  const inputs: CardPriceInput[] = cards.map((item) => ({
    gameSlug: item.card.gameSlug,
    name: item.card.name,
    setName: item.card.setName,
    setCode: item.card.setCode,
    condition: item.condition,
    language: item.language,
    isFoil: item.isFoil,
  }));
  return fetchPriceBatchByInput(inputs, keys, currency);
}

export function useCardTraderVariantPrices(
  cardName: string,
  gameSlug: string,
  variants: Array<{ key: string; setName: string | null; setCode: string | null }>,
  currency: Currency,
  enabled: boolean
) {
  const queryKey = useMemo(
    () => [
      "cardtrader-variant-prices",
      gameSlug,
      cardName,
      currency,
      variants.map((v) => `${v.key}|${v.setName ?? ""}|${v.setCode ?? ""}`).join(","),
    ],
    [gameSlug, cardName, currency, variants]
  );

  return useQuery({
    queryKey,
    enabled: enabled && variants.length > 0,
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const merged = new Map<string, CardTraderQuote>();
      const chunks: Array<typeof variants> = [];
      for (let i = 0; i < variants.length; i += BATCH_SIZE) {
        chunks.push(variants.slice(i, i + BATCH_SIZE));
      }

      for (let i = 0; i < chunks.length; i += PARALLEL_BATCHES) {
        const parallel = chunks.slice(i, i + PARALLEL_BATCHES);
        const results = await Promise.all(
          parallel.map(async (batch) => {
            const keys = batch.map((v) => v.key);
            const inputs: CardPriceInput[] = batch.map((v) => ({
              gameSlug,
              name: cardName,
              setName: v.setName,
              setCode: v.setCode,
            }));
            return fetchPriceBatchByInput(inputs, keys, currency);
          })
        );
        results.forEach((batchMap) => {
          batchMap.forEach((value, key) => merged.set(key, value));
        });
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
  const targets = useMemo(() => {
    const seen = new Set<string>();
    const list: DemoOwnedCard[] = [];

    for (const item of cards) {
      const key = cardPriceKey(item);
      if (seen.has(key)) continue;
      seen.add(key);
      list.push(item);
      if (list.length >= MAX_CARDS) break;
    }

    return list;
  }, [cards]);

  const queryKey = useMemo(
    () => [
      "cardtrader-prices",
      currency,
      targets
        .map(
          (c) =>
            `${cardPriceKey(c)}|${c.card.setName ?? ""}|${c.card.setCode ?? ""}|${c.card.rarity ?? ""}|${c.condition}|${c.language}`
        )
        .join(","),
    ],
    [currency, targets]
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
      }
      return merged;
    },
  });
}

export function resolveDisplayPrice(
  item: DemoOwnedCard,
  livePrices: Map<string, CardTraderQuote> | undefined
): number | null {
  const live = livePrices?.get(cardPriceKey(item));
  if (live) return live.price;
  return item.card.marketPrice;
}

export function resolveCardTraderUrl(
  item: DemoOwnedCard,
  livePrices: Map<string, CardTraderQuote> | undefined
): string | null {
  return livePrices?.get(cardPriceKey(item))?.url ?? null;
}

export function resolveCardTraderImage(
  item: DemoOwnedCard,
  livePrices: Map<string, CardTraderQuote> | undefined
): string | null {
  return livePrices?.get(cardPriceKey(item))?.imageUrl ?? null;
}
