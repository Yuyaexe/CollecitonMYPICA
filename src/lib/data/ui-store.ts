import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { reorderIds, reorderIdsToIndex } from "@/lib/collections/card-order";
import { compactBinderLayout, moveCardToBinderSlot } from "@/lib/collections/binder-layout";
import { indexedDbStateStorage } from "@/lib/storage/indexeddb-storage";

interface DataUiStore {
  activeCollectionId: string | null;
  collectionOrder: string[];
  cardOrderByCollection: Record<string, string[]>;
  binderLayoutByCollection: Record<string, (string | null)[]>;
  purchasedOverlayEnabled: boolean;
  purchasedOverlayColor: string;
  purchasedOverlayOpacity: number;
  theme: "dark" | "light";
  appSidebarWidth: number;
  quickAddSidebarWidth: number;
  quickAddSidebarOpen: boolean;
  quickAddCardDensity: "large" | "comfortable" | "compact";
  setActiveCollectionId: (id: string) => void;
  setPurchasedOverlayEnabled: (enabled: boolean) => void;
  setPurchasedOverlayColor: (color: string) => void;
  setPurchasedOverlayOpacity: (opacity: number) => void;
  setTheme: (theme: "dark" | "light") => void;
  setAppSidebarWidth: (width: number) => void;
  setQuickAddSidebarWidth: (width: number) => void;
  setQuickAddSidebarOpen: (open: boolean) => void;
  setQuickAddCardDensity: (density: "large" | "comfortable" | "compact") => void;
  setCollectionOrder: (order: string[]) => void;
  setCardOrder: (collectionId: string, order: string[]) => void;
  setBinderLayout: (collectionId: string, layout: (string | null)[]) => void;
  reorderCard: (collectionId: string, draggedId: string, targetId: string | null) => void;
  reorderCardToIndex: (collectionId: string, draggedId: string, targetIndex: number) => void;
  moveCardToBinderSlot: (
    collectionId: string,
    draggedId: string,
    targetIndex: number
  ) => void;
}

export const useDataUiStore = create<DataUiStore>()(
  persist(
    (set, get) => ({
      activeCollectionId: null,
      collectionOrder: [],
      cardOrderByCollection: {},
      binderLayoutByCollection: {},
      purchasedOverlayEnabled: true,
      purchasedOverlayColor: "#22c55e",
      purchasedOverlayOpacity: 0.32,
      theme: "dark",
      appSidebarWidth: 240,
      quickAddSidebarWidth: 500,
      quickAddSidebarOpen: false,
      quickAddCardDensity: "compact",
      setActiveCollectionId: (id) => set({ activeCollectionId: id }),
      setPurchasedOverlayEnabled: (enabled) => set({ purchasedOverlayEnabled: enabled }),
      setPurchasedOverlayColor: (color) => set({ purchasedOverlayColor: color }),
      setPurchasedOverlayOpacity: (opacity) =>
        set({ purchasedOverlayOpacity: Math.min(0.7, Math.max(0.1, opacity)) }),
      setTheme: (theme) => set({ theme }),
      setAppSidebarWidth: (appSidebarWidth) =>
        set({ appSidebarWidth: Math.min(360, Math.max(180, Math.round(appSidebarWidth))) }),
      setQuickAddSidebarWidth: (quickAddSidebarWidth) =>
        set({ quickAddSidebarWidth: Math.min(760, Math.max(340, Math.round(quickAddSidebarWidth))) }),
      setQuickAddSidebarOpen: (quickAddSidebarOpen) => set({ quickAddSidebarOpen }),
      setQuickAddCardDensity: (quickAddCardDensity) => set({ quickAddCardDensity }),
      setCollectionOrder: (order) => set({ collectionOrder: order }),
      setCardOrder: (collectionId, order) =>
        set((s) => ({
          cardOrderByCollection: { ...s.cardOrderByCollection, [collectionId]: order },
        })),
      setBinderLayout: (collectionId, layout) =>
        set((s) => ({
          binderLayoutByCollection: {
            ...s.binderLayoutByCollection,
            [collectionId]: layout,
          },
          cardOrderByCollection: {
            ...s.cardOrderByCollection,
            [collectionId]: compactBinderLayout(layout),
          },
        })),
      reorderCard: (collectionId, draggedId, targetId) => {
        const current = get().cardOrderByCollection[collectionId] ?? [];
        const next = reorderIds(current, draggedId, targetId);
        set((s) => ({
          cardOrderByCollection: {
            ...s.cardOrderByCollection,
            [collectionId]: next,
          },
          // Keep sparse binder pockets intact; binder drag uses moveCardToBinderSlot.
        }));
      },
      reorderCardToIndex: (collectionId, draggedId, targetIndex) => {
        const current = get().cardOrderByCollection[collectionId] ?? [];
        const next = reorderIdsToIndex(current, draggedId, targetIndex);
        set((s) => ({
          cardOrderByCollection: {
            ...s.cardOrderByCollection,
            [collectionId]: next,
          },
        }));
      },
      moveCardToBinderSlot: (collectionId, draggedId, targetIndex) => {
        const layout =
          get().binderLayoutByCollection[collectionId] ??
          get().cardOrderByCollection[collectionId] ??
          [];
        const next = moveCardToBinderSlot(layout, draggedId, targetIndex);
        set((s) => ({
          binderLayoutByCollection: {
            ...s.binderLayoutByCollection,
            [collectionId]: next,
          },
          cardOrderByCollection: {
            ...s.cardOrderByCollection,
            [collectionId]: compactBinderLayout(next),
          },
        }));
      },
    }),
    {
      name: "deckvault-ui",
      storage: createJSONStorage(() => indexedDbStateStorage),
      version: 3,
      migrate: (persisted) => {
        const state = persisted as Omit<Partial<DataUiStore>, "quickAddSidebarWidth"> & {
          quickAddSidebarWidth?: number | "narrow" | "normal" | "wide";
        };
        const legacyWidth = state.quickAddSidebarWidth;
        const quickAddSidebarWidth =
          legacyWidth === "narrow"
            ? 420
            : legacyWidth === "wide"
              ? 620
              : legacyWidth === "normal"
                ? 500
                : typeof legacyWidth === "number"
                  ? Math.min(760, Math.max(340, legacyWidth))
                  : 500;
        const appSidebarWidth =
          typeof state.appSidebarWidth === "number"
            ? Math.min(360, Math.max(180, state.appSidebarWidth))
            : 240;
        const quickAddSidebarOpen =
          typeof state.quickAddSidebarOpen === "boolean" ? state.quickAddSidebarOpen : false;
        return {
          ...state,
          appSidebarWidth,
          quickAddSidebarWidth,
          quickAddSidebarOpen,
          quickAddCardDensity: "compact",
        } as DataUiStore;
      },
    }
  )
);
