"use client";

import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CardImage } from "@/components/shared/CardImage";
import { PriceBadge } from "@/components/shared/PriceBadge";
import { buildMarketplaceListings } from "@/features/market/services/marketplace";
import {
  resolveDisplayPrice,
  resolveCardTraderUrl,
  resolveCardTraderImage,
  cardPriceKey,
  useCardTraderPrices,
} from "@/features/market/hooks/useCardTraderPrices";
import { isApiSupported } from "@/features/catalog/services/card-api";
import {
  findVariantForSelection,
  getSearchResultVariants,
} from "@/features/catalog/services/card-api/variants";
import type { CardSearchResult } from "@/features/catalog/services/card-api/types";
import { CARD_CONDITIONS, CARD_LANGUAGES, CONDITION_LABELS } from "@/types/tcg";
import type { Currency } from "@/types/tcg";
import type { DemoOwnedCard } from "@/lib/demo/types";
import { useAppData } from "@/hooks/useAppData";
import { formatCurrency } from "@/lib/utils";
import { isKnownRarity } from "@/lib/rarity/resolve-rarity";
import { buildYgoImageUrl, pickYgoImageSizeForRarity } from "@/lib/yugioh/urls";

export type CardInspectTab = "details" | "marketplace";

interface CardInspectDialogProps {
  card: DemoOwnedCard | null;
  open: boolean;
  tab?: CardInspectTab;
  onOpenChange: (open: boolean) => void;
  currency: Currency;
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

export function CardInspectDialog({
  card,
  open,
  tab = "details",
  onOpenChange,
  currency,
}: CardInspectDialogProps) {
  const { updateOwnedCard } = useAppData();
  const marketplaceRef = useRef<HTMLDivElement>(null);

  const { data: cardTraderPrices } = useCardTraderPrices(
    card ? [card] : [],
    currency,
    open
  );

  const { data: cardDetailData } = useQuery({
    queryKey: ["card-detail", card?.card.externalId, card?.card.gameSlug],
    queryFn: () => fetchCardDetail(card!.card.externalId!, card!.card.gameSlug),
    enabled:
      open &&
      !!card?.card.externalId &&
      isApiSupported(card.card.gameSlug),
    staleTime: 10 * 60 * 1000,
  });

  const cardDetail = cardDetailData?.result ?? null;

  const printVariants = useMemo(() => {
    if (!cardDetail || !card) return [];
    const relatedPrints = cardDetailData?.relatedPrints ?? [];
    return getSearchResultVariants(cardDetail, card.card.gameSlug, relatedPrints);
  }, [cardDetail, card, cardDetailData?.relatedPrints]);

  const activeVariant = useMemo(() => {
    if (!card) return undefined;
    return findVariantForSelection(
      printVariants,
      card.card.rarity ?? "",
      card.card.setCode,
      card.card.setName
    );
  }, [printVariants, card]);

  const apiRarities = useMemo(() => {
    return [
      ...new Set(
        printVariants.map((v) => v.rarity).filter((r) => isKnownRarity(r, card?.card.gameSlug))
      ),
    ] as string[];
  }, [printVariants, card?.card.gameSlug]);

  useEffect(() => {
    if (open && tab === "marketplace") {
      marketplaceRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [open, tab]);

  if (!card) return null;

  const cardTraderQuote = cardTraderPrices?.get(cardPriceKey(card));
  const displayPrice = cardTraderQuote?.price ?? resolveDisplayPrice(card, cardTraderPrices);
  const ygoSecondaryPrice = activeVariant?.price ?? null;

  const displayImage =
    cardTraderQuote?.imageUrl ??
    resolveCardTraderImage(card, cardTraderPrices) ??
    activeVariant?.imageUrl ??
    buildYgoImageUrl(
      activeVariant?.externalId ?? card.card.externalId,
      pickYgoImageSizeForRarity(card.card.rarity)
    ) ??
    card.card.imageUrl;

  const listings = buildMarketplaceListings(card.card, {
    cardTraderPrice: displayPrice,
    cardTraderCurrency: currency,
    cardTraderUrl: resolveCardTraderUrl(card, cardTraderPrices),
    ygoProDeckPrice: ygoSecondaryPrice,
    ygoProDeckUrl: activeVariant?.ygoProDeckUrl,
  });

  const rarityOptions = [
    ...new Set([
      ...apiRarities,
      ...(isKnownRarity(card.card.rarity, card.card.gameSlug) ? [card.card.rarity] : []),
    ]),
  ] as string[];

  const handleRarityChange = (rarity: string) => {
    const variant = findVariantForSelection(
      printVariants,
      rarity,
      card.card.setCode,
      card.card.setName
    );

    const imageUrl =
      variant?.imageUrl ??
      buildYgoImageUrl(
        variant?.externalId ?? card.card.externalId,
        pickYgoImageSizeForRarity(rarity)
      ) ??
      card.card.imageUrl;

    updateOwnedCard(card.id, {
      card: {
        rarity: rarity || null,
        setName: variant?.setName ?? card.card.setName,
        setCode: variant?.setCode ?? card.card.setCode,
        collectorNumber: variant?.setCode ?? card.card.collectorNumber,
        externalId: variant?.externalId ?? card.card.externalId,
        imageUrl,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl gap-0 overflow-y-auto p-0 sm:max-w-4xl">
        <DialogTitle className="sr-only">{card.card.name}</DialogTitle>

        <div className="flex flex-col md:flex-row">
          <div className="flex shrink-0 flex-col items-center border-b border-border/60 bg-muted/20 p-6 md:w-[240px] md:border-b-0 md:border-r">
            <CardImage
              src={displayImage}
              alt={card.card.name}
              width={160}
              height={224}
              className="rounded-lg shadow-lg ring-1 ring-border/40"
            />
            <h2 className="mt-4 text-center text-lg font-semibold leading-tight">
              {card.card.name}
            </h2>
            <dl className="mt-4 w-full space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Set</dt>
                <dd className="text-right font-medium">{card.card.setName ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Number</dt>
                <dd className="font-medium">{card.card.collectorNumber ?? "—"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">CardTrader</dt>
                <dd>
                  <PriceBadge price={displayPrice} currency={currency} />
                </dd>
              </div>
              {ygoSecondaryPrice != null && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">YGOPRODeck</dt>
                  <dd>
                    <PriceBadge price={ygoSecondaryPrice} currency="USD" />
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-6 p-6">
            <div ref={marketplaceRef} className="space-y-3">
              <h3 className="text-sm font-semibold">Marketplace</h3>
              <div className="space-y-2">
                {listings.map((listing) => (
                  <a
                    key={listing.source}
                    href={listing.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-4 py-3 transition-colors hover:border-primary/40 hover:bg-muted/40"
                  >
                    <span className="text-sm font-medium">
                      {listing.name}
                      {listing.primary && (
                        <span className="ml-2 text-[10px] uppercase tracking-wide text-primary">
                          Principal
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      {listing.price !== null ? (
                        <span className="text-sm tabular-nums text-muted-foreground">
                          {formatCurrency(listing.price, listing.currency as Currency)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Abrir</span>
                      )}
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </a>
                ))}
              </div>
            </div>

            <div className="space-y-4 border-t border-border/60 pt-4">
              <div className="space-y-2">
                <Label>Rarity</Label>
                {rarityOptions.length > 0 ? (
                  <Select
                    value={card.card.rarity ?? ""}
                    onValueChange={handleRarityChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select rarity" />
                    </SelectTrigger>
                    <SelectContent>
                      {rarityOptions.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={card.card.rarity ?? ""}
                    placeholder="e.g. Ultra Rare"
                    onChange={(e) => handleRarityChange(e.target.value || "")}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min={1}
                  value={card.quantity}
                  onChange={(e) =>
                    updateOwnedCard(card.id, {
                      quantity: Math.max(1, parseInt(e.target.value, 10) || 1),
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Condition</Label>
                  <Select
                    value={card.condition}
                    onValueChange={(v) =>
                      updateOwnedCard(card.id, { condition: v as typeof card.condition })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CARD_CONDITIONS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {CONDITION_LABELS[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select
                    value={card.language}
                    onValueChange={(v) =>
                      updateOwnedCard(card.id, { language: v as typeof card.language })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CARD_LANGUAGES.map((l) => (
                        <SelectItem key={l} value={l}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
