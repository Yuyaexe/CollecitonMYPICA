import { create } from "zustand";
import { persist } from "zustand/middleware";

interface DataUiStore {
  activeCollectionId: string | null;
  setActiveCollectionId: (id: string) => void;
}

export const useDataUiStore = create<DataUiStore>()(
  persist(
    (set) => ({
      activeCollectionId: null,
      setActiveCollectionId: (id) => set({ activeCollectionId: id }),
    }),
    { name: "deckvault-ui" }
  )
);
