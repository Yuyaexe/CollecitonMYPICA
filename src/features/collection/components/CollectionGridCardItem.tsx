"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { CardImage } from "@/components/shared/CardImage";
import { RarityBadge } from "@/components/shared/RarityBadge";
import { PriceBadge } from "@/components/shared/PriceBadge";
import { getCardPreviewImageUrl } from "@/lib/cards/preview-image";
import { useYugiohPasscodeForDisplay } from "@/hooks/useYugiohPasscodeForDisplay";
import { useYugiohCardImageRepair } from "@/hooks/useYugiohCardImageRepair";
import { cn } from "@/lib/utils";
import { dragHandleProps, useDragReorder } from "@/hooks/useDragReorder";
import type { DemoOwnedCard } from "@/lib/demo/types";
import type { Currency } from "@/types/tcg";

interface CollectionGridCardItemProps {
  item: DemoOwnedCard;
  selected: boolean;
  marketPrice: number | null;
  cardTraderImage?: string | null;
  currency: Currency;
  dragHandlers: ReturnType<typeof useDragReorder>;
  onSelect: () => void;
  onOpen: () => void;
}

export function CollectionGridCardItem({
  item,
  selected,
  marketPrice,
  cardTraderImage,
  currency,
  dragHandlers,
  onSelect,
  onOpen,
}: CollectionGridCardItemProps) {
  const ygoPasscode = useYugiohPasscodeForDisplay(item.card);
  useYugiohCardImageRepair(item.id, item.card, ygoPasscode);
  const thumbSrc =
    getCardPreviewImageUrl(item.card, ygoPasscode, cardTraderImage) ?? item.card.imageUrl;
  const dragOver = dragHandlers.isDragOver(item.id);

  return (
    <div
      {...dragHandleProps(dragHandlers, item.id)}
      className={cn(
        "group relative flex flex-col rounded-xl border border-border/60 bg-card/40 p-2 transition-all hover:border-primary/40 hover:shadow-md cursor-grab active:cursor-grabbing",
        selected && "border-primary/50 ring-1 ring-primary/30",
        dragOver && "border-primary ring-2 ring-primary/30"
      )}
    >
      <div className="absolute left-2 top-2 z-10">
        <Checkbox
          checked={selected}
          onCheckedChange={onSelect}
          className="bg-background/80 backdrop-blur-sm"
          aria-label={`Select ${item.card.name}`}
        />
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="relative mx-auto aspect-[59/86] w-full max-w-[140px] overflow-hidden rounded-lg bg-muted/30 ring-1 ring-border/30 transition-transform group-hover:scale-[1.02]"
      >
        <CardImage
          src={thumbSrc}
          alt={item.card.name}
          fill
          sizes="140px"
          className="object-contain p-1"
        />
      </button>

      <div className="mt-2 space-y-1.5 px-1">
        <div className="flex items-center justify-center gap-1.5">
          <RarityBadge rarity={item.card.rarity} gameSlug={item.card.gameSlug} />
          {item.quantity > 1 && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
              ×{item.quantity}
            </span>
          )}
        </div>
        <button type="button" onClick={onOpen} className="w-full text-center">
          <p className="line-clamp-2 text-xs font-semibold leading-tight">{item.card.name}</p>
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{item.card.setName ?? "—"}</p>
        </button>
        <div className="flex justify-center pt-0.5">
          <PriceBadge price={marketPrice} currency={currency} />
        </div>
      </div>
    </div>
  );
}
