"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDemoStore } from "@/lib/demo/store";
import { useDataUiStore } from "@/lib/data/ui-store";
import { DEFAULT_COLLECTION_ID } from "@/lib/demo/types";
import type { DemoOwnedCard, DemoProfile, DemoCollection, DemoTag } from "@/lib/demo/types";
import type { CardSearchResult } from "@/features/catalog/services/card-api/types";
import type { CardCondition, CardLanguage } from "@/types/tcg";

async function fetchConfig(): Promise<{ mode: "database" | "demo" }> {
  const res = await fetch("/api/app/config");
  if (!res.ok) return { mode: "demo" };
  return res.json();
}

interface AppState {
  profile: DemoProfile;
  collections: DemoCollection[];
  ownedCards: DemoOwnedCard[];
  wishlistCardIds: string[];
  tags: DemoTag[];
}

async function fetchAppState(): Promise<AppState> {
  const res = await fetch("/api/app/state");
  if (!res.ok) throw new Error("Failed to load state");
  return res.json();
}

export function useAppData() {
  const queryClient = useQueryClient();
  const demo = useDemoStore();

  const activeCollectionId = useDataUiStore((s) => s.activeCollectionId);
  const setActiveCollectionId = useDataUiStore((s) => s.setActiveCollectionId);

  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ["app-config"],
    queryFn: fetchConfig,
    staleTime: Infinity,
  });

  const isDatabaseMode = config?.mode === "database";

  const {
    data: serverState,
    isLoading: stateLoading,
    isError: stateError,
  } = useQuery({
    queryKey: ["app-state"],
    queryFn: fetchAppState,
    enabled: isDatabaseMode,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["app-state"] });
  }, [queryClient]);

  const profile = isDatabaseMode && serverState ? serverState.profile : demo.profile;
  const collections =
    isDatabaseMode && serverState ? serverState.collections : demo.collections;
  const ownedCards =
    isDatabaseMode && serverState ? serverState.ownedCards : demo.ownedCards;
  const wishlistCardIds =
    isDatabaseMode && serverState ? serverState.wishlistCardIds : demo.wishlistCardIds;

  const resolvedActiveId = useMemo(() => {
    if (activeCollectionId && collections.some((c) => c.id === activeCollectionId)) {
      return activeCollectionId;
    }
    const defaultCol =
      collections.find((c) => c.isDefault) ?? collections[0];
    return defaultCol?.id ?? DEFAULT_COLLECTION_ID;
  }, [activeCollectionId, collections]);

  useEffect(() => {
    if (!isDatabaseMode && !activeCollectionId && demo.activeCollectionId) {
      setActiveCollectionId(demo.activeCollectionId);
    }
  }, [isDatabaseMode, activeCollectionId, demo.activeCollectionId, setActiveCollectionId]);

  useEffect(() => {
    if (
      isDatabaseMode &&
      serverState &&
      resolvedActiveId &&
      activeCollectionId !== resolvedActiveId &&
      !collections.some((c) => c.id === activeCollectionId)
    ) {
      setActiveCollectionId(resolvedActiveId);
    }
  }, [
    isDatabaseMode,
    serverState,
    resolvedActiveId,
    activeCollectionId,
    collections,
    setActiveCollectionId,
  ]);

  const setActiveCollection = useCallback(
    (id: string) => {
      setActiveCollectionId(id);
      if (!isDatabaseMode) demo.setActiveCollection(id);
    },
    [setActiveCollectionId, isDatabaseMode, demo]
  );

  const profileMutation = useMutation({
    mutationFn: async (updates: Partial<DemoProfile>) => {
      if (!isDatabaseMode) {
        demo.updateProfile(updates);
        return;
      }
      const res = await fetch("/api/app/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update profile");
    },
    onSuccess: invalidate,
  });

  const addCollectionMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!isDatabaseMode) {
        demo.addCollection(name);
        return;
      }
      const res = await fetch("/api/app/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to create collection");
    },
    onSuccess: invalidate,
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!isDatabaseMode) {
        demo.toggleCollectionFavorite(id);
        return;
      }
      const res = await fetch("/api/app/collections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed to update collection");
    },
    onSuccess: invalidate,
  });

  const addCardMutation = useMutation({
    mutationFn: async (args: {
      result: CardSearchResult;
      gameId: string;
      gameSlug: string;
      gameName: string;
    }) => {
      if (!isDatabaseMode) {
        demo.addCardFromSearch(
          args.result,
          args.gameId,
          args.gameSlug,
          args.gameName
        );
        return;
      }
      const res = await fetch("/api/app/owned-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add-from-search",
          collectionId: resolvedActiveId,
          ...args,
        }),
      });
      if (!res.ok) throw new Error("Failed to add card");
    },
    onSuccess: invalidate,
  });

  const updateCardMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<DemoOwnedCard> & { card?: Partial<DemoOwnedCard["card"]> };
    }) => {
      if (!isDatabaseMode) {
        demo.updateOwnedCard(id, updates);
        return;
      }
      const res = await fetch("/api/app/owned-cards", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, updates }),
      });
      if (!res.ok) throw new Error("Failed to update card");
    },
    onSuccess: invalidate,
  });

  const deleteCardsMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      if (!isDatabaseMode) {
        demo.deleteOwnedCards(ids);
        return;
      }
      const res = await fetch("/api/app/owned-cards", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error("Failed to delete cards");
    },
    onSuccess: invalidate,
  });

  const importMutation = useMutation({
    mutationFn: async ({
      rows,
      mergeDuplicates,
    }: {
      rows: Parameters<typeof demo.importRows>[0];
      mergeDuplicates: boolean;
    }) => {
      if (!isDatabaseMode) {
        return demo.importRows(rows, mergeDuplicates);
      }
      const res = await fetch("/api/app/owned-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "import",
          collectionId: resolvedActiveId,
          rows,
          mergeDuplicates,
        }),
      });
      if (!res.ok) throw new Error("Failed to import");
      const json = await res.json();
      return json.imported as number;
    },
    onSuccess: invalidate,
  });

  const wishlistMutation = useMutation({
    mutationFn: async (cardId: string) => {
      if (!isDatabaseMode) {
        demo.toggleWishlist(cardId);
        return;
      }
      const res = await fetch("/api/app/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId }),
      });
      if (!res.ok) throw new Error("Failed to toggle wishlist");
    },
    onSuccess: invalidate,
  });

  return {
    isDatabaseMode,
    isLoading: configLoading || (isDatabaseMode && stateLoading),
    isError: isDatabaseMode && stateError,
    profile,
    collections,
    ownedCards,
    wishlistCardIds,
    activeCollectionId: resolvedActiveId,
    setActiveCollection,
    updateProfile: (updates: Partial<DemoProfile>) =>
      profileMutation.mutateAsync(updates),
    addCollection: (name: string) => addCollectionMutation.mutateAsync(name),
    toggleCollectionFavorite: (id: string) =>
      toggleFavoriteMutation.mutateAsync(id),
    addCardFromSearch: (
      result: CardSearchResult,
      gameId: string,
      gameSlug: string,
      gameName: string
    ) => addCardMutation.mutateAsync({ result, gameId, gameSlug, gameName }),
    updateOwnedCard: (
      id: string,
      updates: Partial<DemoOwnedCard> & { card?: Partial<DemoOwnedCard["card"]> }
    ) => updateCardMutation.mutateAsync({ id, updates }),
    deleteOwnedCards: (ids: string[]) => deleteCardsMutation.mutateAsync(ids),
    importRows: (
      rows: Array<{
        name: string;
        set?: string;
        quantity: number;
        condition: CardCondition;
        language: CardLanguage;
        gameId: string;
        gameSlug: string;
        gameName: string;
        isFoil?: boolean;
        purchasePrice?: number;
      }>,
      mergeDuplicates: boolean
    ) => importMutation.mutateAsync({ rows, mergeDuplicates }),
    toggleWishlist: (cardId: string) => wishlistMutation.mutateAsync(cardId),
  };
}
