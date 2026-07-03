"use client";

import { CollectionTopBar } from "@/features/collection/components/CollectionTopBar";
import { CollectionFilters } from "@/features/collection/components/CollectionFilters";
import { CollectionTable } from "@/features/collection/components/CollectionTable";
import { BulkActionsBar } from "@/features/collection/components/BulkActionsBar";
import { QuickAddModal } from "@/features/collection/components/QuickAddModal";
import { ImportModal } from "@/features/import/components/ImportModal";
import { CardDetailSheet } from "@/components/shared/CardDetailSheet";
import { MarketplaceSheet } from "@/features/market/components/MarketplaceSheet";
import { useCollectionUIStore } from "@/features/collection/stores/collection-ui.store";
import { useDemoStore } from "@/lib/demo/store";

export default function CollectionPage() {
  const detailCardId = useCollectionUIStore((s) => s.detailCardId);
  const marketplaceCardId = useCollectionUIStore((s) => s.marketplaceCardId);
  const setDetailCardId = useCollectionUIStore((s) => s.setDetailCardId);
  const setMarketplaceCardId = useCollectionUIStore((s) => s.setMarketplaceCardId);
  const quickAddOpen = useCollectionUIStore((s) => s.quickAddOpen);
  const setQuickAddOpen = useCollectionUIStore((s) => s.setQuickAddOpen);
  const importOpen = useCollectionUIStore((s) => s.importOpen);
  const setImportOpen = useCollectionUIStore((s) => s.setImportOpen);
  const profile = useDemoStore((s) => s.profile);

  const detailCard = useDemoStore((s) =>
    detailCardId ? s.ownedCards.find((oc) => oc.id === detailCardId) ?? null : null
  );
  const marketplaceCard = useDemoStore((s) =>
    marketplaceCardId ? s.ownedCards.find((oc) => oc.id === marketplaceCardId) ?? null : null
  );

  return (
    <div className="flex h-full flex-col">
      <CollectionTopBar />
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-56 shrink-0 border-r border-border bg-card/30 lg:block">
          <CollectionFilters />
        </aside>
        <div className="flex flex-1 flex-col overflow-hidden">
          <CollectionTable />
        </div>
      </div>
      <BulkActionsBar />
      <QuickAddModal open={quickAddOpen} onOpenChange={setQuickAddOpen} />
      <ImportModal open={importOpen} onOpenChange={setImportOpen} />
      <CardDetailSheet
        ownedCardId={detailCardId}
        open={!!detailCardId && !!detailCard}
        onOpenChange={(open) => !open && setDetailCardId(null)}
        currency={profile.currency}
        onOpenMarketplace={() => {
          if (detailCardId) {
            setDetailCardId(null);
            setMarketplaceCardId(detailCardId);
          }
        }}
      />
      <MarketplaceSheet
        card={marketplaceCard}
        open={!!marketplaceCardId && !!marketplaceCard}
        onOpenChange={(open) => !open && setMarketplaceCardId(null)}
        currency={profile.currency}
        onViewDetails={() => {
          if (marketplaceCardId) {
            setMarketplaceCardId(null);
            setDetailCardId(marketplaceCardId);
          }
        }}
      />
    </div>
  );
}
