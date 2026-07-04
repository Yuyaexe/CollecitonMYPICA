import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  createInitialDemoState,
  DEFAULT_COLLECTION_ID,
  type DemoCard,
  type DemoCollection,
  type DemoOwnedCard,
  type DemoState,
} from "./types";
import type { CardCondition, CardLanguage } from "@/types/tcg";
import type { CardSearchResult } from "@/features/catalog/services/card-api/types";
import type { DeckVaultBackup } from "@/features/import/services/backup-export";
import {
  buildSeedState,
  slugifyAnimeName,
} from "@/features/anime-collection/data/seed-catalog";
import type { AnimeCharacter, AnimeSeries } from "@/features/anime-collection/types";
import {
  cardTraderBlueprintFromSearch,
  repairDemoCard,
} from "./repair-card";

function generateId(): string {
  return crypto.randomUUID();
}

interface DemoStore extends DemoState {
  activeCollectionId: string;
  setActiveCollection: (id: string) => void;
  addCardFromSearch: (
    result: CardSearchResult,
    gameId: string,
    gameSlug: string,
    gameName: string,
    collectionId?: string
  ) => void;
  updateOwnedCard: (
    id: string,
    updates: Partial<Omit<DemoOwnedCard, "card">> & { card?: Partial<DemoCard> }
  ) => void;
  deleteOwnedCards: (ids: string[]) => void;
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
  ) => number;
  importFromSearchResults: (
    items: Array<{
      result: CardSearchResult;
      quantity: number;
      gameId: string;
      gameSlug: string;
      gameName: string;
    }>,
    mergeDuplicates: boolean
  ) => number;
  updateProfile: (updates: Partial<DemoState["profile"]>) => void;
  addCollection: (name: string) => DemoCollection;
  renameCollection: (id: string, name: string) => void;
  deleteCollection: (id: string) => void;
  toggleCollectionFavorite: (id: string) => void;
  restoreFromBackup: (backup: DeckVaultBackup) => void;
  addAnimeSeries: (input: {
    name: string;
    coverImageUrl?: string | null;
    coverColor?: string | null;
  }) => AnimeSeries;
  renameAnimeSeries: (id: string, name: string) => void;
  deleteAnimeSeries: (id: string) => void;
  addAnimeCharacter: (input: {
    seriesId: string;
    name: string;
    imageUrl?: string | null;
    accentColor?: string | null;
  }) => AnimeCharacter;
  renameAnimeCharacter: (id: string, name: string) => void;
  deleteAnimeCharacter: (id: string) => void;
}

