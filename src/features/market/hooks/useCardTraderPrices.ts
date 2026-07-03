"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { CardPriceInput } from "@/lib/cardtrader";
import type { DemoOwnedCard } from "@/lib/demo/types";
import type { Currency } from "@/types/tcg";
import { useCollectionUIStore } from "@/features/collection/stores/collection-ui.store";

interface CardTraderQuote {
  price: number;
  currency: Currency;
  url: string;
  imageUrl?: string | null;
}

const BATCH_SIZE = 8;
const MAX_CARDS = 48;
const SEQUENTIAL_DELAY_MS = 150;

async function fetchSinglePrice(
  input: CardPriceInput,
  currency: Currency
): Promise<CardTraderQuote | null> {
  const res = await fetch("/api/cards/prices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currency, cards: [input] }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    configured: boolean;
    prices: Array<CardTraderQuote | null>;
  };
  if (!json.configured) return null;
  return json.prices[0] ?? null;
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Fetches variant prices one-by-one to avoid CardTrader rate limits. */
export function useSequentialVariantPrices(
  cardName: string,
  gameSlug: string,
  variants: Array<{
    key: string;
    setName: string | null;
    setCode: string | null;
    rarity?: string | null;
    blueprintId?: number | null;
  }>,
  currency: Currency,
  enabled: boolean
) {
  const priceRefreshKey = useCollectionUIStore((s) => s.priceRefreshKey);
  const [prices, setPrices] = useState<Map<string, CardTraderQuote>>(new Map());
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set());
  const [resolvedKeys, setResolvedKeys] = useState<Set<string>>(new Set());
  const runIdRef = useRef(0);

  const variantSignature = useMemo(
    () =>
      variants
        .map((v) => `${v.key}|${v.setName ?? ""}|${v.setCode ?? ""}|${v.rarity ?? ""}|${v.blueprintId ?? ""}`)
        .join(","),
    [variants]
  );

  useEffect(() => {
    if (!enabled || variants.length === 0) {
      setPrices(new Map());
      setPendingKeys(new Set());
      setResolvedKeys(new Set());
      return;
    }

    const runId = ++runIdRef.current;
    setPrices(new Map());
    setPendingKeys(new Set(variants.map((v) => v.key)));
    setResolvedKeys(new Set());

    void (async () => {
      for (const variant of variants) {
        if (runIdRef.current !== runId) return;

        const input: CardPriceInput = {
          gameSlug,
          name: cardName,
          setName: variant.setName,
          setCode: variant.setCode,
          rarity: variant.rarity,
          blueprintId: variant.blueprintId,
        };

        try {
          const quote = await fetchSinglePrice(input, currency);
          if (runIdRef.current !== runId) return;
          if (quote) {
            setPrices((prev) => {
              const next = new Map(prev);
              next.set(variant.key, quote);
              return next;
            });
          }
        } finally {
          if (runIdRef.current !== runId) return;
          setPendingKeys((prev) => {
            const next = new Set(prev);
            next.delete(variant.key);
            return next;
          });
          setResolvedKeys((prev) => new Set(prev).add(variant.key));
        }

        if (runIdRef.current !== runId) return;
        await sleep(SEQUENTIAL_DELAY_MS);
      }
    })();
  }, [enabled, gameSlug, cardName, currency, variantSignature, priceRefreshKey, variants]);

  const isFetching = pendingKeys.size > 0;

  return { data: prices, isFetching, pendingKeys, resolvedKeys };
}

export function cardPriceKey(card: DemoOwnedCard): string {
  return `${card.card.gameSlug}|${card.card.externalId ?? card.card.name}|${card.card.setName ?? ""}|${card.card.setCode ?? ""}|${card.card.rarity ?? ""}`;
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
  const inputs: CardPriceInput[] = cards.map((item) => ({
    gameSlug: item.card.gameSlug,
    name: item.card.name,
    setName: item.card.setName,
    setCode: item.card.setCode,
    rarity: item.card.rarity,
    condition: item.condition,
    language: item.language,
    isFoil: item.isFoil,
  }));
  return fetchPriceBatchByInput(inputs, keys, currency);
}

export function useCardTraderVariantPrices(
  cardName: string,
  gameSlug: string,
  variants: Array<{
    key: string;
    setName: string | null;
    setCode: string | null;
    rarity?: string | null;
    blueprintId?: number | null;
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
      variants.map((v) => `${v.key}|${v.setName ?? ""}|${v.setCode ?? ""}|${v.rarity ?? ""}|${v.blueprintId ?? ""}`).join(","),
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
          rarity: v.rarity,
          blueprintId: v.blueprintId,
        }));
        const batchMap = await fetchPriceBatchByInput(inputs, keys, currency);
        batchMap.forEach((value, key) => merged.set(key, value));
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
  const priceRefreshKey = useCollectionUIStore((s) => s.priceRefreshKey);

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
      priceRefreshKey,
      currency,
      targets
        .map(
          (c) =>
            `${cardPriceKey(c)}|${c.card.setName ?? ""}|${c.card.setCode ?? ""}|${c.card.rarity ?? ""}|${c.condition}|${c.language}`
        )
        .join(","),
    ],
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
