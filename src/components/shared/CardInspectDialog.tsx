"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Store } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CardImage } from "@/components/shared/CardImage";
import { PriceBadge } from "@/components/shared/PriceBadge";
import { RarityBadge } from "@/components/shared/RarityBadge";
import { buildMarketplaceListings } from "@/features/market/services/marketplace";
import { CARD_CONDITIONS, CARD_LANGUAGES, CONDITION_LABELS } from "@/types/tcg";
import type { Currency } from "@/types/tcg";
import type { DemoOwnedCard } from "@/lib/demo/types";
import { useAppData } from "@/hooks/useAppData";
import { formatCurrency, cn } from "@/lib/utils";

export type CardInspectTab = "details" | "marketplace";

interface CardInspectDialogProps {
  card: DemoOwnedCard | null;
  open: boolean;
  tab: CardInspectTab;
  onTabChange: (tab: CardInspectTab) => void;
  onOpenChange: (open: boolean) => void;
  currency: Currency;
}

export function CardInspectDialog({
  card,
  open,
  tab,
  onTabChange,
  onOpenChange,
  currency,
}: CardInspectDialogProps) {
  const { ownedCards, activeCollectionId, updateOwnedCard } = useAppData();

  const collectionRarities = useMemo(() => {
    if (!activeCollectionId) return [];
    return [
      ...new Set(
        ownedCards
          .filter((oc) => oc.collectionId === activeCollectionId && oc.card.rarity)
          .map((oc) => oc.card.rarity!)
      ),
    ].sort();
  }, [ownedCards, activeCollectionId]);

  if (!card) return null;

  const rarityOptions = [
    ...new Set([...collectionRarities, card.card.rarity].filter(Boolean)),
  ] as string[];

  const listings = buildMarketplaceListings(card.card);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto sm:max-w-lg">
        <DialogHeader className="text-center">
          <DialogTitle className="mx-auto max-w-[320px]">{card.card.name}</DialogTitle>
        </DialogHeader>

        <div className="mx-auto flex max-w-sm flex-col items-center gap-5">
          <div className="relative">
            <CardImage
              src={card.card.imageUrl}
              alt={card.card.name}
              width={160}
              height={224}
              className="rounded-xl shadow-lg ring-1 ring-border/40"
            />
            <div className="absolute -right-1 top-2">
              <RarityBadge rarity={card.card.rarity} gameSlug={card.card.gameSlug} size="md" />
            </div>
          </div>

          <div
            className="flex w-full max-w-xs rounded-lg bg-muted/50 p-1"
            role="tablist"
            aria-label="Card views"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === "details"}
              onClick={() => onTabChange("details")}
              className={cn(
                "flex flex-1 items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                tab === "details"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Details
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "marketplace"}
              onClick={() => onTabChange("marketplace")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                tab === "marketplace"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Store className="h-3.5 w-3.5" />
              Marketplace
            </button>
          </div>

          {tab === "details" ? (
            <div className="w-full space-y-4">
              <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Set</span>
                  <span className="text-right font-medium">{card.card.setName ?? "—"}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Number</span>
                  <span className="font-medium">{card.card.collectorNumber ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Market</span>
                  <PriceBadge price={card.card.marketPrice} currency={currency} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Rarity</Label>
                {rarityOptions.length > 0 ? (
                  <Select
                    value={card.card.rarity ?? ""}
                    onValueChange={(v) =>
                      updateOwnedCard(card.id, { card: { rarity: v || null } })
                    }
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
                    onChange={(e) =>
                      updateOwnedCard(card.id, { card: { rarity: e.target.value || null } })
                    }
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

              <div className="flex items-center justify-center gap-2">
                <Checkbox
                  id="inspect-foil"
                  checked={card.isFoil}
                  onCheckedChange={(c) => updateOwnedCard(card.id, { isFoil: !!c })}
                />
                <Label htmlFor="inspect-foil">Foil</Label>
              </div>

              <div className="space-y-2">
                <Label>Purchase Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={card.purchasePrice ?? ""}
                  onChange={(e) =>
                    updateOwnedCard(card.id, {
                      purchasePrice: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  value={card.notes ?? ""}
                  onChange={(e) => updateOwnedCard(card.id, { notes: e.target.value || null })}
                  placeholder="Add notes..."
                />
              </div>
            </div>
          ) : (
            <div className="w-full space-y-3">
              <p className="text-center text-sm text-muted-foreground">
                Compare prices and open listings for this card
              </p>
              {listings.map((listing) => (
                <a
                  key={listing.source}
                  href={listing.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-lg border border-border p-3 transition-all duration-150 hover:border-primary/40 hover:bg-muted/50"
                >
                  <div>
                    <p className="text-sm font-medium">{listing.name}</p>
                    <p className="text-xs text-muted-foreground">{listing.source}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {listing.price !== null ? (
                      <span className="text-sm font-medium tabular-nums">
                        {formatCurrency(listing.price, listing.currency as Currency)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">View</span>
                    )}
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </div>
                </a>
              ))}
            </div>
          )}

          <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
