"use client";

import { useMemo } from "react";
import { CollectionTopBar } from "@/features/collection/components/CollectionTopBar";
import { CollectionFilters } from "@/features/collection/components/CollectionFilters";
import { CollectionContent } from "@/features/collection/components/CollectionContent";
import { BulkActionsBar } from "@/features/collection/components/BulkActionsBar";
import { QuickAddModal } from "@/features/collection/components/QuickAddModal";
import { ImportModal } from "@/features/import/components/ImportModal";
import { CardInspectDialog } from "@/components/shared/CardInspectDialog";
import { CollectionPresenceProvider } from "@/features/collection/context/presence-context";
import {
  YugiohPasscodeProvider,
  YugiohPasscodeSync,
} from "@/features/collection/context/yugioh-passcode-context";
import { useCollectionUIStore } from "@/features/collection/stores/collection-ui.store";
import { useAppData } from "@/hooks/useAppData";
import { filterOwnedCards } from "@/features/collection/utils/filters";

export default function CollectionPage() {
  const inspectCardId = useCollectionUIStore((s) => s.detailCardId);
  const inspectTab = useCollectionUIStore((s) => s.inspectTab);
  const closeCardInspect = useCollectionUIStore((s) => s.closeCardInspect);
  const quickAddOpen = useCollectionUIStore((s) => s.quickAddOpen);
  const setQuickAddOpen = useCollectionUIStore((s) => s.setQuickAddOpen);
  const importOpen = useCollectionUIStore((s) => s.importOpen);
  const setImportOpen = useCollectionUIStore((s) => s.setImportOpen);
  const focusedRowIndex = useCollectionUIStore((s) => s.focusedRowIndex);
  const filters = useCollectionUIStore((s) => s.filters);

  const { profile, ownedCards, activeCollectionId, isSupabaseMode, isLoading } =
    useAppData();

  const collectionCards = useMemo(
    () => ownedCards.filter((oc) => oc.collectionId === activeCollectionId),
    [ownedCards, activeCollectionId]
  );

  const filtered = useMemo(
    () => filterOwnedCards(ownedCards, filters, activeCollectionId),
    [ownedCards, filters, activeCollectionId]
  );

  if (isLoading || !activeCollectionId) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Carregando coleção...
      </div>
    );
  }

  const presenceCardId =
    inspectCardId ?? filtered[focusedRowIndex]?.id ?? null;

  const inspectCard = inspectCardId
    ? (ownedCards.find((oc) => oc.id === inspectCardId) ?? null)
    : null;

  return (
    <YugiohPasscodeProvider cards={collectionCards}>
      <YugiohPasscodeSync cards={collectionCards}>
        <CollectionPresenceProvider
          collectionId={activeCollectionId}
          displayName={profile.displayName ?? "Collector"}
          selectedOwnedCardId={presenceCardId}
          enabled={isSupabaseMode}
        >
          <div className="flex h-full flex-col">
            <CollectionTopBar />
            <div className="flex flex-1 overflow-hidden">
              <aside className="hidden w-56 shrink-0 border-r border-border bg-card/30 lg:block">
                <CollectionFilters />
              </aside>
              <div className="flex flex-1 flex-col overflow-hidden">
                <CollectionContent />
              </div>
            </div>
            <BulkActionsBar />
            <QuickAddModal open={quickAddOpen} onOpenChange={setQuickAddOpen} />
            <ImportModal open={importOpen} onOpenChange={setImportOpen} />
            <CardInspectDialog
              card={inspectCard}
              open={!!inspectCardId && !!inspectCard}
              tab={inspectTab}
              onOpenChange={(open) => !open && closeCardInspect()}
              currency={profile.currency}
            />
          </div>
        </CollectionPresenceProvider>
      </YugiohPasscodeSync>
    </YugiohPasscodeProvider>
  );
}
