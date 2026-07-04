import { create } from "zustand";
import { persist } from "zustand/middleware";
import { reorderIds, reorderIdsToIndex } from "@/lib/collections/card-order";

interface DataUiStore {
  activeCollectionId: string | null;
  collectionOrder: string[];
  cardOrderByCollection: Record<string, string[]>;
  setActiveCollectionId: (id: string) => void;
  setCollectionOrder: (order: string[]) => void;
  setCardOrder: (collectionId: string, order: string[]) => void;
  reorderCard: (collectionId: string, draggedId: string, targetId: string | null) => void;
  reorderCardToIndex: (collectionId: string, draggedId: string, targetIndex: number) => void;
}

export const useDataUiStore = create<DataUiStore>()(
  persist(
    (set, get) => ({
      activeCollectionId: null,
      collectionOrder: [],
      cardOrderByCollection: {},
      setActiveCollectionId: (id) => set({ activeCollectionId: id }),
      setCollectionOrder: (order) => set({ collectionOrder: order }),
      setCardOrder: (collectionId, order) =>
        set((s) => ({
          cardOrderByCollection: { ...s.cardOrderByCollection, [collectionId]: order },
        })),
      reorderCard: (collectionId, draggedId, targetId) => {
        const current = get().cardOrderByCollection[collectionId] ?? [];
        set((s) => ({
          cardOrderByCollection: {
            ...s.cardOrderByCollection,
            [collectionId]: reorderIds(current, draggedId, targetId),
          },
        }));
      },
      reorderCardToIndex: (collectionId, draggedId, targetIndex) => {
        const current = get().cardOrderByCollection[collectionId] ?? [];
        set((s) => ({
          cardOrderByCollection: {
            ...s.cardOrderByCollection,
            [collectionId]: reorderIdsToIndex(current, draggedId, targetIndex),
          },
        }));
      },
    }),
    { name: "deckvault-ui" }
  )
);
