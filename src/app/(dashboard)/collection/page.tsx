"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { CollectionTopBar } from "@/features/collection/components/CollectionTopBar";
import { CollectionFilters } from "@/features/collection/components/CollectionFilters";
import { CollectionContent } from "@/features/collection/components/CollectionContent";
import { BulkActionsBar } from "@/features/collection/components/BulkActionsBar";
import { CollectionViewProvider } from "@/features/collection/context/collection-view-context";
import {
  YugiohPasscodeProvider,
  YugiohPasscodeSync,
} from "@/features/collection/context/yugioh-passcode-context";
import { useCollectionUIStore } from "@/features/collection/stores/collection-ui.store";
import { useAppData } from "@/hooks/useAppData";
import { PageLoading } from "@/components/shared/PageLoading";
import { Modal } from "@/components/shared/Modal";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/context";
import { useDataUiStore } from "@/lib/data/ui-store";
import { PanelRightOpen } from "lucide-react";
import { toast } from "sonner";

const QuickAddModal = dynamic(
  () =>
    import("@/features/collection/components/QuickAddModal").then((m) => m.QuickAddModal),
  { ssr: false }
);

const CardInspectDialog = dynamic(
  () => import("@/components/shared/CardInspectDialog").then((m) => m.CardInspectDialog),
  { ssr: false }
);

function CollectionPageBody() {
  const t = useT();
  const inspectCardId = useCollectionUIStore((s) => s.detailCardId);
  const inspectTab = useCollectionUIStore((s) => s.inspectTab);
  const closeCardInspect = useCollectionUIStore((s) => s.closeCardInspect);
  const pendingDeleteCardId = useCollectionUIStore((s) => s.pendingDeleteCardId);
  const clearPendingDeleteCard = useCollectionUIStore((s) => s.clearPendingDeleteCard);
  const quickAddSidebarOpen = useDataUiStore((s) => s.quickAddSidebarOpen);
  const setQuickAddSidebarOpen = useDataUiStore((s) => s.setQuickAddSidebarOpen);

  const { profile, ownedCards, deleteOwnedCards } = useAppData();

  const inspectCard = inspectCardId
    ? (ownedCards.find((oc) => oc.id === inspectCardId) ?? null)
    : null;

  const pendingDeleteCard = pendingDeleteCardId
    ? (ownedCards.find((oc) => oc.id === pendingDeleteCardId) ?? null)
    : null;

  const confirmDeleteCard = async () => {
    if (!pendingDeleteCardId) return;
    await deleteOwnedCards([pendingDeleteCardId]);
    toast.success(t("collection.cardRemoved"));
    if (inspectCardId === pendingDeleteCardId) closeCardInspect();
    clearPendingDeleteCard();
  };

  return (
    <div className="flex h-full min-h-0 w-full">
      <h1 className="sr-only">{t("nav.collection")}</h1>
      <div className="flex min-w-0 flex-1 flex-col max-md:pb-[48dvh]">
        <CollectionTopBar />
        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[14rem_minmax(0,1fr)]">
          <aside className="hidden min-h-0 min-w-0 border-r border-border bg-card/30 lg:block">
            <CollectionFilters />
          </aside>
          <div className="flex min-h-0 min-w-0 w-full flex-col overflow-hidden">
            <CollectionContent />
          </div>
        </div>
        <BulkActionsBar />
      </div>
      {quickAddSidebarOpen ? (
        <QuickAddModal
          open
          onOpenChange={() => {}}
          closeOnAdd={false}
          persistent
          embedded
        />
      ) : (
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setQuickAddSidebarOpen(true)}
          className="fixed right-2 top-1/2 z-30 h-10 w-8 -translate-y-1/2 rounded-r-none border-r-0 bg-card shadow-lg"
          aria-label="Open Quick Add"
          title="Open Quick Add"
        >
          <PanelRightOpen className="h-4 w-4" />
        </Button>
      )}
      {inspectCardId && inspectCard && (
        <CardInspectDialog
          card={inspectCard}
          open
          tab={inspectTab}
          onOpenChange={(open) => !open && closeCardInspect()}
          currency={profile.currency}
        />
      )}
      <Modal
        open={pendingDeleteCardId != null && pendingDeleteCard != null}
        onOpenChange={(open) => {
          if (!open) clearPendingDeleteCard();
        }}
        title={t("collection.deleteCardTitle")}
        description={t("collection.deleteCardDescription", {
          name: pendingDeleteCard?.card.name ?? "",
        })}
        footer={
          <>
            <Button variant="outline" onClick={clearPendingDeleteCard}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={() => void confirmDeleteCard()}>
              {t("common.delete")}
            </Button>
          </>
        }
      >
        <span className="sr-only">{t("collection.deleteCardTitle")}</span>
      </Modal>
    </div>
  );
}

export default function CollectionPage() {
  const t = useT();
  const { ownedCards, activeCollectionId, isLoading } = useAppData();

  const collectionCards = useMemo(
    () => ownedCards.filter((oc) => oc.collectionId === activeCollectionId),
    [ownedCards, activeCollectionId]
  );

  if (isLoading || !activeCollectionId) {
    return <PageLoading label={t("collection.loading")} />;
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
