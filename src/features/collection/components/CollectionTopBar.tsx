"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Upload, Download, LayoutGrid, UserPlus, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/shared/SearchBar";
import { CollaboratorPresence } from "@/components/shared/CollaboratorPresence";
import { MobileFilters } from "@/features/collection/components/MobileFilters";
import { ShareCollectionModal } from "@/features/collection/components/ShareCollectionModal";
import { CollectionViewSwitcher } from "@/features/collection/components/CollectionViewSwitcher";
import { usePresenceContext } from "@/features/collection/context/presence-context";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useCollectionUIStore } from "@/features/collection/stores/collection-ui.store";
import { useAppData } from "@/hooks/useAppData";
import { useDataUiStore } from "@/lib/data/ui-store";
import { mergeCollectionOrder, sortCollectionsByOrder } from "@/lib/collections/order";
import { formatCurrency, formatNumber, cn } from "@/lib/utils";
import { ExportDeckModal } from "@/features/import/components/ExportDeckModal";
import { filterOwnedCards } from "@/features/collection/utils/filters";
import {
  mergeCardTraderQuoteMaps,
  resolveDisplayPrice,
  useCardTraderPrices,
} from "@/features/market/hooks/useCardTraderPrices";
import { useCardTraderBulkStore } from "@/features/collection/stores/cardtrader-bulk.store";
import { CollectionCardTraderSyncModal } from "@/features/collection/components/CollectionCardTraderSyncModal";

