"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { CardImage } from "@/components/shared/CardImage";
import { RarityBadge } from "@/components/shared/RarityBadge";
import { PriceBadge } from "@/components/shared/PriceBadge";
import { Button } from "@/components/ui/button";
import { getCardPreviewImageUrl } from "@/lib/cards/preview-image";
import { useYugiohPasscodeForDisplay } from "@/hooks/useYugiohPasscodeForDisplay";
import { useYugiohCardImageRepair } from "@/hooks/useYugiohCardImageRepair";
import type { AnimeCharacterCard } from "@/lib/demo/types";
import type { Currency } from "@/types/tcg";

interface CharacterCardGridProps {
  cards: AnimeCharacterCard[];
  currency: Currency;
  onRemove: (id: string) => void;
  onQuantityChange: (id: string, quantity: number) => void;
}

function CharacterCardGridItem({
  item,
  currency,
  onRemove,
  onQuantityChange,
}: {
  item: AnimeCharacterCard;
  currency: Currency;
  onRemove: (id: string) => void;
  onQuantityChange: (id: string, quantity: number) => void;
}) {
  const ygoPasscode = useYugiohPasscodeForDisplay(item.card);
  useYugiohCardImageRepair(item.id, item.card, ygoPasscode);
  const thumbSrc = getCardPreviewImageUrl(item.card, ygoPasscode) ?? item.card.imageUrl;

  return (
    <div className="group relative flex flex-col rounded-xl border border-border/60 bg-card/40 p-2 transition-all hover:border-primary/40 hover:shadow-md">
      <button
        type="button"
        aria-label={`Remove ${item.card.name}`}
        onClick={() => onRemove(item.id)}
        className="absolute right-2 top-2 z-10 rounded-md bg-background/80 p-1 text-muted-foreground opacity-0 backdrop-blur-sm transition-opacity hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      <div className="relative mx-auto aspect-[59/86] w-full max-w-[140px] overflow-hidden rounded-lg bg-muted/30 ring-1 ring-border/30">
        <CardImage
          src={thumbSrc}
          alt={item.card.name}
          fill
          sizes="140px"
          className="object-contain p-1"
        />
      </div>

      <div className="mt-2 space-y-1.5 px-1">
        <div className="flex items-center justify-center gap-1.5">
          <RarityBadge rarity={item.card.rarity} gameSlug={item.card.gameSlug} />
        </div>
        <p className="line-clamp-2 text-center text-xs font-semibold leading-tight">
          {item.card.name}
        </p>
        <p className="truncate text-center text-[10px] text-muted-foreground">
          {item.card.setName ?? "—"}
        </p>
        <div className="flex justify-center pt-0.5">
          <PriceBadge price={item.card.marketPrice} currency={currency} />
        </div>
        <div className="flex items-center justify-center gap-1 pt-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7"
            aria-label="Decrease quantity"
            onClick={() => onQuantityChange(item.id, item.quantity - 1)}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="min-w-[2ch] text-center text-sm font-medium tabular-nums">
            {item.quantity}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7"
            aria-label="Increase quantity"
            onClick={() => onQuantityChange(item.id, item.quantity + 1)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function CharacterCardGrid({
  cards,
  currency,
  onRemove,
  onQuantityChange,
}: CharacterCardGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {cards.map((item) => (
        <CharacterCardGridItem
          key={item.id}
          item={item}
          currency={currency}
          onRemove={onRemove}
          onQuantityChange={onQuantityChange}
        />
      ))}
    </div>
  );
}
