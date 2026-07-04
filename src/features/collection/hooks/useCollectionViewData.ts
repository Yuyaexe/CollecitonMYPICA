"use client";

import { useMemo, useCallback, useEffect } from "react";
import { useCollectionUIStore } from "@/features/collection/stores/collection-ui.store";
import { filterOwnedCards, sortOwnedCards } from "@/features/collection/utils/filters";
import {
  cardPriceKey,
  resolveDisplayPrice,
  resolveCardTraderUrl,
  resolveCardTraderImage,
  useCardTraderPrices,
} from "@/features/market/hooks/useCardTraderPrices";
import { useAppData } from "@/hooks/useAppData";
import type { DemoOwnedCard } from "@/lib/demo/types";
import type { Currency } from "@/types/tcg";

export interface CollectionViewData {
  filtered: DemoOwnedCard[];
  allIds: string[];
  collectionCards: DemoOwnedCard[];
  cardTraderPrices: ReturnType<typeof useCardTraderPrices>["data"];
  pricesFetching: boolean;
  profileCurrency: Currency;
  isLoading: boolean;
  isError: boolean;
  handleQuantityChange: (id: string, quantity: number) => void;
  handleRemove: (id: string) => void;
  resolvePrice: (item: DemoOwnedCard) => number | null;
  resolveCardTraderImage: (item: DemoOwnedCard) => string | null;
  openCardTraderLink: (item: DemoOwnedCard) => void;
}

export function useCollectionViewData(): CollectionViewData {
  const {
    ownedCards,
    activeCollectionId,
    profile,
    deleteOwnedCards,
    updateOwnedCard,
    isLoading,
    isError,
  } = useAppData();

  const filters = useCollectionUIStore((s) => s.filters);
  const sortField = useCollectionUIStore((s) => s.sortField);
  const sortDir = useCollectionUIStore((s) => s.sortDir);
  const focusedRowIndex = useCollectionUIStore((s) => s.focusedRowIndex);
  const setFocusedRowIndex = useCollectionUIStore((s) => s.setFocusedRowIndex);

  const collectionCards = useMemo(
    () => ownedCards.filter((oc) => oc.collectionId === activeCollectionId),
    [ownedCards, activeCollectionId]
  );

  const { data: cardTraderPrices, isFetching: pricesFetching } = useCardTraderPrices(
    collectionCards,
    profile.currency,
    !isLoading && !isError
  );

  const filtered = useMemo(() => {
    const f = filterOwnedCards(ownedCards, filters, activeCollectionId);
    const sorted = sortOwnedCards(f, sortField, sortDir);
    if (sortField !== "marketPrice") return sorted;

    return [...sorted].sort((a, b) => {
      const av = resolveDisplayPrice(a, cardTraderPrices) ?? a.card.marketPrice ?? 0;
      const bv = resolveDisplayPrice(b, cardTraderPrices) ?? b.card.marketPrice ?? 0;
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [
    ownedCards,
    filters,
    activeCollectionId,
    sortField,
    sortDir,
    cardTraderPrices,
  ]);

  const allIds = useMemo(() => filtered.map((oc) => oc.id), [filtered]);

  useEffect(() => {
    if (focusedRowIndex >= filtered.length) {
      setFocusedRowIndex(Math.max(0, filtered.length - 1));
    }
  }, [filtered.length, focusedRowIndex, setFocusedRowIndex]);

  const handleQuantityChange = useCallback(
    (id: string, quantity: number) => {
      if (quantity < 1) {
        void deleteOwnedCards([id]);
        return;
      }
      void updateOwnedCard(id, { quantity });
    },
    [updateOwnedCard, deleteOwnedCards]
  );

  const handleRemove = useCallback(
    (id: string) => {
      void deleteOwnedCards([id]);
    },
    [deleteOwnedCards]
  );

  const resolvePrice = useCallback(
    (item: DemoOwnedCard) => resolveDisplayPrice(item, cardTraderPrices),
    [cardTraderPrices]
  );

  useEffect(() => {
    if (!cardTraderPrices?.size) return;

    for (const item of collectionCards) {
      const quote = cardTraderPrices.get(cardPriceKey(item));
      if (!quote?.blueprintId) continue;

      const updates: Partial<DemoOwnedCard["card"]> = {};
      if (quote.blueprintId !== item.card.cardTraderBlueprintId) {
        updates.cardTraderBlueprintId = quote.blueprintId;
      }
      if (quote.imageUrl && quote.imageUrl !== item.card.imageUrl) {
        updates.imageUrl = quote.imageUrl;
      }
      if (quote.price != null && quote.price !== item.card.marketPrice) {
        updates.marketPrice = quote.price;
      }

      if (Object.keys(updates).length > 0) {
        void updateOwnedCard(item.id, { card: updates });
      }
    }
  }, [cardTraderPrices, collectionCards, updateOwnedCard]);

  const resolveCardTraderImageForItem = useCallback(
    (item: DemoOwnedCard) => resolveCardTraderImage(item, cardTraderPrices),
    [cardTraderPrices]
  );

  const openCardTraderLink = useCallback(
    (item: DemoOwnedCard) => {
      const url = resolveCardTraderUrl(item, cardTraderPrices);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    },
    [cardTraderPrices]
  );

  return {
    filtered,
    allIds,
    collectionCards,
    cardTraderPrices,
    pricesFetching,
    profileCurrency: profile.currency,
    isLoading,
    isError,
    handleQuantityChange,
    handleRemove,
    resolvePrice,
    resolveCardTraderImage: resolveCardTraderImageForItem,
    openCardTraderLink,
  };
}
