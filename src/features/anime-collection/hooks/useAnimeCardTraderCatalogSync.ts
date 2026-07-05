"use client";

import { useEffect, useRef } from "react";
import { cardTraderBlueprintMatchesCard } from "@/lib/cardtrader";
import { isCardTraderHostedImage } from "@/lib/cardtrader/images";
import { cardPriceKey } from "@/features/market/hooks/useCardTraderPrices";
import { animeCharacterCardToOwned } from "@/features/anime-collection/utils/character-card-inspect";
import type { AnimeCharacterCard } from "@/lib/demo/types";

type CardTraderQuote = {
  blueprintId?: string | null;
  imageUrl?: string | null;
};

/** Sync CardTrader blueprint + art from batched price quotes (replaces sequential per-card fetch). */
export function useAnimeCardTraderCatalogSync(
  cards: AnimeCharacterCard[],
  cardTraderPrices: Map<string, CardTraderQuote> | undefined,
  onUpdate: (
    id: string,
    updates: Partial<Omit<AnimeCharacterCard, "card">> & {
      card?: Partial<AnimeCharacterCard["card"]>;
    }
  ) => void
): void {
  const syncedRef = useRef(new Set<string>());

  useEffect(() => {
    if (!cardTraderPrices?.size) return;

    for (const item of cards) {
      const owned = animeCharacterCardToOwned(item);
      const quote = cardTraderPrices.get(cardPriceKey(owned));
      if (!quote) continue;

      const syncKey = `${item.id}:${quote.blueprintId ?? ""}:${quote.imageUrl ?? ""}`;
      if (syncedRef.current.has(syncKey)) continue;

      const bpId = quote.blueprintId ? Number(quote.blueprintId) : null;
      const blueprintValid =
        bpId != null &&
        Number.isFinite(bpId) &&
        cardTraderBlueprintMatchesCard(bpId, {
          rarity: item.card.rarity,
          gameSlug: item.card.gameSlug,
          imageUrl: item.card.imageUrl,
          setCode: item.card.setCode,
        });

      const updates: Partial<AnimeCharacterCard["card"]> = {};

      if (blueprintValid && quote.blueprintId && quote.blueprintId !== item.card.cardTraderBlueprintId) {
        updates.cardTraderBlueprintId = quote.blueprintId;
      }

      if (
        quote.imageUrl &&
        isCardTraderHostedImage(quote.imageUrl) &&
        quote.imageUrl !== item.card.imageUrl &&
        item.card.gameSlug !== "yugioh"
      ) {
        updates.imageUrl = quote.imageUrl;
      }

      if (Object.keys(updates).length > 0) {
        syncedRef.current.add(syncKey);
        onUpdate(item.id, { card: updates });
      }
    }
  }, [cards, cardTraderPrices, onUpdate]);
}
