import { create } from "zustand";
import { persist } from "zustand/middleware";

interface DataUiStore {
  activeCollectionId: string | null;
  collectionOrder: string[];
  setActiveCollectionId: (id: string) => void;
  setCollectionOrder: (order: string[]) => void;
}

export const useDataUiStore = create<DataUiStore>()(
  persist(
    (set) => ({
      activeCollectionId: null,
      collectionOrder: [],
      setActiveCollectionId: (id) => set({ activeCollectionId: id }),
      setCollectionOrder: (order) => set({ collectionOrder: order }),
    }),
    { name: "deckvault-ui" }
  )
);
