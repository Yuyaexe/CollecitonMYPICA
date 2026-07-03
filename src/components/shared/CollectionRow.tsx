"use client";

import { memo, useRef } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CardImage } from "@/components/shared/CardImage";
import { CardHoverPreview } from "@/components/shared/CardHoverPreview";
import { PriceBadge } from "@/components/shared/PriceBadge";
import { RarityBadge } from "@/components/shared/RarityBadge";
import { TruncatedTooltip } from "@/components/shared/TruncatedTooltip";
import { QuantityStepper } from "@/components/shared/QuantityStepper";
import { getCardPreviewImageUrl } from "@/lib/cards/preview-image";
import { cn } from "@/lib/utils";
import type { DemoOwnedCard } from "@/lib/demo/types";
import type { Currency } from "@/types/tcg";

interface CollectionRowProps {
  item: DemoOwnedCard;
  selected: boolean;
  focused: boolean;
  marketPrice?: number | null;
  onClick: (
    item: DemoOwnedCard,
    modifiers: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }
  ) => void;
  onNameClick?: (item: DemoOwnedCard) => void;
  onMiddleClick: (item: DemoOwnedCard) => void;
  onCheckboxChange: (id: string, shiftKey: boolean) => void;
  onQuantityChange: (id: string, quantity: number) => void;
  onRemove?: (id: string) => void;
  currency: Currency;
  peerPresence?: { color: string; name: string };
  className?: string;
  style?: React.CSSProperties;
}

export const CollectionRow = memo(function CollectionRow({
  item,
  selected,
  focused,
  marketPrice: marketPriceProp,
  onClick,
  onNameClick,
  onMiddleClick,
  onCheckboxChange,
  onQuantityChange,
  onRemove,
  currency,
  peerPresence,
  className,
  style,
}: CollectionRowProps) {
  const marketPrice = marketPriceProp ?? item.card.marketPrice;

  const shiftKeyRef = useRef(false);

  return (
    <div
      role="row"
      tabIndex={0}
      style={{
        ...style,
        ...(peerPresence ? { boxShadow: `inset 0 0 0 2px ${peerPresence.color}` } : {}),
      }}
      title={peerPresence ? `${peerPresence.name} is viewing this card` : undefined}
      className={cn(
        "group flex cursor-pointer items-center gap-3 border-b border-border/40 px-4 py-2 transition-colors duration-100 hover:bg-muted/40",
        selected && "border-l-2 border-l-primary bg-primary/[0.07]",
        !selected && "border-l-2 border-l-transparent",
        focused && "ring-1 ring-inset ring-primary/25",
        className
      )}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("[data-row-action]")) return;
        onClick(item, {
          shiftKey: e.shiftKey,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey,
        });
      }}
      onMouseDown={(e) => {
        if (e.button === 1) {
          e.preventDefault();
          onMiddleClick(item);
        }
      }}
    >
      <div
        data-row-action
        className="flex shrink-0 items-center justify-center rounded-md p-1 transition-colors hover:bg-muted/60"
        onPointerDown={(e) => {
          shiftKeyRef.current = e.shiftKey;
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={selected}
          onCheckedChange={() => onCheckboxChange(item.id, shiftKeyRef.current)}
          aria-label={`Select ${item.card.name}`}
        />
      </div>

      <CardHoverPreview
        className="shrink-0"
        src={getCardPreviewImageUrl(item.card) ?? item.card.imageUrl}
        previewSrc={getCardPreviewImageUrl(item.card)}
        alt={item.card.name}
      >
        <div className="relative h-11 w-[1.875rem] shrink-0 overflow-hidden rounded-md bg-muted/40 ring-1 ring-border/30 transition-shadow group-hover:ring-primary/40">
          <CardImage
            src={getCardPreviewImageUrl(item.card) ?? item.card.imageUrl}
            alt={item.card.name}
            fill
            sizes="44px"
            className="object-contain p-px"
          />
        </div>
      </CardHoverPreview>

      <RarityBadge rarity={item.card.rarity} gameSlug={item.card.gameSlug} />

      <div className="min-w-0 flex-[2]">
        <button
          type="button"
          data-row-action
          className="block w-full min-w-0 text-left transition-colors hover:text-primary"
          onClick={(e) => {
            e.stopPropagation();
            onNameClick?.(item);
          }}
        >
          <TruncatedTooltip
            text={item.card.name}
            className="text-sm font-medium underline-offset-2 hover:underline"
          />
        </button>
        <TruncatedTooltip
          text={item.card.gameName}
          className="text-xs text-muted-foreground"
        />
      </div>

      <div className="hidden min-w-[9rem] flex-[1.5] md:block">
        <TruncatedTooltip
          text={item.card.setName}
          className="text-sm text-muted-foreground"
          side="top"
        />
      </div>

      <div className="hidden w-12 text-sm text-muted-foreground xl:block">
        {item.card.collectorNumber ?? "—"}
      </div>

      <div data-row-action className="flex w-[104px] shrink-0 justify-center">
        <QuantityStepper
          value={item.quantity}
          onChange={(quantity) => {
            if (quantity !== item.quantity) {
              onQuantityChange(item.id, quantity);
            }
          }}
        />
      </div>

      <div className="hidden w-12 text-center text-xs md:block">
        <Badge variant="outline" className="font-normal">
          {item.condition}
        </Badge>
      </div>

      <div className="hidden w-10 text-center text-xs text-muted-foreground sm:block">
        {item.language}
      </div>

      <div className="hidden w-20 shrink-0 lg:flex lg:justify-end">
        <PriceBadge price={marketPrice} currency={currency} />
      </div>

      {item.isFoil && (
        <Badge className="hidden border-0 bg-amber-500/15 text-[10px] text-amber-400 md:inline-flex">
          Foil
        </Badge>
      )}
    </div>
  );
});
