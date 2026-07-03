"use client";

import { Layers } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { CollectionTable } from "@/features/collection/components/CollectionTable";
import { CollectionGridView } from "@/features/collection/components/CollectionGridView";
import { CollectionCompactView } from "@/features/collection/components/CollectionCompactView";
import { useCollectionViewData } from "@/features/collection/hooks/useCollectionViewData";
import { useCollectionUIStore } from "@/features/collection/stores/collection-ui.store";
import { useMediaQuery } from "@/hooks/useMediaQuery";

export function CollectionContent() {
  const data = useCollectionViewData();
  const viewMode = useCollectionUIStore((s) => s.viewMode);
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
    default:
      return <CollectionTable data={data} />;
  }
}
