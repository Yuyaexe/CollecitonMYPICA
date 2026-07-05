"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Plus, Loader2, SlidersHorizontal } from "lucide-react";
import { Modal } from "@/components/shared/Modal";
import { SearchBar } from "@/components/shared/SearchBar";
import { CardImage } from "@/components/shared/CardImage";
import { RarityBadge } from "@/components/shared/RarityBadge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/useMediaQuery";
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
import type { CardSearchResult, CatalogSearchLocale } from "@/features/catalog/services/card-api/types";
import {
  readSearchLocale,
  SEARCH_LOCALE_OPTIONS,
  writeSearchLocale,
} from "@/features/catalog/utils/search-locale";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { useCardTraderVariantPrices } from "@/features/market/hooks/useCardTraderPrices";
import { YugiohAdvancedSearchPanel } from "@/features/catalog/components/YugiohAdvancedSearchPanel";
import {
  EMPTY_YGO_ADVANCED_FILTERS,
  hasActiveYgoAdvancedFilters,
  type YugiohAdvancedSearchFilters,
} from "@/lib/yugioh/advanced-search";

interface QuickAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd?: (
    result: CardSearchResult,
    game: { id: string; slug: string; name: string }
  ) => void | Promise<void>;
  title?: string;
  defaultGameSlug?: QuickAddGameSlug;
  closeOnAdd?: boolean;
}

const MAX_VARIANT_PRICE_FETCH = 16;
const SEARCH_DEBOUNCE_MS = 120;

const GAME_SELECT_OPTIONS = QUICK_ADD_GAMES.map((g) => ({
  value: g.slug,
  label: g.name,
}));

