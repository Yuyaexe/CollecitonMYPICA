"use client";

import { useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, useEffect } from "react";
import { Layers } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { CollectionRow } from "@/components/shared/CollectionRow";
import { EmptyState } from "@/components/shared/EmptyState";
import { useCollectionUIStore } from "@/features/collection/stores/collection-ui.store";
import { filterOwnedCards, sortOwnedCards } from "@/features/collection/utils/filters";
import { useDemoStore } from "@/lib/demo/store";
import { openMarketplaceInNewTab } from "@/features/market/services/marketplace";

const ROW_HEIGHT = 52;

export function CollectionTable() {
  const parentRef = useRef<HTMLDivElement>(null);
  const ownedCards = useDemoStore((s) => s.ownedCards);
  const activeCollectionId = useDemoStore((s) => s.activeCollectionId);
  const wishlistCardIds = useDemoStore((s) => s.wishlistCardIds);
  const profile = useDemoStore((s) => s.profile);
  const deleteOwnedCards = useDemoStore((s) => s.deleteOwnedCards);
  const toggleWishlist = useDemoStore((s) => s.toggleWishlist);

  const filters = useCollectionUIStore((s) => s.filters);
  const selectedIds = useCollectionUIStore((s) => s.selectedIds);
  const sortField = useCollectionUIStore((s) => s.sortField);
  const sortDir = useCollectionUIStore((s) => s.sortDir);
  const toggleSelect = useCollectionUIStore((s) => s.toggleSelect);
  const selectRow = useCollectionUIStore((s) => s.selectRow);
  const selectAll = useCollectionUIStore((s) => s.selectAll);
  const setDetailCardId = useCollectionUIStore((s) => s.setDetailCardId);
  const setMarketplaceCardId = useCollectionUIStore((s) => s.setMarketplaceCardId);
  const focusedRowIndex = useCollectionUIStore((s) => s.focusedRowIndex);
  const setFocusedRowIndex = useCollectionUIStore((s) => s.setFocusedRowIndex);
  const setQuickAddOpen = useCollectionUIStore((s) => s.setQuickAddOpen);

  const filtered = useMemo(() => {
    const f = filterOwnedCards(ownedCards, filters, activeCollectionId, wishlistCardIds);
    return sortOwnedCards(f, sortField, sortDir);
  }, [ownedCards, filters, activeCollectionId, wishlistCardIds, sortField, sortDir]);

  const allIds = filtered.map((oc) => oc.id);

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  useEffect(() => {
    if (focusedRowIndex >= filtered.length) {
      setFocusedRowIndex(Math.max(0, filtered.length - 1));
    }
  }, [filtered.length, focusedRowIndex, setFocusedRowIndex]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedRowIndex(Math.min(focusedRowIndex + 1, filtered.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedRowIndex(Math.max(focusedRowIndex - 1, 0));
      }
      if (e.key === "Enter" && filtered[focusedRowIndex]) {
        setDetailCardId(filtered[focusedRowIndex].id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [filtered, focusedRowIndex, setDetailCardId, setFocusedRowIndex]);

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={Layers}
        title="No cards yet"
        description="Import your collection or use Quick Add to search Yu-Gi-Oh, Pokemon, or Digimon cards."
        actionLabel="Quick Add"
        onAction={() => setQuickAddOpen(true)}
      />
    );
  }

  const headerChecked =
    selectedIds.size === filtered.length && filtered.length > 0
      ? true
      : selectedIds.size > 0
        ? "indeterminate"
        : false;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border bg-card/50 px-4 py-2 text-xs font-medium text-muted-foreground">
        <Checkbox
          checked={
            headerChecked === "indeterminate"
              ? "indeterminate"
              : headerChecked
          }
          onCheckedChange={(c) =>
            c ? selectAll(allIds) : useCollectionUIStore.getState().clearSelection()
          }
        />
        <span className="flex-[2]">Name</span>
        <span className="hidden flex-1 md:block">Set</span>
        <span className="hidden w-12 lg:block">#</span>
        <span className="w-10 text-center">Qty</span>
        <span className="hidden w-12 text-center md:block">Cond</span>
        <span className="hidden w-10 text-center sm:block">Lang</span>
        <span className="hidden w-20 lg:block">Market</span>
        <span className="hidden w-12 text-center xl:block">Trend</span>
        <span className="hidden w-20 text-right xl:block">Profit</span>
        <span className="hidden w-16 xl:block">Tags</span>
      </div>

      <div ref={parentRef} className="flex-1 overflow-auto">
        <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const item = filtered[virtualRow.index];
            return (
              <ContextMenu key={item.id}>
                <ContextMenuTrigger asChild>
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <CollectionRow
                      item={item}
                      selected={selectedIds.has(item.id)}
                      focused={focusedRowIndex === virtualRow.index}
                      onClick={(row, shift) => selectRow(row.id, shift, allIds, virtualRow.index)}
                      onDoubleClick={(row) => setMarketplaceCardId(row.id)}
                      onMiddleClick={(row) => openMarketplaceInNewTab(row.card)}
                      onCheckboxChange={(id, shift) =>
                        toggleSelect(id, shift, allIds, virtualRow.index)
                      }
                      currency={profile.currency}
                      isWishlisted={wishlistCardIds.includes(item.card.id)}
                    />
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem onClick={() => setMarketplaceCardId(item.id)}>
                    Open marketplace
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => openMarketplaceInNewTab(item.card)}>
                    Open marketplace in new tab
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={() => setDetailCardId(item.id)}>
                    View card details
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => toggleWishlist(item.card.id)}>
                    {wishlistCardIds.includes(item.card.id)
                      ? "Remove from wishlist"
                      : "Add to wishlist"}
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    className="text-destructive"
                    onClick={() => deleteOwnedCards([item.id])}
                  >
                    Delete
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            );
          })}
        </div>
      </div>
    </div>
  );
}
