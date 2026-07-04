"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { CollectionGridCardItem } from "@/features/collection/components/CollectionGridCardItem";
import { useCollectionUIStore } from "@/features/collection/stores/collection-ui.store";
import { useDragReorder } from "@/hooks/useDragReorder";
import type { CollectionViewData } from "@/features/collection/hooks/useCollectionViewData";

interface CollectionGridViewProps {
  data: CollectionViewData;
}

export function CollectionGridView({ data }: CollectionGridViewProps) {
  const selectedIds = useCollectionUIStore((s) => s.selectedIds);
  const toggleSelect = useCollectionUIStore((s) => s.toggleSelect);
  const openCardInspect = useCollectionUIStore((s) => s.openCardInspect);
  const dragHandlers = useDragReorder(data.reorderCard);

  return (
    <ScrollArea className="h-full">
      <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 md:p-4">
        {data.filtered.map((item, index) => (
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
        ))}
      </div>
    </ScrollArea>
  );
}
