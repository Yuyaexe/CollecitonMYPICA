"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useDemoStore } from "@/lib/demo/store";
import { useDataUiStore } from "@/lib/data/ui-store";
import { DEFAULT_COLLECTION_ID } from "@/lib/demo/types";
import type { DemoOwnedCard, DemoProfile, DemoCollection, DemoTag } from "@/lib/demo/types";
import type { CardSearchResult } from "@/features/catalog/services/card-api/types";
import type { CardCondition, CardLanguage } from "@/types/tcg";

type AppMode = "supabase" | "demo";

async function fetchConfig(): Promise<{ mode: AppMode }> {
  const res = await fetch("/api/app/config");
  if (!res.ok) return { mode: "demo" };
  return res.json();
}

interface AppState {
  profile: DemoProfile;
  collections: DemoCollection[];
  ownedCards: DemoOwnedCard[];
  tags: DemoTag[];
}

async function fetchAppState(): Promise<AppState> {
  const res = await fetch("/api/app/state");
  if (!res.ok) throw new Error("Failed to load state");
  return res.json();
}

export function useAppData() {
  const queryClient = useQueryClient();
  const demoOwnedCards = useDemoStore((s) => s.ownedCards);
  const demoCollections = useDemoStore((s) => s.collections);
  const demoProfile = useDemoStore((s) => s.profile);
  const demoTags = useDemoStore((s) => s.tags);
  const demoActiveCollectionId = useDemoStore((s) => s.activeCollectionId);

  const activeCollectionId = useDataUiStore((s) => s.activeCollectionId);
  const setActiveCollectionId = useDataUiStore((s) => s.setActiveCollectionId);

  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ["app-config"],
    queryFn: fetchConfig,
    staleTime: 30_000,
  });

  const mode = config?.mode ?? "demo";
  const isSupabaseMode = mode === "supabase";

  const {
    data: serverState,
    isLoading: stateLoading,
    isFetching: stateFetching,
    isError: stateError,
  } = useQuery({
    queryKey: ["app-state"],
    queryFn: fetchAppState,
    enabled: isSupabaseMode,
    staleTime: 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const invalidateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const invalidate = useCallback(() => {
    if (invalidateTimerRef.current) clearTimeout(invalidateTimerRef.current);
    invalidateTimerRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["app-state"] });
    }, 400);
  }, [queryClient]);

  useEffect(
    () => () => {
      if (invalidateTimerRef.current) clearTimeout(invalidateTimerRef.current);
    },
    []
  );

  const refreshAppState = useCallback(async () => {
    await queryClient.refetchQueries({ queryKey: ["app-state"] });
  }, [queryClient]);

  const profile = isSupabaseMode ? (serverState?.profile ?? demoProfile) : demoProfile;
  const collections = useMemo(
    () => (isSupabaseMode ? (serverState?.collections ?? []) : demoCollections),
    [isSupabaseMode, serverState?.collections, demoCollections]
  );
  const ownedCards = useMemo(
    () => (isSupabaseMode ? (serverState?.ownedCards ?? []) : demoOwnedCards),
    [isSupabaseMode, serverState?.ownedCards, demoOwnedCards]
  );
  const tags = useMemo(
    () => (isSupabaseMode ? (serverState?.tags ?? []) : demoTags),
    [isSupabaseMode, serverState?.tags, demoTags]
  );

  const resolvedActiveId = useMemo(() => {
    if (activeCollectionId && collections.some((c) => c.id === activeCollectionId)) {
      return activeCollectionId;
    }
    const defaultCol = collections.find((c) => c.isDefault) ?? collections[0];
    if (defaultCol?.id) return defaultCol.id;
    return isSupabaseMode ? null : DEFAULT_COLLECTION_ID;
  }, [activeCollectionId, collections, isSupabaseMode]);

  useEffect(() => {
    if (!isSupabaseMode && !activeCollectionId && demoActiveCollectionId) {
      setActiveCollectionId(demoActiveCollectionId);
    }
  }, [isSupabaseMode, activeCollectionId, demoActiveCollectionId, setActiveCollectionId]);

  useEffect(() => {
    if (
      isSupabaseMode &&
      serverState &&
      !stateFetching &&
      activeCollectionId &&
      !collections.some((c) => c.id === activeCollectionId)
    ) {
      const fallback = collections.find((c) => c.isDefault) ?? collections[0];
      if (fallback?.id) setActiveCollectionId(fallback.id);
    }
  }, [
    isSupabaseMode,
    serverState,
    stateFetching,
    activeCollectionId,
    collections,
    setActiveCollectionId,
  ]);

  useEffect(() => {
    if (!isSupabaseMode || !resolvedActiveId) return;

    const supabase = createClient();
    const topic = `owned_cards:${resolvedActiveId}`;

    for (const existing of supabase.getChannels()) {
      if (existing.topic === `realtime:${topic}`) {
        void supabase.removeChannel(existing);
      }
    }

    const channel = supabase.channel(topic);

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "owned_cards",
        filter: `collection_id=eq.${resolvedActiveId}`,
      },
      () => invalidate()
    );

    channel.subscribe();

    return () => {
      void channel.unsubscribe().then(() => {
        supabase.removeChannel(channel);
      });
    };
  }, [isSupabaseMode, resolvedActiveId, invalidate]);

  const setActiveCollection = useCallback(
    (id: string) => {
      setActiveCollectionId(id);
      if (!isSupabaseMode) useDemoStore.getState().setActiveCollection(id);
    },
    [setActiveCollectionId, isSupabaseMode]
  );

  const profileMutation = useMutation({
    mutationFn: async (updates: Partial<DemoProfile>) => {
      if (!isSupabaseMode) {
        useDemoStore.getState().updateProfile(updates);
        return;
      }
      const res = await fetch("/api/app/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      useDemoStore.getState().updateProfile(updates);
    },
    onSuccess: invalidate,
  });

  const addCollectionMutation = useMutation({
    mutationFn: async (name: string): Promise<DemoCollection> => {
      if (!isSupabaseMode) {
        return useDemoStore.getState().addCollection(name);
      }
      const res = await fetch("/api/app/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create collection");
      return json as DemoCollection;
    },
    onSuccess: (created) => {
      if (isSupabaseMode) {
        queryClient.setQueryData<AppState>(["app-state"], (prev) => {
          if (!prev) return prev;
          if (prev.collections.some((c) => c.id === created.id)) return prev;
          return { ...prev, collections: [...prev.collections, created] };
        });
      } else {
        useDemoStore.getState().setActiveCollection(created.id);
      }
      setActiveCollectionId(created.id);
      void queryClient.invalidateQueries({ queryKey: ["app-state"] });
    },
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!isSupabaseMode) {
        useDemoStore.getState().toggleCollectionFavorite(id);
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

  const renameCollectionMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      if (!isSupabaseMode) {
        useDemoStore.getState().renameCollection(id, name);
        return;
      }
      const res = await fetch("/api/app/collections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to rename collection");
    },
    onSuccess: invalidate,
  });

  const deleteCollectionMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!isSupabaseMode) {
        useDemoStore.getState().deleteCollection(id);
        setActiveCollectionId(useDemoStore.getState().activeCollectionId);
        return;
      }
      const res = await fetch("/api/app/collections", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to delete collection");
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
      if (!isSupabaseMode) {
        useDemoStore.getState().addCardFromSearch(
          args.result,
          args.gameId,
          args.gameSlug,
          args.gameName,
          resolvedActiveId ?? undefined
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
      await refreshAppState();
    },
    onSuccess: invalidate,
  });

  const updateCardMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
      silent,
    }: {
      id: string;
      updates: Partial<Omit<DemoOwnedCard, "card">> & { card?: Partial<DemoOwnedCard["card"]> };
      silent?: boolean;
    }) => {
      if (!isSupabaseMode) {
        useDemoStore.getState().updateOwnedCard(id, updates);
        return;
      }
      try {
        const res = await fetch("/api/app/owned-cards", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, updates }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? "Failed to update card");
        }
      } catch (error) {
        if (silent) {
          console.warn("[updateOwnedCard] silent update failed", id, error);
          return;
        }
        throw error;
      }
    },
    onMutate: async ({ id, updates, silent }) => {
      if (!isSupabaseMode) return { previous: undefined, silent };
      await queryClient.cancelQueries({ queryKey: ["app-state"] });
      const previous = queryClient.getQueryData<AppState>(["app-state"]);
      if (previous) {
        queryClient.setQueryData<AppState>(["app-state"], {
          ...previous,
          ownedCards: previous.ownedCards.map((oc) => {
            if (oc.id !== id) return oc;
            const { card: cardUpdates, ...ownedUpdates } = updates;
            const next: DemoOwnedCard = { ...oc, ...ownedUpdates };
            if (cardUpdates) {
              next.card = { ...oc.card, ...cardUpdates };
            }
            return next;
          }),
        });
      }
      return { previous, silent };
    },
    onError: (_err, variables, context) => {
      if (variables.silent) return;
      if (context?.previous) {
        queryClient.setQueryData(["app-state"], context.previous);
      }
    },
    onSettled: (_data, _error, variables) => {
      if (isSupabaseMode && !variables.silent) {
        queryClient.invalidateQueries({ queryKey: ["app-state"] });
      }
    },
  });

  const batchRepairCardsMutation = useMutation({
    mutationFn: async (
      repairs: Array<{ id: string; card: Partial<DemoOwnedCard["card"]> }>
    ) => {
      if (repairs.length === 0) return;
      if (!isSupabaseMode) {
        useDemoStore.setState((state) => ({
          ownedCards: state.ownedCards.map((oc) => {
            const repair = repairs.find((entry) => entry.id === oc.id);
            if (!repair) return oc;
            return { ...oc, card: { ...oc.card, ...repair.card } };
          }),
        }));
        return;
      }
      await Promise.allSettled(
        repairs.map(async ({ id, card }) => {
          const res = await fetch("/api/app/owned-cards", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, updates: { card } }),
          });
          if (!res.ok) {
            console.warn("[batchRepairOwnedCards] repair failed", id);
          }
        })
      );
    },
    onMutate: async (repairs) => {
      if (!isSupabaseMode || repairs.length === 0) return { previous: undefined };
      await queryClient.cancelQueries({ queryKey: ["app-state"] });
      const previous = queryClient.getQueryData<AppState>(["app-state"]);
      if (previous) {
        const repairById = new Map(repairs.map((entry) => [entry.id, entry.card]));
        queryClient.setQueryData<AppState>(["app-state"], {
          ...previous,
          ownedCards: previous.ownedCards.map((oc) => {
            const cardUpdates = repairById.get(oc.id);
            if (!cardUpdates) return oc;
            return { ...oc, card: { ...oc.card, ...cardUpdates } };
          }),
        });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["app-state"], context.previous);
      }
    },
  });

  const deleteCardsMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      if (!isSupabaseMode) {
        useDemoStore.getState().deleteOwnedCards(ids);
        return;
      }
      const res = await fetch("/api/app/owned-cards", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error("Failed to delete cards");
    },
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: ["app-state"] });
      const previous = queryClient.getQueryData<AppState>(["app-state"]);
      if (previous) {
        queryClient.setQueryData<AppState>(["app-state"], {
          ...previous,
          ownedCards: previous.ownedCards.filter((oc) => !ids.includes(oc.id)),
        });
      }
      return { previous };
    },
    onError: (_err, _ids, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["app-state"], context.previous);
      }
    },
    onSettled: () => {
      if (isSupabaseMode) {
        queryClient.invalidateQueries({ queryKey: ["app-state"] });
      }
    },
  });

  const importMutation = useMutation({
    mutationFn: async ({
      rows,
      mergeDuplicates,
    }: {
      rows: Parameters<ReturnType<typeof useDemoStore.getState>["importRows"]>[0];
      mergeDuplicates: boolean;
    }) => {
      if (!isSupabaseMode) {
        return useDemoStore.getState().importRows(rows, mergeDuplicates);
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
      await refreshAppState();
      return json.imported as number;
    },
    onSuccess: invalidate,
  });

  const importDeckMutation = useMutation({
    mutationFn: async ({
      items,
      mergeDuplicates,
    }: {
      items: Parameters<ReturnType<typeof useDemoStore.getState>["importFromSearchResults"]>[0];
      mergeDuplicates: boolean;
    }) => {
      if (!isSupabaseMode) {
        return useDemoStore.getState().importFromSearchResults(items, mergeDuplicates);
      }
      const res = await fetch("/api/app/owned-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "import-deck",
          collectionId: resolvedActiveId,
          items,
          mergeDuplicates,
        }),
      });
      if (!res.ok) throw new Error("Failed to import deck");
      const json = await res.json();
      await refreshAppState();
      return json.imported as number;
    },
    onSuccess: invalidate,
  });

  return {
    mode,
    isSupabaseMode,
    isLoading: configLoading || (isSupabaseMode && stateLoading),
    isError: isSupabaseMode && stateError,
    profile,
    collections,
    ownedCards,
    tags,
    activeCollectionId: resolvedActiveId,
    setActiveCollection,
    updateProfile: (updates: Partial<DemoProfile>) =>
      profileMutation.mutateAsync(updates),
    addCollection: (name: string) => addCollectionMutation.mutateAsync(name),
    toggleCollectionFavorite: (id: string) =>
      toggleFavoriteMutation.mutateAsync(id),
    renameCollection: (id: string, name: string) =>
      renameCollectionMutation.mutateAsync({ id, name }),
    deleteCollection: (id: string) => deleteCollectionMutation.mutateAsync(id),
    addCardFromSearch: (
      result: CardSearchResult,
      gameId: string,
      gameSlug: string,
      gameName: string
    ) => addCardMutation.mutateAsync({ result, gameId, gameSlug, gameName }),
    updateOwnedCard: (
      id: string,
      updates: Partial<Omit<DemoOwnedCard, "card">> & { card?: Partial<DemoOwnedCard["card"]> },
      options?: { silent?: boolean }
    ) => {
      const silent = options?.silent ?? false;
      if (silent) {
        void updateCardMutation.mutateAsync({ id, updates, silent: true });
        return Promise.resolve();
      }
      return updateCardMutation.mutateAsync({ id, updates, silent: false });
    },
    batchRepairOwnedCards: (
      repairs: Array<{ id: string; card: Partial<DemoOwnedCard["card"]> }>
    ) => batchRepairCardsMutation.mutateAsync(repairs),
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
    importDeckFromSearch: (
      items: Parameters<ReturnType<typeof useDemoStore.getState>["importFromSearchResults"]>[0],
      mergeDuplicates: boolean
    ) => importDeckMutation.mutateAsync({ items, mergeDuplicates }),
  };
}
