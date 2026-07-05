"use client";

import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { MOBILE_DIALOG_SHEET } from "@/lib/ui/mobile-dialog";
import { CardImage } from "@/components/shared/CardImage";
import { PriceBadge } from "@/components/shared/PriceBadge";
import { RarityBadge } from "@/components/shared/RarityBadge";
import { QuantityStepper } from "@/components/shared/QuantityStepper";
import { buildMarketplaceListings } from "@/features/market/services/marketplace";
import { useCardTraderVariantPrices, useCardTraderOwnedQuote } from "@/features/market/hooks/useCardTraderPrices";
import { isApiSupported } from "@/features/catalog/services/card-api";
import {
  findVariantForSelection,
  getSearchResultVariants,
  variantMatchesOwnedCard,
  buildVariantPriceBlueprintFields,
  type CardPrintVariant,
} from "@/features/catalog/services/card-api/variants";
import type { CardSearchResult } from "@/features/catalog/services/card-api/types";
import { CARD_CONDITIONS, CARD_LANGUAGES, CONDITION_LABELS } from "@/types/tcg";
import type { Currency } from "@/types/tcg";
import type { DemoOwnedCard } from "@/lib/demo/types";
import { useAppData } from "@/hooks/useAppData";
import { formatCurrency, cn } from "@/lib/utils";
import { resolveCardDisplayImage, isCardTraderHostedImage } from "@/lib/cards/preview-image";
import { useYugiohPasscodeForDisplay } from "@/hooks/useYugiohPasscodeForDisplay";
import { useYugiohCardImageRepair } from "@/hooks/useYugiohCardImageRepair";
import { resolveStoredBlueprintId, resolveCardTraderProductUrl } from "@/lib/cardtrader";
import { normalizeCatalogPrice } from "@/features/market/utils/display-price";
import { fetchYugiohOwnedCardDetail } from "@/lib/yugioh/lookup";
import { isCardTraderBlueprintExternalId } from "@/lib/yugioh/passcode";
import { buildYgoImageUrl, pickYgoImageSizeForRarity } from "@/lib/yugioh/urls";

export type CardInspectTab = "details" | "marketplace";

export type OwnedCardUpdates = Partial<Omit<DemoOwnedCard, "card">> & {
  card?: Partial<DemoOwnedCard["card"]>;
};

interface CardInspectDialogProps {
  card: DemoOwnedCard | null;
  open: boolean;
  tab?: CardInspectTab;
  onOpenChange: (open: boolean) => void;
  currency: Currency;
  onUpdate?: (id: string, updates: OwnedCardUpdates) => void;
  onDelete?: (ids: string[]) => void;
}

interface CardDetailResponse {
  result: CardSearchResult | null;
  relatedPrints: CardSearchResult[];
}

async function fetchCardDetail(
  externalId: string,
  gameSlug: string
): Promise<CardDetailResponse> {
  const res = await fetch(
    `/api/cards/detail?id=${encodeURIComponent(externalId)}&game=${encodeURIComponent(gameSlug)}`
  );
  if (!res.ok) return { result: null, relatedPrints: [] };
  return res.json();
}

async function fetchCardDetailForOwned(
  card: DemoOwnedCard["card"]
): Promise<CardDetailResponse> {
  if (card.gameSlug === "yugioh") {
    const resolved = await fetchYugiohOwnedCardDetail({
      name: card.name,
      setCode: card.setCode,
      collectorNumber: card.collectorNumber,
      externalId: card.externalId,
    });
    if (resolved.result) {
      return { result: resolved.result, relatedPrints: resolved.relatedPrints ?? [] };
    }
  }

  if (card.externalId && isApiSupported(card.gameSlug)) {
    return fetchCardDetail(card.externalId, card.gameSlug);
  }

  return { result: null, relatedPrints: [] };
}

