"use client";

import { useMemo, useCallback, useEffect, useRef } from "react";
import { useCollectionUIStore } from "@/features/collection/stores/collection-ui.store";
import { filterOwnedCards, sortOwnedCards } from "@/features/collection/utils/filters";
import {
  cardPriceKey,
  mergeCardTraderQuoteMaps,
  resolveDisplayPrice,
  resolveCardTraderUrl,
  resolveCardTraderImage,
  useCardTraderPrices,
} from "@/features/market/hooks/useCardTraderPrices";
import { useCardTraderBulkStore } from "@/features/collection/stores/cardtrader-bulk.store";
import { useAppData } from "@/hooks/useAppData";
import { useDataUiStore } from "@/lib/data/ui-store";
import { mergeIdOrder } from "@/lib/collections/card-order";
import {
  initialBinderLayout,
  mergeBinderLayout,
} from "@/lib/collections/binder-layout";
import { cardTraderBlueprintMatchesCard } from "@/lib/cardtrader";
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
  activeCollectionId: string | null;
  reorderCard: (draggedId: string, targetId: string | null) => void;
  reorderCardToIndex: (draggedId: string, targetIndex: number) => void;
  binderLayout: (string | null)[];
  moveCardToBinderSlot: (draggedId: string, targetIndex: number) => void;
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
  const cardOrderByCollection = useDataUiStore((s) => s.cardOrderByCollection);
  const binderLayoutByCollection = useDataUiStore((s) => s.binderLayoutByCollection);
  const reorderCardInStore = useDataUiStore((s) => s.reorderCard);
  const reorderCardToIndexInStore = useDataUiStore((s) => s.reorderCardToIndex);
  const moveCardToBinderSlotInStore = useDataUiStore((s) => s.moveCardToBinderSlot);

  const collectionCards = useMemo(
    () => ownedCards.filter((oc) => oc.collectionId === activeCollectionId),
    [ownedCards, activeCollectionId]
  );

  const { data: liveCardTraderPrices, isFetching: pricesFetching } = useCardTraderPrices(
    collectionCards,
    profile.currency,
    !isLoading && !isError
  );

  const bulkQuotes = useCardTraderBulkStore((s) => s.quotesByKey);

  const cardTraderPrices = useMemo(
    () => mergeCardTraderQuoteMaps(bulkQuotes, liveCardTraderPrices),
    [bulkQuotes, liveCardTraderPrices]
  );

  const filteredBase = useMemo(() => {
    const f = filterOwnedCards(ownedCards, filters, activeCollectionId);
    let sorted = sortOwnedCards(f, sortField, sortDir);

    if (!activeCollectionId) return sorted;
    const savedOrder = cardOrderByCollection[activeCollectionId];
    if (!savedOrder?.length) return sorted;

    const merged = mergeIdOrder(
      savedOrder,
      sorted.map((item) => item.id)
    );
    const byId = new Map(sorted.map((item) => [item.id, item]));
    return merged
      .map((id) => byId.get(id))
      .filter((item): item is DemoOwnedCard => item != null);
  }, [ownedCards, filters, activeCollectionId, sortField, sortDir, cardOrderByCollection]);

  const filtered = useMemo(() => {
    if (sortField !== "marketPrice") return filteredBase;
    return [...filteredBase].sort((a, b) => {
      const av = resolveDisplayPrice(a, cardTraderPrices, profile.currency) ?? 0;
      const bv = resolveDisplayPrice(b, cardTraderPrices, profile.currency) ?? 0;
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [filteredBase, sortField, sortDir, cardTraderPrices, profile.currency]);

  const allIds = useMemo(() => filtered.map((oc) => oc.id), [filtered]);

  const binderLayout = useMemo(() => {
    if (!activeCollectionId) return [];
    const ids = filtered.map((item) => item.id);
    const savedLayout = binderLayoutByCollection[activeCollectionId];
    if (savedLayout?.length) return mergeBinderLayout(savedLayout, ids);
    const savedOrder = cardOrderByCollection[activeCollectionId];
    if (savedOrder?.length) return mergeBinderLayout(savedOrder, ids);
    return initialBinderLayout(ids);
  }, [activeCollectionId, filtered, binderLayoutByCollection, cardOrderByCollection]);

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
    (item: DemoOwnedCard) => resolveDisplayPrice(item, cardTraderPrices, profile.currency),
    [cardTraderPrices, profile.currency]
  );

  const reorderCard = useCallback(
    (draggedId: string, targetId: string | null) => {
      if (!activeCollectionId) return;
      reorderCardInStore(activeCollectionId, draggedId, targetId);
    },
    [activeCollectionId, reorderCardInStore]
  );

  const reorderCardToIndex = useCallback(
    (draggedId: string, targetIndex: number) => {
      if (!activeCollectionId) return;
      reorderCardToIndexInStore(activeCollectionId, draggedId, targetIndex);
    },
    [activeCollectionId, reorderCardToIndexInStore]
  );

  const moveCardToBinderSlot = useCallback(
    (draggedId: string, targetIndex: number) => {
      if (!activeCollectionId) return;
      moveCardToBinderSlotInStore(activeCollectionId, draggedId, targetIndex);
    },
    [activeCollectionId, moveCardToBinderSlotInStore]
  );

  const syncedBlueprintRef = useRef(new Set<string>());

  useEffect(() => {
    if (!cardTraderPrices?.size) return;

    for (const item of collectionCards) {
      const quote = cardTraderPrices.get(cardPriceKey(item));
      if (!quote?.blueprintId) continue;

      const syncKey = `${item.id}:${quote.blueprintId}:${quote.imageUrl ?? ""}`;
      if (syncedBlueprintRef.current.has(syncKey)) continue;

      const bpId = Number(quote.blueprintId);
      const blueprintValid =
        Number.isFinite(bpId) &&
        cardTraderBlueprintMatchesCard(bpId, {
          rarity: item.card.rarity,
          gameSlug: item.card.gameSlug,
          imageUrl: item.card.imageUrl,
          setCode: item.card.setCode,
        });

      const updates: Partial<DemoOwnedCard["card"]> = {};
      if (blueprintValid && quote.blueprintId !== item.card.cardTraderBlueprintId) {
        updates.cardTraderBlueprintId = quote.blueprintId;
      }
      if (
        quote.imageUrl &&
        quote.imageUrl !== item.card.imageUrl &&
        blueprintValid &&
        item.card.gameSlug !== "yugioh"
      ) {
        updates.imageUrl = quote.imageUrl;
      }

      if (Object.keys(updates).length > 0) {
        syncedBlueprintRef.current.add(syncKey);
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
    activeCollectionId,
    reorderCard,
    reorderCardToIndex,
    binderLayout,
    moveCardToBinderSlot,
  };
}
