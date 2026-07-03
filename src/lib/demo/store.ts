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
  updateProfile: (updates: Partial<DemoState["profile"]>) => void;
  addCollection: (name: string) => DemoCollection;
  renameCollection: (id: string, name: string) => void;
  deleteCollection: (id: string) => void;
  toggleCollectionFavorite: (id: string) => void;
  restoreFromBackup: (backup: DeckVaultBackup) => void;
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
        set({
          profile: backup.profile,
          collections: backup.collections.length
            ? backup.collections
            : createInitialDemoState().collections,
          ownedCards: backup.ownedCards,
          tags: backup.tags ?? [],
          activeCollectionId: defaultCol?.id ?? DEFAULT_COLLECTION_ID,
        });
      },
    }),
    { name: "deckvault-demo" }
  )
);
