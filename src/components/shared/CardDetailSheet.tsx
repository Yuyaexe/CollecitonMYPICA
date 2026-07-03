"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
import { CARD_CONDITIONS, CARD_LANGUAGES, CONDITION_LABELS } from "@/types/tcg";
import type { Currency } from "@/types/tcg";
import { useAppData } from "@/hooks/useAppData";
import { useMemo } from "react";

interface CardDetailSheetProps {
  ownedCardId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: Currency;
  onOpenMarketplace?: () => void;
}

export function CardDetailSheet({
  ownedCardId,
  open,
  onOpenChange,
  currency,
  onOpenMarketplace,
}: CardDetailSheetProps) {
  const { ownedCards, activeCollectionId, updateOwnedCard } = useAppData();
  const card = ownedCardId
    ? (ownedCards.find((oc) => oc.id === ownedCardId) ?? null)
    : null;

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

  const rarityOptions = useMemo(() => {
    const options = new Set(collectionRarities);
    if (card?.card.rarity) options.add(card.card.rarity);
    return [...options];
  }, [collectionRarities, card?.card.rarity]);

  if (!card) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader className="text-center">
          <SheetTitle className="mx-auto max-w-[280px]">{card.card.name}</SheetTitle>
        </SheetHeader>

        <div className="mx-auto mt-6 flex max-w-sm flex-col items-center space-y-6">
          <CardImage
            src={card.card.imageUrl}
            alt={card.card.name}
            width={176}
            height={246}
            className="rounded-xl shadow-lg ring-1 ring-border/40"
          />

          <div className="w-full space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4 text-sm">
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

          <div className="w-full space-y-4">
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
                id="foil"
                checked={card.isFoil}
                onCheckedChange={(c) => updateOwnedCard(card.id, { isFoil: !!c })}
              />
              <Label htmlFor="foil">Foil</Label>
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

          <div className="flex w-full gap-2 pb-2">
            {onOpenMarketplace && (
              <Button variant="outline" className="flex-1" onClick={onOpenMarketplace}>
                Marketplace
              </Button>
            )}
            <Button className="flex-1" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