export function CardInspectDialog({
  card,
  open,
  tab = "details",
  onOpenChange,
  currency,
  onUpdate,
  onDelete,
}: CardInspectDialogProps) {
  const { updateOwnedCard: defaultUpdate, deleteOwnedCards: defaultDelete } = useAppData();
  const updateOwnedCard = onUpdate ?? defaultUpdate;
  const deleteOwnedCards = onDelete ?? defaultDelete;
  const marketplaceRef = useRef<HTMLDivElement>(null);

  const { data: cardDetailData } = useQuery({
    queryKey: ["card-detail", card?.id, card?.card.name, card?.card.externalId, card?.card.gameSlug],
    queryFn: () => fetchCardDetailForOwned(card!.card),
    enabled: open && !!card && isApiSupported(card.card.gameSlug),
    staleTime: 10 * 60 * 1000,
  });

  const cardDetail = cardDetailData?.result ?? null;
  const ygoPasscode = useYugiohPasscodeForDisplay(
    card?.card ?? {
      name: "",
      gameSlug: "yugioh",
      externalId: null,
      imageUrl: null,
      setCode: null,
      collectorNumber: null,
    },
    card?.id
  );

  useYugiohCardImageRepair(
    card?.id,
    card?.card ?? { gameSlug: "yugioh", externalId: null, imageUrl: null, rarity: null },
    ygoPasscode ?? null
  );

  const { data: ownedCardQuote, isFetching: ownedQuoteFetching } = useCardTraderOwnedQuote(
    card,
    currency,
    open && !!card
  );

  const printVariants = useMemo(() => {
    if (!cardDetail || !card) return [];
    const relatedPrints = cardDetailData?.relatedPrints ?? [];
    return getSearchResultVariants(cardDetail, card.card.gameSlug, relatedPrints);
  }, [cardDetail, card, cardDetailData?.relatedPrints]);

  const variantInputs = useMemo(
    () =>
      printVariants.map((v) => {
        const blueprintFields = buildVariantPriceBlueprintFields(
          v,
          card!.card.gameSlug
        );
        return {
          key: v.key,
          setName: v.setName,
          setCode: v.setCode,
          collectorNumber: v.collectorNumber,
          rarity: v.rarity,
          variantLabel: v.variantLabel,
          tcgPlayerId: v.tcgPlayerId,
          cardTraderRarityHint: v.cardTraderRarityHint ?? v.rarity,
          imageUrl: v.imageUrl,
          ...blueprintFields,
        };
      }),
    [printVariants, card]
  );

  const { data: variantPrices, isFetching: pricesFetching } = useCardTraderVariantPrices(
    card?.card.name ?? "",
    card?.card.gameSlug ?? "yugioh",
    variantInputs,
    currency,
    open && printVariants.length > 0
  );

  const activeVariant = useMemo(() => {
    if (!card || printVariants.length === 0) return undefined;
    return findVariantForSelection(
      printVariants,
      card.card.rarity ?? "",
      card.card.setCode,
      card.card.setName,
      card.card.collectorNumber,
      card.card.gameSlug
    );
  }, [printVariants, card]);

  const activeQuote = activeVariant ? variantPrices?.get(activeVariant.key) : undefined;
  const resolvedQuote = activeQuote ?? ownedCardQuote ?? null;

  const cardTraderProductUrl = useMemo(() => {
    if (resolvedQuote?.url) return resolvedQuote.url;
    if (!card) return null;
    const variant = activeVariant;
    return resolveCardTraderProductUrl({
      name: card.card.name,
      gameSlug: card.card.gameSlug,
      externalId: variant?.externalId ?? card.card.externalId,
      cardTraderBlueprintId: card.card.cardTraderBlueprintId,
      setName: variant?.setName ?? card.card.setName,
      setCode: variant?.setCode ?? card.card.setCode,
      rarity: variant?.rarity ?? card.card.rarity,
      imageUrl: variant?.imageUrl ?? card.card.imageUrl,
    });
  }, [card, activeVariant, resolvedQuote?.url]);

  useEffect(() => {
    if (!card || !open || !resolvedQuote?.blueprintId || !activeVariant) return;
    if (!variantMatchesOwnedCard(activeVariant, card.card, card.card.gameSlug)) return;

    const updates: Partial<DemoOwnedCard["card"]> = {};
    if (resolvedQuote.blueprintId !== card.card.cardTraderBlueprintId) {
      updates.cardTraderBlueprintId = resolvedQuote.blueprintId;
    }
    if (
      resolvedQuote.imageUrl &&
      resolvedQuote.imageUrl !== card.card.imageUrl &&
      card.card.gameSlug !== "yugioh"
    ) {
      updates.imageUrl = resolvedQuote.imageUrl;
    }

    if (Object.keys(updates).length > 0) {
      updateOwnedCard(card.id, { card: updates });
    }
  }, [
    card,
    open,
    activeVariant,
    resolvedQuote?.blueprintId,
    resolvedQuote?.imageUrl,
    updateOwnedCard,
  ]);

  useEffect(() => {
    if (open && tab === "marketplace") {
      marketplaceRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [open, tab]);

  if (!card) return null;

  const displayPrice =
    resolvedQuote?.price ??
    normalizeCatalogPrice(card.card.marketPrice, currency);
  const ygoSecondaryPrice = activeVariant?.price ?? null;

  let displayImage: string | null = null;
  if (card.card.gameSlug === "yugioh") {
    if (ygoPasscode === undefined) {
      displayImage = null;
    } else if (ygoPasscode) {
      displayImage =
        buildYgoImageUrl(ygoPasscode, "full") ??
        resolveCardDisplayImage(card.card, {
          detailImage: cardDetail?.imageUrl,
          detailPasscode: ygoPasscode,
        });
    } else {
      displayImage = resolveCardDisplayImage(card.card, {
        detailImage: cardDetail?.imageUrl,
        detailPasscode: null,
      });
    }
  } else {
    displayImage = resolveCardDisplayImage(card.card, {
      quoteImage: resolvedQuote?.imageUrl,
      variantImage: activeVariant?.imageUrl,
      detailImage: cardDetail?.imageUrl,
      detailPasscode: ygoPasscode ?? null,
    });
  }

  const listings = buildMarketplaceListings(card.card, {
    cardTraderPrice: displayPrice,
    cardTraderCurrency: currency,
    cardTraderUrl: cardTraderProductUrl,
    ygoProDeckPrice: ygoSecondaryPrice,
    ygoProDeckUrl: activeVariant?.ygoProDeckUrl,
  });

  const handleVariantSelect = (variant: CardPrintVariant) => {
    const quote = variantPrices?.get(variant.key);
    const passcode = ygoPasscode ?? null;
    const keepBlueprintId = isCardTraderBlueprintExternalId(
      variant.externalId ?? card.card.externalId,
      variant.imageUrl ?? card.card.imageUrl,
      card.card.cardTraderBlueprintId
    );
    const imageUrl =
      (quote?.imageUrl && isCardTraderHostedImage(quote.imageUrl)
        ? quote.imageUrl
        : null) ??
      (variant.imageUrl && isCardTraderHostedImage(variant.imageUrl)
        ? variant.imageUrl
        : null) ??
      resolveCardDisplayImage(card.card, {
        quoteImage: quote?.imageUrl,
        variantImage: variant.imageUrl,
        detailPasscode: passcode,
      }) ??
      (passcode
        ? buildYgoImageUrl(passcode, pickYgoImageSizeForRarity(variant.rarity))
        : null) ??
      variant.imageUrl ??
      card.card.imageUrl;

    const blueprintFromVariant = resolveStoredBlueprintId(
      variant.externalId,
      variant.imageUrl,
      card.card.cardTraderBlueprintId,
      card.card.gameSlug
    );

    updateOwnedCard(card.id, {
      card: {
        rarity: variant.rarity,
        setName: variant.setName,
        setCode: variant.setCode,
        collectorNumber: variant.setCode ?? card.card.collectorNumber,
        externalId: keepBlueprintId
          ? (variant.externalId ?? card.card.externalId)
          : (passcode ?? variant.externalId ?? card.card.externalId),
        cardTraderBlueprintId: quote?.blueprintId
          ? String(quote.blueprintId)
          : blueprintFromVariant
            ? String(blueprintFromVariant)
            : card.card.cardTraderBlueprintId,
        imageUrl,
        marketPrice: quote?.price ?? variant.price ?? card.card.marketPrice,
      },
    });
  };

  const renderVariantPrice = (variantKey: string) => {
    const quote = variantPrices?.get(variantKey);
    if (quote?.price != null) {
      return (
        <span className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
          {formatCurrency(quote.price, currency)}
        </span>
      );
    }
    if (pricesFetching) {
      return <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />;
    }
    return <span className="text-xs text-muted-foreground">—</span>;
  };

  const ygoImageLoading = card.card.gameSlug === "yugioh" && ygoPasscode === undefined;
  const ygoImageFallback =
    ygoPasscode != null ? buildYgoImageUrl(ygoPasscode, "full") : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        lang="pt-BR"
        className={cn(
          "gap-0 overflow-x-hidden p-0",
          MOBILE_DIALOG_SHEET,
          "max-sm:pt-12",
          "sm:fixed sm:inset-auto sm:left-[50%] sm:top-[50%] sm:block sm:max-h-[min(90dvh,100%)] sm:w-[calc(100%-2rem)] sm:max-w-3xl sm:translate-x-[-50%] sm:translate-y-[-50%] sm:overflow-y-auto sm:rounded-xl md:max-w-4xl"
        )}
      >
        <DialogTitle className="sr-only">{card.card.name}</DialogTitle>

        <div className="flex min-w-0 flex-col md:max-h-[85dvh] md:flex-row md:overflow-hidden">
          <section className="shrink-0 border-b border-border/60 bg-muted/20 md:w-[220px] md:border-b-0 md:border-r">
            <div className="flex flex-col items-center gap-3 p-4 md:items-stretch md:p-6">
              <div className="relative h-[168px] w-[120px] shrink-0 overflow-hidden rounded-lg bg-muted/40 shadow-lg ring-1 ring-border/40 md:h-[224px] md:w-[160px]">
                {ygoImageLoading ? (
                  <div className="flex h-full w-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <CardImage
                    src={displayImage}
                    alt={card.card.name}
                    fill
                    sizes="(max-width: 768px) 120px, 160px"
                    fallbackSrc={ygoImageFallback}
                    className="object-contain p-0.5"
                  />
                )}
              </div>
              <div className="w-full min-w-0 text-center md:text-left">
                <h2 className="text-base font-semibold leading-snug break-words md:text-lg">
                  {card.card.name}
                </h2>
                {card.card.rarity && (
                  <div className="mt-2 flex justify-center md:justify-start">
                    <RarityBadge
                      rarity={activeVariant?.rarity ?? card.card.rarity}
                      gameSlug={card.card.gameSlug}
                      size="sm"
                    />
                  </div>
                )}
                <dl className="mt-3 grid w-full grid-cols-1 gap-2 text-sm">
                  <div className="rounded-md bg-background/70 px-3 py-2 text-left">
                    <dt className="text-xs text-muted-foreground">Conjunto</dt>
                    <dd className="mt-0.5 font-medium leading-snug break-words">
                      {activeVariant?.setName ?? card.card.setName ?? "—"}
                    </dd>
                  </div>
                  <div className="rounded-md bg-background/70 px-3 py-2 text-left">
                    <dt className="text-xs text-muted-foreground">Número</dt>
                    <dd className="mt-0.5 font-medium leading-snug break-all">
                      {activeVariant?.setCode ?? card.card.collectorNumber ?? "—"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-md bg-background/70 px-3 py-2">
                    <dt className="text-xs text-muted-foreground">CardTrader</dt>
                    <dd>
                      {(pricesFetching || ownedQuoteFetching) && resolvedQuote?.price == null ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <PriceBadge price={displayPrice} currency={currency} />
                      )}
                    </dd>
                  </div>
                  {ygoSecondaryPrice != null &&
                    ygoSecondaryPrice > 0 &&
                    (resolvedQuote?.price == null || displayPrice == null) && (
                      <div className="flex items-center justify-between gap-3 rounded-md bg-background/70 px-3 py-2">
                        <dt className="text-xs text-muted-foreground">YGOPRODeck</dt>
                        <dd>
                          <PriceBadge price={ygoSecondaryPrice} currency="USD" />
                        </dd>
                      </div>
                    )}
                </dl>
              </div>
            </div>
          </section>

          <section className="flex min-w-0 flex-1 flex-col gap-4 p-4 md:gap-6 md:overflow-y-auto md:p-6">
            <div ref={marketplaceRef} className="min-w-0 space-y-3">
              <h3 className="text-sm font-semibold">Mercado</h3>
              <div className="space-y-2">
                {listings.map((listing) => (
                  <a
                    key={listing.source}
                    href={listing.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/20 p-3 transition-colors hover:border-primary/40 hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4 sm:py-3"
                  >
                    <span className="text-sm font-medium leading-snug">
                      {listing.name}
                      {listing.primary && (
                        <span className="ml-2 text-[10px] uppercase tracking-wide text-primary">
                          Principal
                        </span>
                      )}
                    </span>
                    <div className="flex items-center justify-between gap-2 sm:shrink-0 sm:justify-end">
                      {listing.price !== null ? (
                        <span className="text-sm tabular-nums text-muted-foreground">
                          {formatCurrency(listing.price, listing.currency as Currency)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Abrir</span>
                      )}
                      <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </div>
                  </a>
                ))}
              </div>
            </div>

            <div className="min-w-0 space-y-4 border-t border-border/60 pt-4">
              {printVariants.length > 1 && (
                <div className="space-y-2">
                  <Label>Edição</Label>
                  <div className="max-h-[min(40dvh,240px)] space-y-1 overflow-y-auto overscroll-contain rounded-lg border border-border/60 p-1">
                    {printVariants.map((variant) => {
                      const isActive =
                        activeVariant?.key === variant.key ||
                        (!activeVariant &&
                          variantMatchesOwnedCard(variant, card.card, card.card.gameSlug));
                      return (
                        <button
                          key={variant.key}
                          type="button"
                          onClick={() => handleVariantSelect(variant)}
                          className={cn(
                            "flex w-full flex-col gap-2 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between",
                            isActive && "bg-primary/10 ring-1 ring-primary/30"
                          )}
                        >
                          <div className="flex min-w-0 items-start gap-2">
                            <RarityBadge
                              rarity={variant.rarity}
                              gameSlug={card.card.gameSlug}
                              size="md"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium leading-snug">
                                {variant.setName ?? "Edição desconhecida"}
                              </p>
                              {variant.setCode && (
                                <p className="text-xs text-muted-foreground">{variant.setCode}</p>
                              )}
                            </div>
                          </div>
                          <div className="pl-8 sm:shrink-0 sm:pl-0">
                            {renderVariantPrice(variant.key)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Quantidade</Label>
                <QuantityStepper
                  value={card.quantity}
                  onChange={(quantity) => {
                    if (quantity < 1) {
                      void deleteOwnedCards([card.id]);
                      onOpenChange(false);
                      return;
                    }
                    updateOwnedCard(card.id, { quantity });
                  }}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">Condição</Label>
                  <ResponsiveSelect
                    preferNative
                    value={card.condition}
                    onValueChange={(v) =>
                      updateOwnedCard(card.id, { condition: v as typeof card.condition })
                    }
                    options={CARD_CONDITIONS.map((c) => ({
                      value: c,
                      label: CONDITION_LABELS[c],
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">Idioma</Label>
                  <ResponsiveSelect
                    preferNative
                    value={card.language}
                    onValueChange={(v) =>
                      updateOwnedCard(card.id, { language: v as typeof card.language })
                    }
                    options={CARD_LANGUAGES.map((l) => ({ value: l, label: l }))}
                  />
                </div>
              </div>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
