"use client";

import dynamic from "next/dynamic";
import { Layers } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { useCollectionView } from "@/features/collection/context/collection-view-context";
import { useCollectionUIStore } from "@/features/collection/stores/collection-ui.store";
import { useMediaQuery } from "@/hooks/useMediaQuery";

const CollectionTable = dynamic(
  () =>
    import("@/features/collection/components/CollectionTable").then(
      (m) => m.CollectionTable
    ),
  { ssr: false }
);

const CollectionGridView = dynamic(
  () =>
    import("@/features/collection/components/CollectionGridView").then(
      (m) => m.CollectionGridView
    ),
  { ssr: false }
);

const CollectionCompactView = dynamic(
  () =>
    import("@/features/collection/components/CollectionCompactView").then(
      (m) => m.CollectionCompactView
    ),
  { ssr: false }
);

const CollectionBinderView = dynamic(
  () =>
    import("@/features/collection/components/CollectionBinderView").then(
      (m) => m.CollectionBinderView
    ),
  { ssr: false }
);

export function CollectionContent() {
  const data = useCollectionView();
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
        filters.minQuantity !== null);

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
      return <CollectionGridView />;
    case "compact":
      return <CollectionCompactView />;
    case "binder":
      return <CollectionBinderView />;
    default:
      return <CollectionTable />;
  }
}