export function CollectionTopBar() {
  const [shareOpen, setShareOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const filters = useCollectionUIStore((s) => s.filters);
  const setFilters = useCollectionUIStore((s) => s.setFilters);
  const setQuickAddOpen = useCollectionUIStore((s) => s.setQuickAddOpen);
  const setImportOpen = useCollectionUIStore((s) => s.setImportOpen);
  const collectionOrder = useDataUiStore((s) => s.collectionOrder);
  const isMobile = useMediaQuery("(max-width: 767px)");
  const { peers } = usePresenceContext();

  const {
    ownedCards,
    collections,
    activeCollectionId,
    setActiveCollection,
    profile,
    isSupabaseMode,
  } = useAppData();

  const activeCollection = collections.find((c) => c.id === activeCollectionId);
  const sortedCollections = useMemo(
    () => sortCollectionsByOrder(collections, mergeCollectionOrder(collections, collectionOrder)),
    [collections, collectionOrder]
  );
  const collectionSelectValue = useMemo(() => {
    const ids = new Set(sortedCollections.map((c) => c.id));
    const candidate = activeCollectionId ?? sortedCollections[0]?.id;
    if (candidate && ids.has(candidate)) return candidate;
    return sortedCollections[0]?.id;
  }, [activeCollectionId, sortedCollections]);
  const collectionCards = ownedCards.filter((oc) => oc.collectionId === activeCollectionId);

  const { data: liveCardTraderPrices, isFetching: pricesFetching } = useCardTraderPrices(
    collectionCards,
    profile.currency,
    !!activeCollectionId
  );

  const bulkQuotes = useCardTraderBulkStore((s) => s.quotesByKey);

  const cardTraderPrices = useMemo(
    () => mergeCardTraderQuoteMaps(bulkQuotes, liveCardTraderPrices),
    [bulkQuotes, liveCardTraderPrices]
  );

  const stats = useMemo(() => {
    const totalCards = collectionCards.reduce((sum, oc) => sum + oc.quantity, 0);
    const totalValue = collectionCards.reduce((sum, oc) => {
      const price = resolveDisplayPrice(oc, cardTraderPrices, profile.currency) ?? 0;
      return sum + price * oc.quantity;
    }, 0);
    const uniqueSets = new Set(collectionCards.map((oc) => oc.card.setName).filter(Boolean)).size;
    return { totalCards, totalValue, uniqueSets };
  }, [collectionCards, cardTraderPrices, profile.currency]);

  const hasActiveSearch = filters.search.trim().length > 0;
  const visibleCount = useMemo(() => {
    if (!activeCollectionId) return 0;
    return filterOwnedCards(ownedCards, filters, activeCollectionId).length;
  }, [ownedCards, filters, activeCollectionId]);

  const handleExport = () => {
    setExportOpen(true);
  };

  return (
    <>
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 sm:px-6 sm:py-4">
          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
            <div className="flex min-w-0 items-center gap-2">
              {sortedCollections.length > 0 && collectionSelectValue ? (
                isMobile ? (
                  <ResponsiveSelect
                    preferNative
                    value={collectionSelectValue}
                    onValueChange={setActiveCollection}
                    options={sortedCollections.map((c) => ({ value: c.id, label: c.name }))}
                    triggerClassName="h-9 max-w-[min(100%,12rem)] border-0 bg-transparent text-base font-semibold shadow-none focus:ring-0 sm:max-w-none sm:text-lg"
                  />
                ) : (
                  <Select
                    value={collectionSelectValue}
                    onValueChange={setActiveCollection}
                  >
                    <SelectTrigger className="h-9 max-w-[min(100%,12rem)] border-0 bg-transparent text-base font-semibold shadow-none focus:ring-0 sm:max-w-none sm:text-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sortedCollections.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
              ) : (
                <span className="text-lg font-semibold text-muted-foreground">Carregando...</span>
              )}
              {isSupabaseMode && (
                <span className="rounded-md bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-violet-400">
                  Live
                </span>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
                <Link href="/collections" aria-label="Manage collections">
                  <LayoutGrid className="h-4 w-4" />
                </Link>
              </Button>
              {isSupabaseMode && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setShareOpen(true)}
                  aria-label="Share collection"
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              )}
            </div>

            {isSupabaseMode && <CollaboratorPresence peers={peers} />}

            <div className="grid grid-cols-3 gap-2 text-sm sm:flex sm:flex-wrap sm:gap-6">
              <div>
                <p className="text-xs text-muted-foreground">Total Cards</p>
                <p className="font-semibold tabular-nums">{formatNumber(stats.totalCards)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Value</p>
                <p className="font-semibold tabular-nums">
                  {formatCurrency(stats.totalValue, profile.currency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sets</p>
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
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSyncOpen(true)}
              disabled={pricesFetching}
              title="Sincronizar preços e links CardTrader"
              aria-label="CardTrader sync"
            >
              <RefreshCw className={cn("h-4 w-4", pricesFetching && "animate-spin")} />
              <span className="hidden md:inline">CardTrader</span>
            </Button>
            <Button size="sm" onClick={() => setQuickAddOpen(true)}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Quick Add</span>
            </Button>
            <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Import</span>
            </Button>
            <Button size="sm" variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-border/60 px-4 py-2 sm:hidden">
          <CollectionViewSwitcher className="flex-1" />
        </div>
        {hasActiveSearch && (
          <div className="flex items-center gap-2 border-t border-border/60 px-4 py-2 sm:px-6">
            <span className="text-xs text-muted-foreground">
              Showing {visibleCount} of {stats.totalCards} cards matching &quot;{filters.search.trim()}&quot;
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => setFilters({ search: "" })}
            >
              <X className="h-3 w-3" />
              Clear search
            </Button>
          </div>
        )}
      </div>

      {activeCollectionId && (
        <ShareCollectionModal
          open={shareOpen}
          onOpenChange={setShareOpen}
          collectionId={activeCollectionId}
          collectionName={activeCollection?.name ?? "Collection"}
        />
      )}

      <ExportDeckModal
        open={exportOpen}
        onOpenChange={setExportOpen}
        cards={collectionCards}
        collectionName={activeCollection?.name ?? "collection"}
      />

      <CollectionCardTraderSyncModal
        open={syncOpen}
        onOpenChange={setSyncOpen}
        collectionCards={collectionCards}
      />
    </>
  );
}
