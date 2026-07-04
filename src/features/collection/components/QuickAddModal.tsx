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
import { cn } from "@/lib/utils";
import { useAppData } from "@/hooks/useAppData";
import { isQuickAddSupported, isApiSupported } from "@/features/catalog/services/card-api";
import { QUICK_ADD_GAMES, getQuickAddGame, type QuickAddGameSlug } from "@/features/collection/utils/quick-add-games";
import { resolveStoredBlueprintId } from "@/lib/cardtrader";
import { fetchYugiohCardByName } from "@/lib/yugioh/lookup";
import { resolveYugiohPasscode } from "@/lib/yugioh/passcode";
import { buildYgoImageUrl, pickYgoImageSizeForRarity } from "@/lib/yugioh/urls";
import {
  applyVariant,
  getSearchResultVariants,
  type CardPrintVariant,
} from "@/features/catalog/services/card-api/variants";
import { digimonNamesMatch } from "@/features/catalog/services/card-api/digimon.utils";
import type { CardSearchResult } from "@/features/catalog/services/card-api/types";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { useSequentialVariantPrices } from "@/features/market/hooks/useCardTraderPrices";

interface QuickAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd?: (
    result: CardSearchResult,
    game: { id: string; slug: string; name: string }
  ) => void | Promise<void>;
  title?: string;
  defaultGameSlug?: QuickAddGameSlug;
}

const MAX_VARIANT_PRICE_FETCH = 16;

