"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { CollectionManager } from "@/features/collection/components/CollectionManager";

export default function CollectionsPage() {
  return (
    <div className="flex-1 overflow-auto p-8">
      <PageHeader
        title="Deck Manager"
        description="Select a collection to browse cards, or create a new one"
      />

      <div className="mt-8">
        <CollectionManager />
      </div>
    </div>
  );
}
