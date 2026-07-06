"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { CollectionTopBar } from "@/features/collection/components/CollectionTopBar";
import { CollectionFilters } from "@/features/collection/components/CollectionFilters";
import { CollectionContent } from "@/features/collection/components/CollectionContent";
import { BulkActionsBar } from "@/features/collection/components/BulkActionsBar";
import { CollectionPresenceProvider } from "@/features/collection/context/presence-context";
import { CollectionViewProvider, useCollectionView } from "@/features/collection/context/collection-view-context";
import {
  YugiohPasscodeProvider,
  YugiohPasscodeSync,
} from "@/features/collection/context/yugioh-passcode-context";
import { useCollectionUIStore } from "@/features/collection/stores/collection-ui.store";
import { useAppData } from "@/hooks/useAppData";

const QuickAddModal = dynamic(
  () =>
    import("@/features/collection/components/QuickAddModal").then((m) => m.QuickAddModal),
  { ssr: false }
);

const ImportModal = dynamic(
  () => import("@/features/import/components/ImportModal").then((m) => m.ImportModal),
  { ssr: false }
);

const CardInspectDialog = dynamic(
  () => import("@/components/shared/CardInspectDialog").then((m) => m.CardInspectDialog),
  { ssr: false }
);

function CollectionPageBody() {
  const inspectCardId = useCollectionUIStore((s) => s.detailCardId);
  const inspectTab = useCollectionUIStore((s) => s.inspectTab);
  const closeCardInspect = useCollectionUIStore((s) => s.closeCardInspect);
  const quickAddOpen = useCollectionUIStore((s) => s.quickAddOpen);
  const setQuickAddOpen = useCollectionUIStore((s) => s.setQuickAddOpen);
  const importOpen = useCollectionUIStore((s) => s.importOpen);
  const setImportOpen = useCollectionUIStore((s) => s.setImportOpen);
  const focusedRowIndex = useCollectionUIStore((s) => s.focusedRowIndex);

  const { profile, ownedCards, activeCollectionId, isSupabaseMode } = useAppData();
  const { filtered } = useCollectionView();

  const presenceCardId = inspectCardId ?? filtered[focusedRowIndex]?.id ?? null;

  const inspectCard = inspectCardId
    ? (ownedCards.find((oc) => oc.id === inspectCardId) ?? null)
    : null;

  return (
    <CollectionPresenceProvider
      collectionId={activeCollectionId!}
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
        {quickAddOpen && (
          <QuickAddModal open={quickAddOpen} onOpenChange={setQuickAddOpen} />
        )}
        {importOpen && <ImportModal open={importOpen} onOpenChange={setImportOpen} />}
        {inspectCardId && inspectCard && (
          <CardInspectDialog
            card={inspectCard}
            open
            tab={inspectTab}
            onOpenChange={(open) => !open && closeCardInspect()}
            currency={profile.currency}
          />
        )}
      </div>
    </CollectionPresenceProvider>
  );
}

export default function CollectionPage() {
  const { ownedCards, activeCollectionId, isLoading } = useAppData();

  const collectionCards = useMemo(
    () => ownedCards.filter((oc) => oc.collectionId === activeCollectionId),
    [ownedCards, activeCollectionId]
  );

  if (isLoading || !activeCollectionId) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Carregando coleção...
      </div>
    );
  }

  return (
    <YugiohPasscodeProvider cards={collectionCards}>
      <YugiohPasscodeSync cards={collectionCards}>
        <CollectionViewProvider>
          <CollectionPageBody />
        </CollectionViewProvider>
      </YugiohPasscodeSync>
    </YugiohPasscodeProvider>
  );
}