export function QuickAddModal({
  open,
  onOpenChange,
  onAdd,
  title = "Quick Add",
  defaultGameSlug,
}: QuickAddModalProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [pendingCard, setPendingCard] = useState<CardSearchResult | null>(null);
  const [rarityFilter, setRarityFilter] = useState("all");
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const [selectedGameSlug, setSelectedGameSlug] = useState<QuickAddGameSlug>(
    defaultGameSlug ?? QUICK_ADD_GAMES[0]?.slug ?? "yugioh"
  );
  const { addCardFromSearch, profile } = useAppData();
  const game = getQuickAddGame(selectedGameSlug);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!open) {
      setPendingCard(null);
      setRarityFilter("all");
      setPreviewKey(null);
      setQuery("");
    }
  }, [open]);

  useEffect(() => {
    if (open && defaultGameSlug) {
      setSelectedGameSlug(defaultGameSlug);
    }
  }, [open, defaultGameSlug]);

  useEffect(() => {
    setPendingCard(null);
    setQuery("");
    setDebouncedQuery("");
    setRarityFilter("all");
    setPreviewKey(null);
  }, [selectedGameSlug]);

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ["card-search", debouncedQuery, game.slug, profile.currency],
    queryFn: async () => {
      const res = await fetch(
        `/api/cards/search?q=${encodeURIComponent(debouncedQuery)}&game=${game.slug}&currency=${profile.currency}`
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? json.message ?? "Search failed");
      }
      return (json.results ?? []) as CardSearchResult[];
    },
    enabled: debouncedQuery.length >= 2 && isQuickAddSupported(game.slug),
    staleTime: 5 * 60 * 1000,
  });

  const variants = useMemo(
    () => (pendingCard ? getSearchResultVariants(pendingCard, game.slug) : []),
    [pendingCard, game.slug]
  );

  const variantInputs = useMemo(
    () =>
      variants.slice(0, MAX_VARIANT_PRICE_FETCH).map((v) => ({
        key: v.key,
        setName: v.setName,
        setCode: v.setCode,
        collectorNumber: v.collectorNumber,
        rarity: v.rarity,
        variantLabel: v.variantLabel,
        tcgPlayerId: v.tcgPlayerId,
        cardTraderRarityHint: v.cardTraderRarityHint,
        blueprintId: resolveStoredBlueprintId(v.externalId, v.imageUrl),
      })),
    [variants]
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

  useEffect(() => {
    if (!pendingCard) {
      setPreviewKey(null);
      return;
    }
    const first = filteredVariants[0] ?? variants[0];
    setPreviewKey(first?.key ?? null);
  }, [pendingCard, filteredVariants, variants]);

  const usesCatalogImages = isApiSupported(game.slug);

  const {
    data: variantPrices,
    pendingKeys: pricePendingKeys,
    resolvedKeys: priceResolvedKeys,
  } = useSequentialVariantPrices(
    pendingCard?.name ?? "",
    game.slug,
    variantInputs,
    profile.currency,
    open && !!pendingCard
  );

  const previewVariant = useMemo(() => {
    if (!variants.length) return null;
    return variants.find((v) => v.key === previewKey) ?? filteredVariants[0] ?? variants[0];
  }, [variants, filteredVariants, previewKey]);

  const previewImage = useMemo(() => {
    if (!pendingCard || !previewVariant) return pendingCard?.imageUrl ?? null;
    if (usesCatalogImages) {
      return previewVariant.imageUrl ?? pendingCard.imageUrl;
    }
    return (
      variantPrices?.get(previewVariant.key)?.imageUrl ??
      previewVariant.imageUrl ??
      pendingCard.imageUrl
    );
  }, [pendingCard, previewVariant, variantPrices, usesCatalogImages]);

  const handleAdd = async (result: CardSearchResult) => {
    let toAdd = result;
    if (game.slug === "yugioh") {
      const passcode = resolveYugiohPasscode(result.externalId, result.imageUrl);
      if (passcode) {
        toAdd = {
          ...result,
          externalId: passcode,
          imageUrl:
            buildYgoImageUrl(passcode, pickYgoImageSizeForRarity(result.rarity)) ??
            result.imageUrl,
        };
      } else {
        const ygo = await fetchYugiohCardByName(result.name);
        if (ygo?.externalId) {
          toAdd = {
            ...result,
            externalId: ygo.externalId,
            imageUrl:
              buildYgoImageUrl(ygo.externalId, pickYgoImageSizeForRarity(result.rarity)) ??
              result.imageUrl,
          };
        }
      }
    }
    if (onAdd) {
      await onAdd(toAdd, game);
    } else {
      await addCardFromSearch(toAdd, game.id, game.slug, game.name);
    }
    toast.success(`Added ${result.name}`);
    onOpenChange(false);
    setQuery("");
    setPendingCard(null);
  };

  const handleCardClick = (result: CardSearchResult) => {
    const siblings =
      data?.filter(
        (r) =>
          r.externalId !== result.externalId &&
          (r.name === result.name ||
            (game.slug === "digimon" && digimonNamesMatch(r.name, result.name)))
      ) ?? [];
    const cardForVariants =
      siblings.length > 0
        ? {
            ...result,
            metadata: { ...result.metadata, cardtraderPrints: siblings },
          }
        : result;

    const prints = getSearchResultVariants(cardForVariants, game.slug);
    if (prints.length <= 1) {
      void handleAdd(applyVariant(cardForVariants, prints[0]));
      return;
    }
    setPendingCard(cardForVariants);
    setRarityFilter("all");
  };

  const handleVariantPick = (variant: CardPrintVariant) => {
    if (!pendingCard) return;
    const cardTraderPrice = variantPrices?.get(variant.key)?.price;
    const result = applyVariant(pendingCard, variant);
    void handleAdd({
      ...result,
      price: cardTraderPrice ?? result.price ?? null,
      imageUrl: usesCatalogImages
        ? result.imageUrl
        : variantPrices?.get(variant.key)?.imageUrl ?? result.imageUrl,
    });
  };

  const renderVariantPrice = (variantKey: string) => {
    const quote = variantPrices?.get(variantKey);
    if (quote?.price != null) {
      return (
        <span className="text-sm tabular-nums text-muted-foreground">
          {formatCurrency(quote.price, profile.currency)}
        </span>
      );
    }
    if (pricePendingKeys.has(variantKey)) {
      return <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />;
    }
    if (priceResolvedKeys.has(variantKey)) {
      return (
        <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          NIL
        </span>
      );
    }
    return null;
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={pendingCard ? "Choose print" : title}
      description={
        pendingCard
          ? `${pendingCard.name} — select set and rarity`
          : `Search ${game.name} catalog`
      }
      className={pendingCard ? "sm:max-w-4xl" : "sm:max-w-3xl"}
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
                setPreviewKey(null);
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to search
            </Button>

            <div className="flex flex-col gap-5 md:flex-row md:gap-6">
              <div className="flex shrink-0 flex-col items-center md:w-[168px]">
                <CardImage
                  src={previewImage}
                  alt={pendingCard.name}
                  width={152}
                  height={222}
                  className="rounded-lg object-contain shadow-lg ring-1 ring-border/40"
                />
                <p className="mt-3 text-center text-sm font-semibold leading-tight">
                  {pendingCard.name}
                </p>
                {previewVariant && (
                  <div className="mt-2">
                    <RarityBadge rarity={previewVariant.rarity} gameSlug={game.slug} size="md" />
                  </div>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-3">
                {rarityOptions.length > 1 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setRarityFilter("all")}
                      className={cn(
                        "rounded-md border px-2 py-1 text-xs font-medium transition-colors",
                        rarityFilter === "all"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/60 text-muted-foreground hover:bg-muted/50"
                      )}
                    >
                      All
                    </button>
                    {rarityOptions.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRarityFilter(r)}
                        className={cn(
                          "rounded-md border p-0.5 transition-colors",
                          rarityFilter === r
                            ? "border-primary ring-1 ring-primary/40"
                            : "border-transparent hover:border-border/60"
                        )}
                        title={r}
                      >
                        <RarityBadge rarity={r} gameSlug={game.slug} size="md" />
                      </button>
                    ))}
                  </div>
                )}

                <ScrollArea className="h-[340px] pr-2">
                  <div className="space-y-1">
                    {filteredVariants.map((variant) => (
                      <button
                        key={variant.key}
                        type="button"
                        onMouseEnter={() => setPreviewKey(variant.key)}
                        onFocus={() => setPreviewKey(variant.key)}
                        onClick={() => handleVariantPick(variant)}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-muted/50",
                          previewKey === variant.key
                            ? "border-primary/50 bg-muted/30"
                            : "border-border/60"
                        )}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <RarityBadge rarity={variant.rarity} gameSlug={game.slug} size="md" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {variant.setName ?? "Unknown set"}
                              {variant.variantLabel ? ` · ${variant.variantLabel}` : ""}
                            </p>
                            {(variant.collectorNumber ?? variant.setCode) && (
                              <p className="truncate text-xs text-muted-foreground">
                                {variant.collectorNumber ?? variant.setCode}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {renderVariantPrice(variant.key)}
                          <Plus className="h-4 w-4 text-primary" />
                        </div>
                      </button>
                    ))}
                    {filteredVariants.length === 0 && (
                      <p className="py-8 text-center text-sm text-muted-foreground">
                        No prints for this rarity
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Select
                value={selectedGameSlug}
                onValueChange={(slug) => {
                  const next = QUICK_ADD_GAMES.find((g) => g.slug === slug);
                  if (next) setSelectedGameSlug(next.slug);
                }}
              >
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue placeholder="Game" />
                </SelectTrigger>
                <SelectContent>
                  {QUICK_ADD_GAMES.map((g) => (
                    <SelectItem key={g.slug} value={g.slug}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <SearchBar
                value={query}
                onChange={setQuery}
                placeholder={`Search ${game.name} cards...`}
                enableShortcut={false}
                className="flex-1"
              />
            </div>

            {!isQuickAddSupported(game.slug) && (
              <p className="text-sm text-muted-foreground">
                Search not available for {game.name}. Use CSV Import instead.
              </p>
            )}

            <ScrollArea className="h-[420px] pr-3">
              {(isLoading || isFetching) && debouncedQuery.length >= 2 && (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Searching {game.name}…
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
                    </button>
                  ))}
                </div>
              )}

              {isError && (
                <p className="py-12 text-center text-sm text-destructive">
                  Search failed. Check your connection and try again.
                </p>
              )}

              {debouncedQuery.length >= 2 && !isLoading && !isFetching && !isError && data?.length === 0 && (
                <p className="py-12 text-center text-sm text-muted-foreground">No cards found</p>
              )}
            </ScrollArea>
          </>
        )}
      </div>
    </Modal>
  );
}
