"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { CollectionCompactCard } from "@/features/collection/components/CollectionCompactCard";
import { useCollectionUIStore } from "@/features/collection/stores/collection-ui.store";
import type { CollectionViewData } from "@/features/collection/hooks/useCollectionViewData";

interface CollectionCompactViewProps {
  data: CollectionViewData;
}

export function CollectionCompactView({ data }: CollectionCompactViewProps) {
  const selectedIds = useCollectionUIStore((s) => s.selectedIds);
  const toggleSelect = useCollectionUIStore((s) => s.toggleSelect);
  const openCardInspect = useCollectionUIStore((s) => s.openCardInspect);

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-3 md:p-4">
        {data.filtered.map((item, index) => (
          <CollectionCompactCard
            key={item.id}
            item={item}
            selected={selectedIds.has(item.id)}
            marketPrice={data.resolvePrice(item)}
            cardTraderImage={data.resolveCardTraderImage(item)}
            currency={data.profileCurrency}
            onSelect={() => toggleSelect(item.id, false, data.allIds, index)}
            onOpen={() => openCardInspect(item.id, "details")}
            onQuantityChange={(qty) => data.handleQuantityChange(item.id, qty)}
            onRemove={() => data.handleRemove(item.id)}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
