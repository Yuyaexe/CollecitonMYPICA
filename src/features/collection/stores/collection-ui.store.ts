import { create } from "zustand";
import { DEFAULT_FILTERS, type CollectionFilters } from "@/types/tcg";

interface CollectionUIState {
  selectedIds: Set<string>;
  filters: CollectionFilters;
  sortField: string;
  sortDir: "asc" | "desc";
  sidebarCollapsed: boolean;
  detailCardId: string | null;
  marketplaceCardId: string | null;
  inspectTab: "details" | "marketplace";
  quickAddOpen: boolean;
  importOpen: boolean;
  focusedRowIndex: number;
  lastSelectedIndex: number;

  toggleSelect: (id: string, shiftKey?: boolean, allIds?: string[], rowIndex?: number) => void;
  selectRow: (
    id: string,
    modifiers?: { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean },
    allIds?: string[],
    rowIndex?: number
  ) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  setFilters: (filters: Partial<CollectionFilters>) => void;
  resetFilters: () => void;
  setSort: (field: string, dir?: "asc" | "desc") => void;
  toggleSidebar: () => void;
  setDetailCardId: (id: string | null) => void;
  setMarketplaceCardId: (id: string | null) => void;
  openCardInspect: (id: string, tab?: "details" | "marketplace") => void;
  setInspectTab: (tab: "details" | "marketplace") => void;
  closeCardInspect: () => void;
  setQuickAddOpen: (open: boolean) => void;
  setImportOpen: (open: boolean) => void;
  setFocusedRowIndex: (index: number) => void;
}

export const useCollectionUIStore = create<CollectionUIState>((set, get) => ({
  selectedIds: new Set(),
  filters: { ...DEFAULT_FILTERS },
  sortField: "name",
  sortDir: "asc",
  sidebarCollapsed: false,
  detailCardId: null,
  marketplaceCardId: null,
  inspectTab: "details",
  quickAddOpen: false,
  importOpen: false,
  focusedRowIndex: 0,
  lastSelectedIndex: 0,

  toggleSelect: (id, shiftKey, allIds, rowIndex) => {
    const { selectedIds, lastSelectedIndex } = get();
    const next = new Set(selectedIds);
    const idx = rowIndex ?? allIds?.indexOf(id) ?? lastSelectedIndex;

    if (shiftKey && allIds) {
      const start = Math.min(lastSelectedIndex, idx);
      const end = Math.max(lastSelectedIndex, idx);
      for (let i = start; i <= end; i++) next.add(allIds[i]);
    } else if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }

    set({ selectedIds: next, lastSelectedIndex: idx, focusedRowIndex: idx });
  },

  selectRow: (id, modifiers = {}, allIds, rowIndex) => {
    const { shiftKey = false, ctrlKey = false, metaKey = false } = modifiers;
    const { selectedIds, lastSelectedIndex } = get();
    const idx = rowIndex ?? allIds?.indexOf(id) ?? lastSelectedIndex;
    const multiKey = ctrlKey || metaKey;

    if (shiftKey && allIds) {
      const next = new Set(selectedIds);
      const start = Math.min(lastSelectedIndex, idx);
      const end = Math.max(lastSelectedIndex, idx);
      for (let i = start; i <= end; i++) next.add(allIds[i]);
      set({ selectedIds: next, lastSelectedIndex: idx, focusedRowIndex: idx });
      return;
    }

    if (multiKey) {
      const next = new Set(selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      set({ selectedIds: next, lastSelectedIndex: idx, focusedRowIndex: idx });
      return;
    }

    if (selectedIds.has(id)) {
      const next = new Set(selectedIds);
      next.delete(id);
      set({ selectedIds: next, lastSelectedIndex: idx, focusedRowIndex: idx });
      return;
    }

    set({
      selectedIds: new Set([id]),
      lastSelectedIndex: idx,
      focusedRowIndex: idx,
    });
  },

  selectAll: (ids) => set({ selectedIds: new Set(ids) }),
  clearSelection: () => set({ selectedIds: new Set() }),
  setFilters: (filters) => set((s) => ({ filters: { ...s.filters, ...filters } })),
  resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),
  setSort: (field, dir) =>
    set((s) => ({
      sortField: field,
      sortDir: dir ?? (s.sortField === field && s.sortDir === "asc" ? "desc" : "asc"),
    })),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  openCardInspect: (id, tab = "details") =>
    set({ detailCardId: id, marketplaceCardId: id, inspectTab: tab }),
  setInspectTab: (tab) => set({ inspectTab: tab }),
  closeCardInspect: () => set({ detailCardId: null, marketplaceCardId: null }),
  setDetailCardId: (id) =>
    id === null
      ? set({ detailCardId: null, marketplaceCardId: null })
      : set({ detailCardId: id, marketplaceCardId: id, inspectTab: "details" }),
  setMarketplaceCardId: (id) =>
    id === null
      ? set({ detailCardId: null, marketplaceCardId: null })
      : set({ detailCardId: id, marketplaceCardId: id, inspectTab: "marketplace" }),
  setQuickAddOpen: (open) => set({ quickAddOpen: open }),
  setImportOpen: (open) => set({ importOpen: open }),
  setFocusedRowIndex: (index) => set({ focusedRowIndex: index }),
}));
