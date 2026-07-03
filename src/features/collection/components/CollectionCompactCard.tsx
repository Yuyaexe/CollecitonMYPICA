"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { CardImage } from "@/components/shared/CardImage";
import { RarityBadge } from "@/components/shared/RarityBadge";
import { PriceBadge } from "@/components/shared/PriceBadge";
import { QuantityStepper } from "@/components/shared/QuantityStepper";
import { getCardPreviewImageUrl } from "@/lib/cards/preview-image";
import { useYugiohPasscodeForDisplay } from "@/hooks/useYugiohPasscodeForDisplay";
import { useYugiohCardImageRepair } from "@/hooks/useYugiohCardImageRepair";
import { cn } from "@/lib/utils";
import type { DemoOwnedCard } from "@/lib/demo/types";
import type { Currency } from "@/types/tcg";

interface CollectionCompactCardProps {
  item: DemoOwnedCard;
  selected: boolean;
  marketPrice: number | null;
  currency: Currency;
  onSelect: () => void;
  onOpen: () => void;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
}

export function CollectionCompactCard({
  item,
  selected,
  marketPrice,
  currency,
  onSelect,
  onOpen,
  onQuantityChange,
  onRemove,
}: CollectionCompactCardProps) {
  const ygoPasscode = useYugiohPasscodeForDisplay(item.card);
  useYugiohCardImageRepair(item.id, item.card, ygoPasscode);
  const thumbSrc = getCardPreviewImageUrl(item.card, ygoPasscode) ?? item.card.imageUrl;

  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border border-border/60 bg-card/40 p-3 transition-colors",
        selected && "border-primary/50 bg-primary/[0.06]"
      )}
    >
      <div className="flex shrink-0 items-start pt-1">
        <Checkbox checked={selected} onCheckedChange={onSelect} aria-label={`Select ${item.card.name}`} />
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="relative h-[4.5rem] w-[3.2rem] shrink-0 overflow-hidden rounded-md bg-muted/40 ring-1 ring-border/30"
      >
        <CardImage src={thumbSrc} alt={item.card.name} fill sizes="52px" className="object-contain p-px" />
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <button type="button" onClick={onOpen} className="min-w-0 text-left">
          <div className="flex items-start gap-2">
            <RarityBadge rarity={item.card.rarity} gameSlug={item.card.gameSlug} size="md" />
            <div className="min-w-0">
              <p className="line-clamp-2 text-sm font-semibold leading-tight">{item.card.name}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {item.card.setName ?? "—"}
                {item.card.collectorNumber ? ` · ${item.card.collectorNumber}` : ""}
              </p>
            </div>
          </div>
        </button>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <QuantityStepper
            value={item.quantity}
            onChange={(quantity) => {
              if (quantity < 1) {
                onRemove();
                return;
              }
              onQuantityChange(quantity);
            }}
          />
          <PriceBadge price={marketPrice} currency={currency} />
        </div>
      </div>
    </div>
  );
}