export function QuickAddModal({
  open,
  onOpenChange,
  onAdd,
  title = "Quick Add",
  defaultGameSlug,
  closeOnAdd = true,
}: QuickAddModalProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [pendingCard, setPendingCard] = useState<CardSearchResult | null>(null);
  const [rarityFilter, setRarityFilter] = useState("all");
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const [selectedGameSlug, setSelectedGameSlug] = useState<QuickAddGameSlug>(
    defaultGameSlug ?? QUICK_ADD_GAMES[0]?.slug ?? "yugioh"
  );
  const [searchLocale, setSearchLocale] = useState<CatalogSearchLocale>("en");
  const [searchErrorDetail, setSearchErrorDetail] = useState<string | null>(null);
  const [ygoSearchMode, setYgoSearchMode] = useState<"simple" | "advanced">("simple");
  const [ygoAdvancedFilters, setYgoAdvancedFilters] =
    useState<YugiohAdvancedSearchFilters>(EMPTY_YGO_ADVANCED_FILTERS);
  const [advancedSearchNonce, setAdvancedSearchNonce] = useState(0);
  const [mobileAdvancedTab, setMobileAdvancedTab] = useState<"filters" | "results">("filters");
  const isMobile = useMediaQuery("(max-width: 767px)");
  const { addCardFromSearch, profile } = useAppData();
  const game = getQuickAddGame(selectedGameSlug);

  useEffect(() => {
    if (open) {
      setSearchLocale(readSearchLocale(profile.currency));
    }
  }, [open, profile.currency]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
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
    setYgoSearchMode("simple");
    setYgoAdvancedFilters(EMPTY_YGO_ADVANCED_FILTERS);
    setAdvancedSearchNonce(0);
    setMobileAdvancedTab("filters");
  }, [selectedGameSlug]);

  const triggerAdvancedSearch = useCallback(() => {
    if (!hasActiveYgoAdvancedFilters(ygoAdvancedFilters)) return;
    setAdvancedSearchNonce((n) => n + 1);
    if (isMobile) setMobileAdvancedTab("results");
  }, [ygoAdvancedFilters, isMobile]);

  const {
    data: advancedData,
    isLoading: advancedLoading,
    isError: advancedError,
    isFetching: advancedFetching,
    error: advancedQueryError,
  } = useQuery<CardSearchResult[]>({
    queryKey: [
      "ygo-advanced-search",
      ygoAdvancedFilters,
      profile.currency,
      searchLocale,
      advancedSearchNonce,
    ],
    queryFn: async () => {
      setSearchErrorDetail(null);
      const res = await fetch("/api/cards/yugioh/advanced-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...ygoAdvancedFilters,
          locale: searchLocale,
        }),
      });
      const json = (await res.json()) as {
        results?: CardSearchResult[];
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        const detail = json.message ?? json.error ?? "Advanced search failed";
        setSearchErrorDetail(detail);
        throw new Error(detail);
      }
      return json.results ?? [];
    },
    enabled:
      game.slug === "yugioh" &&
      ygoSearchMode === "advanced" &&
      advancedSearchNonce > 0 &&
      hasActiveYgoAdvancedFilters(ygoAdvancedFilters),
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData: CardSearchResult[] | undefined) => previousData,
  });

  const { data, isLoading, isError, isFetching, error } = useQuery<CardSearchResult[]>({
    queryKey: ["card-search", debouncedQuery, game.slug, profile.currency, searchLocale],
    queryFn: async () => {
      setSearchErrorDetail(null);
      const localeParam =
        game.slug === "yugioh" && searchLocale === "pt" ? "&locale=pt" : "";
      const res = await fetch(
        `/api/cards/search?q=${encodeURIComponent(debouncedQuery)}&game=${game.slug}&currency=${profile.currency}&quick=1${localeParam}`
      );
      const json = (await res.json()) as {
        results?: CardSearchResult[];
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        const detail = json.message ?? json.error ?? "Search failed";
        setSearchErrorDetail(detail);
        throw new Error(detail);
      }
      return json.results ?? [];
    },
    enabled:
      ygoSearchMode === "simple" &&
      debouncedQuery.length >= 2 &&
      isQuickAddSupported(game.slug),
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData: CardSearchResult[] | undefined) => previousData,
  });

  const isAdvancedMode = game.slug === "yugioh" && ygoSearchMode === "advanced";
  const searchResults = isAdvancedMode ? (advancedData ?? []) : (data ?? []);
  const searchLoading = isAdvancedMode ? advancedLoading : isLoading;
  const searchFetching = isAdvancedMode ? advancedFetching : isFetching;
  const searchIsError = isAdvancedMode ? advancedError : isError;
  const searchQueryError = isAdvancedMode ? advancedQueryError : error;
  const hasSearchQuery = isAdvancedMode
    ? advancedSearchNonce > 0 && hasActiveYgoAdvancedFilters(ygoAdvancedFilters)
    : debouncedQuery.length >= 2;

  const showInitialLoader =
    searchLoading && hasSearchQuery && searchResults.length === 0;
  const showRefetchIndicator = searchFetching && !showInitialLoader && hasSearchQuery;

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
        blueprintId: resolveStoredBlueprintId(
          v.externalId,
          v.imageUrl,
          undefined,
          game.slug
        ),
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
    isFetching: variantPricesFetching,
  } = useCardTraderVariantPrices(
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
        if (searchLocale === "pt") {
          try {
            const detailRes = await fetch(
              `/api/cards/detail?game=yugioh&id=${encodeURIComponent(passcode)}`
            );
            if (detailRes.ok) {
              const detailJson = (await detailRes.json()) as {
                result?: { name?: string };
              };
              if (detailJson.result?.name) {
                toAdd = { ...toAdd, name: detailJson.result.name };
              }
            }
          } catch {
            // keep Portuguese name if English lookup fails
          }
        }
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
    if (closeOnAdd) {
      onOpenChange(false);
      setQuery("");
    }
    setPendingCard(null);
    setRarityFilter("all");
    setPreviewKey(null);
  };

  const handleCardClick = (result: CardSearchResult) => {
    const siblings =
      searchResults.filter(
        (r) =>
          r.externalId !== result.externalId &&
          (r.name === result.name ||
            (game.slug === "digimon" && digimonNamesMatch(r.name, result.name)))
      ) ?? [];

    const cardForVariants =
      siblings.length > 0
        ? {
            ...result,
            metadata: {
              ...result.metadata,
              ...(game.slug === "digimon"
                ? { digimonPrints: [result, ...siblings] }
                : { cardtraderPrints: [result, ...siblings] }),
            },
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
    if (variantPricesFetching && !variantPrices?.has(variantKey)) {
      return <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />;
    }
    if (variantPrices && variantPrices.has(variantKey)) {
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
      title={
        pendingCard
          ? "Choose print"
          : isAdvancedMode
            ? "Busca avançada"
            : title
      }
      description={
        pendingCard
          ? `${pendingCard.name} — select set and rarity`
          : isAdvancedMode
            ? `Filtre o catálogo ${game.name} e adicione à coleção`
            : `Search ${game.name} catalog`
      }
      className={cn(
        pendingCard
          ? "sm:max-w-4xl"
          : isAdvancedMode
            ? cn(
                "flex max-h-[min(92vh,900px)] flex-col gap-0 overflow-hidden sm:max-w-6xl",
                "max-sm:inset-x-0 max-sm:top-[2dvh] max-sm:bottom-auto max-sm:max-h-[96dvh]",
                "max-sm:w-full max-sm:max-w-[100vw] max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-xl"
              )
            : "sm:max-w-3xl max-sm:max-h-[92dvh] max-sm:overflow-y-auto"
      )}
    >
      <div className={cn("flex flex-col", isAdvancedMode && !pendingCard ? "min-h-0 flex-1 gap-4" : "space-y-4")}>
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
        ) : isAdvancedMode ? (
          <>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
              <ResponsiveSelect
                preferNative
                value={selectedGameSlug}
                onValueChange={(slug) => {
                  const next = QUICK_ADD_GAMES.find((g) => g.slug === slug);
                  if (next) setSelectedGameSlug(next.slug);
                }}
                options={GAME_SELECT_OPTIONS}
                triggerClassName="h-10 w-full sm:w-[200px]"
              />

              <ResponsiveSelect
                preferNative
                value={searchLocale}
                onValueChange={(value) => {
                  const locale = value as CatalogSearchLocale;
                  setSearchLocale(locale);
                  writeSearchLocale(locale);
                }}
                options={SEARCH_LOCALE_OPTIONS}
                triggerClassName="h-10 w-full sm:w-[88px]"
              />

              <div className="col-span-2 flex rounded-lg border border-border/50 bg-muted/20 p-0.5 sm:col-span-1">
                {(["simple", "advanced"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setYgoSearchMode(mode)}
                    className={cn(
                      "flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all sm:flex-none sm:py-1.5",
                      ygoSearchMode === mode
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {mode === "simple" ? "Simples" : "Avançada"}
                  </button>
                ))}
              </div>
            </div>

            {isMobile && (
              <div className="grid grid-cols-2 gap-1 rounded-xl border border-border/50 bg-muted/20 p-1">
                <button
                  type="button"
                  onClick={() => setMobileAdvancedTab("filters")}
                  className={cn(
                    "rounded-lg py-2.5 text-xs font-medium transition-all",
                    mobileAdvancedTab === "filters"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground"
                  )}
                >
                  Filtros
                </button>
                <button
                  type="button"
                  onClick={() => setMobileAdvancedTab("results")}
                  className={cn(
                    "relative rounded-lg py-2.5 text-xs font-medium transition-all",
                    mobileAdvancedTab === "results"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground"
                  )}
                >
                  Resultados
                  {searchResults.length > 0 && (
                    <span className="ml-1.5 inline-flex min-w-[1.25rem] rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-primary">
                      {searchResults.length}
                    </span>
                  )}
                </button>
              </div>
            )}

            <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(300px,340px)_1fr] lg:gap-5">
              {(!isMobile || mobileAdvancedTab === "filters") && (
                <div
                  className={cn(
                    "flex min-h-0 flex-col",
                    isMobile ? "overflow-y-auto" : "lg:max-h-[min(58vh,560px)]"
                  )}
                >
                  <YugiohAdvancedSearchPanel
                    filters={ygoAdvancedFilters}
                    onChange={setYgoAdvancedFilters}
                    onSearch={triggerAdvancedSearch}
                    isSearching={advancedFetching}
                    locale={searchLocale}
                    layout="sidebar"
                    preferNativeSelects
                    className="min-h-0"
                  />
                </div>
              )}

              {(!isMobile || mobileAdvancedTab === "results") && (
              <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border/50 bg-muted/10">
                <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Resultados</p>
                    <p className="text-xs text-muted-foreground">
                      {hasSearchQuery && searchResults.length > 0
                        ? `${searchResults.length} carta${searchResults.length === 1 ? "" : "s"}`
                        : advancedSearchNonce === 0
                          ? "Aguardando busca"
                          : "Nenhum resultado"}
                    </p>
                  </div>
                  {showRefetchIndicator && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Atualizando…
                    </div>
                  )}
                </div>

                <ScrollArea
                  className={cn(
                    "flex-1",
                    isMobile ? "h-[min(52dvh,420px)]" : "min-h-[240px] lg:min-h-0 lg:h-[min(52vh,520px)]"
                  )}
                >
                  <div className="p-4">
                    {showInitialLoader && (
                      <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        Buscando cartas…
                      </div>
                    )}

                    {advancedSearchNonce === 0 && !showInitialLoader && !searchFetching && (
                      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                        <SlidersHorizontal className="h-8 w-8 text-muted-foreground/50" />
                        <p className="text-sm font-medium text-muted-foreground">
                          Configure os filtros
                        </p>
                        <p className="max-w-[220px] text-xs text-muted-foreground/80">
                          Selecione atributos, tipos ou edições e clique em Buscar
                        </p>
                      </div>
                    )}

                    {hasSearchQuery && searchResults.length > 0 && (
                      <div
                        className={cn(
                          "grid grid-cols-3 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5",
                          showRefetchIndicator && "opacity-80"
                        )}
                      >
                        {searchResults.map((result) => (
                          <button
                            key={`${result.externalId}-${result.name}`}
                            type="button"
                            onClick={() => handleCardClick(result)}
                            className="group flex flex-col rounded-lg p-1 text-left transition-all hover:bg-background/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            title={result.name}
                          >
                            <div className="relative aspect-[59/86] w-full overflow-hidden rounded-lg bg-muted/80 shadow-sm ring-1 ring-border/40 transition-all group-hover:ring-primary/40">
                              <CardImage
                                src={result.imageUrl}
                                alt={result.name}
                                fill
                                sizes="120px"
                                className="object-contain"
                                fallbackSrc={
                                  /^\d{7,10}$/.test(result.externalId)
                                    ? `https://images.ygoprodeck.com/images/cards/${result.externalId}.jpg`
                                    : null
                                }
                              />
                              <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity group-hover:bg-black/25 group-hover:opacity-100">
                                <Plus className="h-5 w-5 text-white drop-shadow-md" />
                              </span>
                            </div>
                            <p className="mt-1.5 line-clamp-2 text-center text-[10px] font-medium leading-tight">
                              {result.name}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}

                    {searchIsError && (
                      <p className="py-16 text-center text-sm text-destructive">
                        {searchQueryError instanceof Error
                          ? searchQueryError.message
                          : searchErrorDetail ?? "Search failed"}
                      </p>
                    )}

                    {hasSearchQuery &&
                      !showInitialLoader &&
                      !searchFetching &&
                      !searchIsError &&
                      searchResults.length === 0 && (
                        <p className="py-16 text-center text-sm text-muted-foreground">
                          Nenhuma carta encontrada com esses filtros
                        </p>
                      )}
                  </div>
                </ScrollArea>
              </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <ResponsiveSelect
                preferNative
                value={selectedGameSlug}
                onValueChange={(slug) => {
                  const next = QUICK_ADD_GAMES.find((g) => g.slug === slug);
                  if (next) setSelectedGameSlug(next.slug);
                }}
                options={GAME_SELECT_OPTIONS}
                triggerClassName="h-10 w-full sm:w-[220px]"
              />
              {game.slug === "yugioh" && (
                <>
                  <ResponsiveSelect
                    preferNative
                    value={searchLocale}
                    onValueChange={(value) => {
                      const locale = value as CatalogSearchLocale;
                      setSearchLocale(locale);
                      writeSearchLocale(locale);
                    }}
                    options={SEARCH_LOCALE_OPTIONS}
                    triggerClassName="h-10 w-full sm:w-[100px]"
                  />
                  <div className="flex rounded-lg border border-border/50 bg-muted/20 p-0.5">
                    {(["simple", "advanced"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setYgoSearchMode(mode)}
                        className={cn(
                          "flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all sm:flex-none sm:py-1.5",
                          ygoSearchMode === mode
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {mode === "simple" ? "Simples" : "Avançada"}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <SearchBar
                value={query}
                onChange={setQuery}
                placeholder={
                  game.slug === "yugioh" && searchLocale === "pt"
                    ? `Buscar cartas ${game.name}...`
                    : `Search ${game.name} cards...`
                }
                enableShortcut={false}
                className="flex-1"
              />
            </div>

            {!isQuickAddSupported(game.slug) && (
              <p className="text-sm text-muted-foreground">
                Search not available for {game.name}. Use CSV Import instead.
              </p>
            )}

            <ScrollArea className="h-[360px] pr-3">
              {showRefetchIndicator && (
                <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Updating…
                </div>
              )}

              {showInitialLoader && (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Searching {game.name}…
                </div>
              )}

              {hasSearchQuery && searchResults.length > 0 && (
                <div
                  className={cn(
                    "grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6",
                    showRefetchIndicator && "opacity-80"
                  )}
                >
                  {searchResults.map((result) => (
                    <button
                      key={`${result.externalId}-${result.name}`}
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
                          fallbackSrc={
                            game.slug === "yugioh" && /^\d{7,10}$/.test(result.externalId)
                              ? `https://images.ygoprodeck.com/images/cards/${result.externalId}.jpg`
                              : null
                          }
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

              {searchIsError && (
                <p className="py-12 text-center text-sm text-destructive">
                  {searchQueryError instanceof Error
                    ? searchQueryError.message
                    : searchErrorDetail ?? "Search failed"}
                </p>
              )}

              {hasSearchQuery &&
                !showInitialLoader &&
                !searchFetching &&
                !searchIsError &&
                searchResults.length === 0 && (
                  <p className="py-12 text-center text-sm text-muted-foreground">No cards found</p>
                )}
            </ScrollArea>
          </>
        )}
      </div>
    </Modal>
  );
}
