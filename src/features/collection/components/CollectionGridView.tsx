"use client";

import { useRef, useEffect, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { CollectionGridCardItem } from "@/features/collection/components/CollectionGridCardItem";
import { useCollectionUIStore } from "@/features/collection/stores/collection-ui.store";
import { useDragReorder } from "@/hooks/useDragReorder";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { CollectionViewData } from "@/features/collection/hooks/useCollectionViewData";

/** Image (~204px @ 140w) + metadata + padding */
const CARD_ROW_HEIGHT = 310;

interface CollectionGridViewProps {
  data: CollectionViewData;
}

export function CollectionGridView({ data }: CollectionGridViewProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const selectedIds = useCollectionUIStore((s) => s.selectedIds);
  const toggleSelect = useCollectionUIStore((s) => s.toggleSelect);
  const openCardInspect = useCollectionUIStore((s) => s.openCardInspect);
  const dragHandlers = useDragReorder(data.reorderCard);
  const isMobile = useMediaQuery("(max-width: 767px)");
  const isSm = useMediaQuery("(min-width: 640px)");
  const isMd = useMediaQuery("(min-width: 768px)");
  const isLg = useMediaQuery("(min-width: 1024px)");
  const isXl = useMediaQuery("(min-width: 1280px)");

  const columns = useMemo(() => {
    if (isMobile) return 2;
    if (isXl) return 6;
    if (isLg) return 5;
    if (isMd) return 4;
    if (isSm) return 3;
    return 2;
  }, [isMobile, isSm, isMd, isLg, isXl]);
  const rowCount = Math.ceil(data.filtered.length / columns);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => CARD_ROW_HEIGHT,
    overscan: 2,
  });

  useEffect(() => {
    virtualizer.measure();
  }, [data.filtered.length, columns, virtualizer]);

  const rows = virtualizer.getVirtualItems();

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div
        className="relative w-full p-3 md:p-4"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {rows.map((virtualRow) => {
          const startIndex = virtualRow.index * columns;
          const rowItems = data.filtered.slice(startIndex, startIndex + columns);

          return (
            <div
              key={virtualRow.key}
              className="absolute left-0 top-0 grid w-full gap-3 px-3 md:px-4"
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              }}
            >
              {rowItems.map((item, colIndex) => {
                const index = startIndex + colIndex;
                return (
                  <CollectionGridCardItem
                    key={item.id}
                    item={item}
                    selected={selectedIds.has(item.id)}
                    marketPrice={data.resolvePrice(item)}
                    cardTraderImage={data.resolveCardTraderImage(item)}
                    currency={data.profileCurrency}
                    dragHandlers={dragHandlers}
                    onSelect={() => toggleSelect(item.id, false, data.allIds, index)}
                    onOpen={() => openCardInspect(item.id, "details")}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
