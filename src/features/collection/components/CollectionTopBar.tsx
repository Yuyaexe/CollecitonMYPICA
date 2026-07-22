"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Plus, Upload, Download, LayoutGrid, X, History, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/shared/SearchBar";
import { MobileFilters } from "@/features/collection/components/MobileFilters";
import { CollectionViewSwitcher } from "@/features/collection/components/CollectionViewSwitcher";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { useCollectionView } from "@/features/collection/context/collection-view-context";
import { useCollectionUIStore } from "@/features/collection/stores/collection-ui.store";
import { useAppData } from "@/hooks/useAppData";
import { useDataUiStore } from "@/lib/data/ui-store";
import { mergeCollectionOrder, sortCollectionsByOrder } from "@/lib/collections/order";
import { formatNumber } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";

const ExportDeckModal = dynamic(
  () => import("@/features/import/components/ExportDeckModal").then((m) => m.ExportDeckModal),
  { ssr: false }
);

const ShareHubModal = dynamic(
  () =>
    import("@/features/collection/components/ShareHubModal").then((m) => m.ShareHubModal),
  { ssr: false }
);

export function CollectionTopBar() {
  const t = useT();
  const [exportOpen, setExportOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const filters = useCollectionUIStore((s) => s.filters);
  const setFilters = useCollectionUIStore((s) => s.setFilters);
  const setQuickAddOpen = useCollectionUIStore((s) => s.setQuickAddOpen);
  const setImportOpen = useCollectionUIStore((s) => s.setImportOpen);
  const collectionOrder = useDataUiStore((s) => s.collectionOrder);

  const {
    collections,
    activeCollectionId,
    setActiveCollection,
  } = useAppData();
  const { collectionCards, filtered } = useCollectionView();
  const sortedCollections = useMemo(
    () => sortCollectionsByOrder(collections, mergeCollectionOrder(collections, collectionOrder)),
    [collections, collectionOrder]
  );
  const activeCollection = collections.find((c) => c.id === activeCollectionId);
  const collectionSelectValue = useMemo(() => {
    const ids = new Set(sortedCollections.map((c) => c.id));
    const candidate = activeCollectionId ?? sortedCollections[0]?.id;
    if (candidate && ids.has(candidate)) return candidate;
    return sortedCollections[0]?.id;
  }, [activeCollectionId, sortedCollections]);

  const stats = useMemo(() => {
    const totalCards = collectionCards.reduce((sum, oc) => sum + oc.quantity, 0);
    const uniqueSets = new Set(collectionCards.map((oc) => oc.card.setName).filter(Boolean)).size;
    return { totalCards, uniqueSets };
  }, [collectionCards]);

  const hasActiveSearch = filters.search.trim().length > 0;
  const visibleCount = filtered.length;

  return (
    <>
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 sm:px-6 sm:py-4">
          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
            <div className="flex min-w-0 items-center gap-2">
              {sortedCollections.length > 0 && collectionSelectValue ? (
                <ResponsiveSelect
                  preferNative
                  value={collectionSelectValue}
                  onValueChange={setActiveCollection}
                  options={sortedCollections.map((c) => ({ value: c.id, label: c.name }))}
                  triggerClassName="h-9 max-w-[min(100%,12rem)] border-0 bg-transparent text-base font-semibold shadow-none focus:ring-0 sm:max-w-none sm:text-lg"
                />
              ) : (
                <span className="text-lg font-semibold text-muted-foreground">{t("common.loading")}</span>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
                <Link href="/collections" aria-label={t("collection.manageCollections")}>
                  <LayoutGrid className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setShareOpen(true)}
                aria-label={t("share.hubTitle")}
                title={t("share.hubTitle")}
              >
                <Share2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
                <Link href="/activity?scope=all" aria-label={t("activity.openLog")}>
                  <History className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm sm:flex sm:flex-wrap sm:gap-6">
              <div>
                <p className="text-xs text-muted-foreground">{t("collection.totalCards")}</p>
                <p className="font-semibold tabular-nums">{formatNumber(stats.totalCards)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("collection.sets")}</p>
                <p className="font-semibold tabular-nums">{stats.uniqueSets}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <CollectionViewSwitcher className="col-span-2 hidden sm:inline-flex" />
            <MobileFilters />
            <SearchBar
              value={filters.search}
              onChange={(v) => setFilters({ search: v })}
              className="col-span-2 w-full min-w-0 sm:col-span-1 sm:w-48 md:w-64"
            />
            <Button size="sm" onClick={() => setQuickAddOpen(true)}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t("collection.add")}</span>
            </Button>
            <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">{t("collection.import")}</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setExportOpen(true)}
              disabled={collectionCards.length === 0}
              title={
                collectionCards.length === 0
                  ? t("collection.exportDisabled")
                  : t("collection.exportTitle")
              }
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">{t("collection.export")}</span>
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-border/60 px-4 py-2 sm:hidden">
          <CollectionViewSwitcher className="flex-1" />
        </div>
        {hasActiveSearch && (
          <div className="flex items-center gap-2 border-t border-border/60 px-4 py-2 sm:px-6">
            <span className="text-xs text-muted-foreground">
              {t("collection.searchResults", {
                visible: visibleCount,
                total: stats.totalCards,
                query: filters.search.trim(),
              })}
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => setFilters({ search: "" })}
            >
              <X className="h-3 w-3" />
              {t("collection.clearSearch")}
            </Button>
          </div>
        )}
      </div>

      <ExportDeckModal
        open={exportOpen}
        onOpenChange={setExportOpen}
        cards={collectionCards}
        collectionName={activeCollection?.name ?? "collection"}
      />

      <ShareHubModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        preselectedCollectionId={activeCollectionId}
      />
    </>
  );
}