export const useDemoStore = create<DemoStore>()(
  persist(
    (set, get) => ({
      ...createInitialDemoState(),
      activeCollectionId: DEFAULT_COLLECTION_ID,

      setActiveCollection: (id) => set({ activeCollectionId: id }),

      addCardFromSearch: (result, gameId, gameSlug, gameName, collectionId) => {
        const state = get();
        const targetCollectionId = collectionId ?? state.activeCollectionId;
        const existing = state.ownedCards.find(
          (oc) =>
            oc.collectionId === targetCollectionId &&
            oc.card.externalId === result.externalId &&
            oc.card.gameSlug === gameSlug
        );

        if (existing) {
          set((s) => ({
            ownedCards: s.ownedCards.map((oc) =>
              oc.id === existing.id
                ? {
                    ...oc,
                    quantity: oc.quantity + 1,
                    card: {
                      ...oc.card,
                      marketPrice: result.price ?? oc.card.marketPrice,
                      imageUrl: result.imageUrl ?? oc.card.imageUrl,
                      rarity: result.rarity ?? oc.card.rarity,
                      setName: result.setName ?? oc.card.setName,
                      cardTraderBlueprintId:
                        cardTraderBlueprintFromSearch(
                          result.externalId,
                          result.imageUrl,
                          result.metadata?.catalogSource as string | undefined,
                          gameSlug,
                          result.metadata
                        ) ?? oc.card.cardTraderBlueprintId,
                    },
                  }
                : oc
            ),
          }));
          return;
        }

        const cardId = generateId();
        const card: DemoCard = {
          id: cardId,
          gameId,
          gameSlug,
          gameName,
          externalId: result.externalId,
          name: result.name,
          setCode: result.setCode,
          setName: result.setName,
          collectorNumber: result.collectorNumber,
          rarity: result.rarity,
          imageUrl: result.imageUrl,
          marketPrice: result.price,
          cardTraderBlueprintId: cardTraderBlueprintFromSearch(
            result.externalId,
            result.imageUrl,
            result.metadata?.catalogSource as string | undefined,
            gameSlug,
            result.metadata
          ),
        };
        const owned: DemoOwnedCard = {
          id: generateId(),
          collectionId: targetCollectionId,
          cardId,
          card,
          quantity: 1,
          condition: "NM",
          language: "EN",
          isFoil: false,
          purchasePrice: null,
          notes: null,
          tagIds: [],
        };
        set((s) => ({ ownedCards: [...s.ownedCards, owned] }));
      },

      updateOwnedCard: (id, updates) =>
        set((s) => ({
          ownedCards: s.ownedCards.map((oc) => {
            if (oc.id !== id) return oc;
            const { card: cardUpdates, ...ownedUpdates } = updates;
            const next: DemoOwnedCard = { ...oc, ...ownedUpdates };
            if (cardUpdates) {
              next.card = { ...oc.card, ...cardUpdates };
            }
            return next;
          }),
        })),

      deleteOwnedCards: (ids) =>
        set((s) => ({
          ownedCards: s.ownedCards.filter((oc) => !ids.includes(oc.id)),
        })),

      importRows: (rows, mergeDuplicates) => {
        let imported = 0;
        const state = get();
        const newOwned = [...state.ownedCards];

        for (const row of rows) {
          const existing = mergeDuplicates
            ? newOwned.find(
                (oc) =>
                  oc.collectionId === state.activeCollectionId &&
                  oc.card.name.toLowerCase() === row.name.toLowerCase() &&
                  (oc.card.setName ?? "").toLowerCase() === (row.set ?? "").toLowerCase()
              )
            : undefined;

          if (existing) {
            existing.quantity += row.quantity;
            imported++;
            continue;
          }

          const cardId = generateId();
          const card: DemoCard = {
            id: cardId,
            gameId: row.gameId,
            gameSlug: row.gameSlug,
            gameName: row.gameName,
            externalId: null,
            name: row.name,
            setCode: null,
            setName: row.set ?? null,
            collectorNumber: null,
            rarity: null,
            imageUrl: null,
            marketPrice: null,
          };
          newOwned.push({
            id: generateId(),
            collectionId: state.activeCollectionId,
            cardId,
            card,
            quantity: row.quantity,
            condition: row.condition,
            language: row.language,
            isFoil: row.isFoil ?? false,
            purchasePrice: row.purchasePrice ?? null,
            notes: null,
            tagIds: [],
          });
          imported++;
        }

        set({ ownedCards: newOwned });
        return imported;
      },

      importFromSearchResults: (items, mergeDuplicates) => {
        let imported = 0;
        const state = get();
        const newOwned = [...state.ownedCards];

        for (const item of items) {
          const { result, quantity, gameId, gameSlug, gameName } = item;
          const existing = mergeDuplicates
            ? newOwned.find((oc) => {
                if (oc.collectionId !== state.activeCollectionId) return false;
                if (oc.card.gameSlug !== gameSlug) return false;
                if (result.externalId) {
                  return oc.card.externalId === result.externalId;
                }
                return (
                  oc.card.name.toLowerCase() === result.name.toLowerCase() &&
                  (oc.card.setName ?? "").toLowerCase() === (result.setName ?? "").toLowerCase()
                );
              })
            : undefined;

          if (existing) {
            existing.quantity += quantity;
            existing.card = {
              ...existing.card,
              marketPrice: result.price ?? existing.card.marketPrice,
              imageUrl: result.imageUrl ?? existing.card.imageUrl,
              rarity: result.rarity ?? existing.card.rarity,
              setName: result.setName ?? existing.card.setName,
              setCode: result.setCode ?? existing.card.setCode,
              collectorNumber: result.collectorNumber ?? existing.card.collectorNumber,
              externalId: result.externalId ?? existing.card.externalId,
              cardTraderBlueprintId:
                cardTraderBlueprintFromSearch(
                  result.externalId,
                  result.imageUrl,
                  result.metadata?.catalogSource as string | undefined,
                  gameSlug,
                  result.metadata
                ) ?? existing.card.cardTraderBlueprintId,
            };
            imported += quantity;
            continue;
          }

          const cardId = generateId();
          const card: DemoCard = {
            id: cardId,
            gameId,
            gameSlug,
            gameName,
            externalId: result.externalId,
            name: result.name,
            setCode: result.setCode,
            setName: result.setName,
            collectorNumber: result.collectorNumber,
            rarity: result.rarity,
            imageUrl: result.imageUrl,
            marketPrice: result.price,
            cardTraderBlueprintId: cardTraderBlueprintFromSearch(
              result.externalId,
              result.imageUrl,
              result.metadata?.catalogSource as string | undefined,
              gameSlug,
              result.metadata
            ),
          };
          newOwned.push({
            id: generateId(),
            collectionId: state.activeCollectionId,
            cardId,
            card,
            quantity,
            condition: "NM",
            language: "EN",
            isFoil: false,
            purchasePrice: null,
            notes: null,
            tagIds: [],
          });
          imported += quantity;
        }

        set({ ownedCards: newOwned });
        return imported;
      },

      updateProfile: (updates) =>
        set((s) => ({ profile: { ...s.profile, ...updates } })),

      addCollection: (name) => {
        const newCollection = {
          id: generateId(),
          name,
          isDefault: false,
          isFavorite: false,
          coverImageUrl: null,
        };
        set((s) => ({
          collections: [...s.collections, newCollection],
          activeCollectionId: newCollection.id,
        }));
        return newCollection;
      },

      renameCollection: (id, name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set((s) => ({
          collections: s.collections.map((c) =>
            c.id === id ? { ...c, name: trimmed } : c
          ),
        }));
      },

      deleteCollection: (id) => {
        const state = get();
        const target = state.collections.find((c) => c.id === id);
        if (!target || target.isDefault) return;

        const collections = state.collections.filter((c) => c.id !== id);
        const ownedCards = state.ownedCards.filter((oc) => oc.collectionId !== id);
        let activeCollectionId = state.activeCollectionId;
        if (activeCollectionId === id) {
          activeCollectionId =
            collections.find((c) => c.isDefault)?.id ??
            collections[0]?.id ??
            DEFAULT_COLLECTION_ID;
        }
        set({ collections, ownedCards, activeCollectionId });
      },

      toggleCollectionFavorite: (id) =>
        set((s) => ({
          collections: s.collections.map((c) =>
            c.id === id ? { ...c, isFavorite: !c.isFavorite } : c
          ),
        })),

      restoreFromBackup: (backup) => {
        const defaultCol =
          backup.collections.find((c) => c.isDefault) ?? backup.collections[0];
        const seed = buildSeedState();
        set({
          profile: backup.profile,
          collections: backup.collections.length
            ? backup.collections
            : createInitialDemoState().collections,
          ownedCards: backup.ownedCards,
          tags: backup.tags ?? [],
          activeCollectionId: defaultCol?.id ?? DEFAULT_COLLECTION_ID,
          animeSeries: seed.animeSeries,
          animeCharacters: seed.animeCharacters,
        });
      },

      addAnimeSeries: (input) => {
        const name = input.name.trim();
        const baseSlug = slugifyAnimeName(name) || "series";
        const state = get();
        let slug = baseSlug;
        let n = 1;
        while (state.animeSeries.some((s) => s.slug === slug)) {
          slug = `${baseSlug}-${n++}`;
        }
        const newSeries: AnimeSeries = {
          id: generateId(),
          name,
          slug,
          coverImageUrl: input.coverImageUrl ?? null,
          coverColor: input.coverColor ?? null,
          isSeeded: false,
          sortOrder: state.animeSeries.length,
        };
        set((s) => ({ animeSeries: [...s.animeSeries, newSeries] }));
        return newSeries;
      },

      renameAnimeSeries: (id, name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set((s) => ({
          animeSeries: s.animeSeries.map((series) =>
            series.id === id ? { ...series, name: trimmed } : series
          ),
        }));
      },

      deleteAnimeSeries: (id) => {
        set((s) => ({
          animeSeries: s.animeSeries.filter((series) => series.id !== id),
          animeCharacters: s.animeCharacters.filter((c) => c.seriesId !== id),
        }));
      },

      addAnimeCharacter: (input) => {
        const name = input.name.trim();
        const state = get();
        const newCharacter: AnimeCharacter = {
          id: generateId(),
          seriesId: input.seriesId,
          name,
          imageUrl: input.imageUrl ?? null,
          accentColor: input.accentColor ?? null,
          isSeeded: false,
          sortOrder: state.animeCharacters.filter((c) => c.seriesId === input.seriesId)
            .length,
        };
        set((s) => ({ animeCharacters: [...s.animeCharacters, newCharacter] }));
        return newCharacter;
      },

      renameAnimeCharacter: (id, name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set((s) => ({
          animeCharacters: s.animeCharacters.map((c) =>
            c.id === id ? { ...c, name: trimmed } : c
          ),
        }));
      },

      deleteAnimeCharacter: (id) => {
        set((s) => ({
          animeCharacters: s.animeCharacters.filter((c) => c.id !== id),
        }));
      },
    }),
    {
      name: "deckvault-demo",
      version: 3,
      migrate: (persisted, version) => {
        let state = persisted as DemoState;
        if (version < 2 && state.ownedCards) {
          state = {
            ...state,
            ownedCards: state.ownedCards.map((oc) => ({
              ...oc,
              card: repairDemoCard(oc.card),
            })),
          };
        }
        if (version < 3) {
          const seed = buildSeedState();
          state = {
            ...state,
            animeSeries: state.animeSeries?.length ? state.animeSeries : seed.animeSeries,
            animeCharacters: state.animeCharacters?.length
              ? state.animeCharacters
              : seed.animeCharacters,
          };
        }
        return state;
      },
    }
  )
);
