"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Plus, Loader2 } from "lucide-react";
import { Modal } from "@/components/shared/Modal";
import { SearchBar } from "@/components/shared/SearchBar";
import { CardImage } from "@/components/shared/CardImage";
import { RarityBadge } from "@/components/shared/RarityBadge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEMO_GAMES } from "@/lib/demo/types";
import { useAppData } from "@/hooks/useAppData";
import { isApiSupported } from "@/features/catalog/services/card-api";
import {
  applyVariant,
  getSearchResultVariants,
} from "@/features/catalog/services/card-api/variants";
import type { CardSearchResult } from "@/features/catalog/services/card-api/types";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface QuickAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickAddModal({ open, onOpenChange }: QuickAddModalProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [pendingCard, setPendingCard] = useState<CardSearchResult | null>(null);
  const [rarityFilter, setRarityFilter] = useState("all");
  const { addCardFromSearch, profile } = useAppData();
  const defaultGameId = profile.defaultGameId;
  const game = DEMO_GAMES.find((g) => g.id === defaultGameId) ?? DEMO_GAMES[0];

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!open) {
      setPendingCard(null);
      setRarityFilter("all");
      setQuery("");
    }
  }, [open]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["card-search", debouncedQuery, game.slug, profile.currency],
    queryFn: async () => {
      const res = await fetch(
        `/api/cards/search?q=${encodeURIComponent(debouncedQuery)}&game=${game.slug}&currency=${profile.currency}`
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Search failed");
      }
      return (json.results ?? []) as CardSearchResult[];
    },
    enabled: debouncedQuery.length >= 2 && isApiSupported(game.slug),
    staleTime: 5 * 60 * 1000,
  });

  const variants = useMemo(
    () => (pendingCard ? getSearchResultVariants(pendingCard, game.slug) : []),
    [pendingCard, game.slug]
  );

  const rarityOptions = useMemo(
    () => [...new Set(variants.map((v) => v.rarity).filter(Boolean))] as string[],
    [variants]
  );

  const filteredVariants = useMemo(
    () =>
      rarityFilter === "all"
        ? variants
        : variants.filter((v) => v.rarity === rarityFilter),
    [variants, rarityFilter]
  );

  const handleAdd = async (result: CardSearchResult) => {
    await addCardFromSearch(result, game.id, game.slug, game.name);
    toast.success(`Added ${result.name}`);
    onOpenChange(false);
    setQuery("");
    setPendingCard(null);
  };

  const handleCardClick = (result: CardSearchResult) => {
    const prints = getSearchResultVariants(result, game.slug);
    if (prints.length <= 1) {
      void handleAdd(applyVariant(result, prints[0]));
      return;
    }
    setPendingCard(result);
    setRarityFilter("all");
  };

  const handleVariantPick = (variantKey: string) => {
    if (!pendingCard) return;
    const variant = variants.find((v) => v.key === variantKey);
    if (!variant) return;
    void handleAdd(applyVariant(pendingCard, variant));
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={pendingCard ? "Choose print" : "Quick Add"}
      description={
        pendingCard
          ? `${pendingCard.name} — select set and rarity`
          : `Search ${game.name} catalog`
      }
      className="sm:max-w-3xl"
    >
      <div className="space-y-4">
        {pendingCard ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 gap-1"
              onClick={() => {
                setPendingCard(null);
                setRarityFilter("all");
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to search
            </Button>

            <div className="flex justify-center">
              <CardImage
                src={pendingCard.imageUrl}
                alt={pendingCard.name}
                width={120}
                height={168}
                className="rounded-lg shadow-md"
              />
            </div>

            {rarityOptions.length > 1 && (
              <Select value={rarityFilter} onValueChange={setRarityFilter}>
                <SelectTrigger className="mx-auto max-w-xs">
                  <SelectValue placeholder="Filter by rarity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All rarities</SelectItem>
                  {rarityOptions.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <ScrollArea className="h-[320px] pr-2">
              <div className="space-y-1">
                {filteredVariants.map((variant) => (
                  <button
                    key={variant.key}
                    type="button"
                    onClick={() => handleVariantPick(variant.key)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-muted/50"
                  >
                    <RarityBadge rarity={variant.rarity} gameSlug={game.slug} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{variant.setName ?? "Unknown set"}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {variant.rarity ?? "—"}
                        {variant.setCode ? ` · ${variant.setCode}` : ""}
                      </p>
                    </div>
                    {variant.price != null && (
                      <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                        {formatCurrency(variant.price, profile.currency)}
                      </span>
                    )}
                    <Plus className="h-4 w-4 shrink-0 text-primary" />
                  </button>
                ))}
                {filteredVariants.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No prints for this rarity
                  </p>
                )}
              </div>
            </ScrollArea>
          </>
        ) : (
          <>
            <SearchBar
              value={query}
              onChange={setQuery}
              placeholder={`Search ${game.name} cards...`}
              enableShortcut={false}
            />

            {!isApiSupported(game.slug) && (
              <p className="text-sm text-muted-foreground">
                API not available for {game.name}. Use CSV Import instead.
              </p>
            )}

            <ScrollArea className="h-[420px] pr-3">
              {isLoading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}

              {data && data.length > 0 && (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                  {data.map((result) => (
                    <button
                      key={`${result.externalId}-${result.setCode ?? result.setName}-${result.collectorNumber ?? ""}`}
                      type="button"
                      onClick={() => handleCardClick(result)}
                      className="group flex flex-col rounded-lg p-1.5 text-left transition-all duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      title={result.name}
                    >
                      <div className="relative aspect-[59/86] w-full overflow-hidden rounded-md bg-muted shadow-sm ring-1 ring-border/50 transition-transform duration-150 group-hover:scale-[1.03] group-hover:ring-primary/40">
                        <CardImage
                          src={result.imageUrl}
                          alt={result.name}
                          fill
                          sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 120px"
                          className="object-contain"
                        />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity group-hover:bg-black/20 group-hover:opacity-100">
                          <Plus className="h-6 w-6 text-white drop-shadow-md" />
                        </span>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-center text-[11px] font-medium leading-tight text-foreground">
                        {result.name}
                      </p>
                      {result.rarity && (
                        <div className="mt-1 flex justify-center">
                          <RarityBadge rarity={result.rarity} gameSlug={game.slug} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {isError && (
                <p className="py-12 text-center text-sm text-destructive">
                  Search failed. Check your connection and try again.
                </p>
              )}

              {debouncedQuery.length >= 2 && !isLoading && !isError && data?.length === 0 && (
                <p className="py-12 text-center text-sm text-muted-foreground">No cards found</p>
              )}
            </ScrollArea>
          </>
        )}
      </div>
    </Modal>
  );
}
