"use client";

import { Layers } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { CollectionTable } from "@/features/collection/components/CollectionTable";
import { CollectionGridView } from "@/features/collection/components/CollectionGridView";
import { CollectionCompactView } from "@/features/collection/components/CollectionCompactView";
import { CollectionBinderView } from "@/features/collection/components/CollectionBinderView";
import { useCollectionViewData } from "@/features/collection/hooks/useCollectionViewData";
import { useCollectionUIStore } from "@/features/collection/stores/collection-ui.store";
import { useMediaQuery } from "@/hooks/useMediaQuery";

export function CollectionContent() {
  const data = useCollectionViewData();
  const viewMode = useCollectionUIStore((s) => s.viewMode);
  const filters = useCollectionUIStore((s) => s.filters);
  const setQuickAddOpen = useCollectionUIStore((s) => s.setQuickAddOpen);
  const isMobile = useMediaQuery("(max-width: 767px)");

  const effectiveView = isMobile && viewMode === "table" ? "compact" : viewMode;

  if (data.isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (data.isError) {
    return (
      <EmptyState
        icon={Layers}
        title="Could not load collection"
        description="Sign in to load your cloud collection, or use offline Demo mode."
      />
    );
  }

  if (data.filtered.length === 0) {
    const hasActiveFilters =
      data.collectionCards.length > 0 &&
      (filters.search ||
        filters.gameId ||
        filters.setCode ||
        filters.rarity ||
        filters.language ||
        filters.condition ||
        filters.isFoil !== null ||
        filters.minQuantity !== null ||
        filters.priceMin !== null ||
        filters.priceMax !== null);

    if (hasActiveFilters) {
      return (
        <EmptyState
          icon={Layers}
          title="No cards match your filters"
          description="Try clearing the search or resetting filters to see all cards in this collection."
          actionLabel="Reset filters"
          onAction={() => useCollectionUIStore.getState().resetFilters()}
        />
      );
    }

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

  switch (effectiveView) {
    case "grid":
      return <CollectionGridView data={data} />;
    case "compact":
      return <CollectionCompactView data={data} />;
    case "binder":
      return <CollectionBinderView data={data} />;
    default:
      return <CollectionTable data={data} />;
  }
}
