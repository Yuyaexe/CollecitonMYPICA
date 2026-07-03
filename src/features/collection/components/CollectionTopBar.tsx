"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Upload, Download, LayoutGrid, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/shared/SearchBar";
import { CollaboratorPresence } from "@/components/shared/CollaboratorPresence";
import { MobileFilters } from "@/features/collection/components/MobileFilters";
import { ShareCollectionModal } from "@/features/collection/components/ShareCollectionModal";
import { usePresenceContext } from "@/features/collection/context/presence-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCollectionUIStore } from "@/features/collection/stores/collection-ui.store";
import { useAppData } from "@/hooks/useAppData";
import { computeCollectionStats } from "@/features/collection/utils/filters";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { exportCollectionCsv } from "@/features/import/services/export-csv";

export function CollectionTopBar() {
  const [shareOpen, setShareOpen] = useState(false);
  const filters = useCollectionUIStore((s) => s.filters);
  const setFilters = useCollectionUIStore((s) => s.setFilters);
  const setQuickAddOpen = useCollectionUIStore((s) => s.setQuickAddOpen);
  const setImportOpen = useCollectionUIStore((s) => s.setImportOpen);
  const { peers } = usePresenceContext();

  const {
    ownedCards,
    collections,
    activeCollectionId,
    setActiveCollection,
    profile,
    isSupabaseMode,
    isServerMode,
  } = useAppData();

  const activeCollection = collections.find((c) => c.id === activeCollectionId);
  const collectionCards = ownedCards.filter((oc) => oc.collectionId === activeCollectionId);
  const stats = computeCollectionStats(collectionCards);

  const handleExport = () => {
    exportCollectionCsv(collectionCards, activeCollection?.name ?? "collection");
  };

  return (
    <>
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex flex-wrap items-center gap-4 px-6 py-4">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              {collections.length > 0 ? (
                <Select
                  value={activeCollectionId ?? collections[0].id}
                  onValueChange={setActiveCollection}
                >
                  <SelectTrigger className="w-[200px] border-0 bg-transparent text-lg font-semibold shadow-none focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {collections.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-lg font-semibold text-muted-foreground">Carregando...</span>
              )}
              {isSupabaseMode && (
                <span className="rounded-md bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-violet-400">
                  Live
                </span>
              )}
              {isServerMode && !isSupabaseMode && (
                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
                  Postgres
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

            <div className="flex flex-wrap gap-6 text-sm">
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

          <div className="flex items-center gap-2">
            <MobileFilters />
            <SearchBar
              value={filters.search}
              onChange={(v) => setFilters({ search: v })}
              className="w-48 sm:w-64"
            />
            <Button size="sm" onClick={() => setQuickAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Quick Add
            </Button>
            <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" />
              Import
            </Button>
            <Button size="sm" variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {activeCollectionId && (
        <ShareCollectionModal
          open={shareOpen}
          onOpenChange={setShareOpen}
          collectionId={activeCollectionId}
          collectionName={activeCollection?.name ?? "Collection"}
        />
      )}
    </>
  );
}
