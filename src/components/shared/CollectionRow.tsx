"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CardImage } from "@/components/shared/CardImage";
import { PriceBadge } from "@/components/shared/PriceBadge";
import { cn, formatCurrency } from "@/lib/utils";
import type { DemoOwnedCard } from "@/lib/demo/types";
import type { Currency } from "@/types/tcg";

interface CollectionRowProps {
  item: DemoOwnedCard;
  selected: boolean;
  focused: boolean;
  onClick: (item: DemoOwnedCard, shiftKey: boolean) => void;
  onDoubleClick: (item: DemoOwnedCard) => void;
  onMiddleClick: (item: DemoOwnedCard) => void;
  onCheckboxChange: (id: string, shiftKey: boolean) => void;
  currency: Currency;
  isWishlisted: boolean;
  peerPresence?: { color: string; name: string };
  className?: string;
  style?: React.CSSProperties;
}

export function CollectionRow({
  item,
  selected,
  focused,
  onClick,
  onDoubleClick,
  onMiddleClick,
  onCheckboxChange,
  currency,
  isWishlisted,
  peerPresence,
  className,
  style,
}: CollectionRowProps) {
  const marketPrice = item.card.marketPrice;
  const profit =
    marketPrice && item.purchasePrice
      ? (marketPrice - item.purchasePrice) * item.quantity
      : null;

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
        "group flex cursor-pointer items-center gap-3 border-b border-border/50 px-4 py-2 transition-all duration-150 hover:bg-muted/50",
        selected && "bg-primary/5",
        focused && "ring-1 ring-inset ring-primary/30",
        className
      )}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('[role="checkbox"]')) return;
        onClick(item, e.shiftKey);
      }}
      onDoubleClick={(e) => {
        e.preventDefault();
        onDoubleClick(item);
      }}
      onMouseDown={(e) => {
        if (e.button === 1) {
          e.preventDefault();
          onMiddleClick(item);
        }
      }}
    >
      <div onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={selected}
          onCheckedChange={() => onCheckboxChange(item.id, false)}
          onClick={(e) => {
            e.stopPropagation();
            onCheckboxChange(item.id, e.shiftKey);
          }}
          aria-label={`Select ${item.card.name}`}
        />
      </div>

      <div className="relative h-10 w-7 shrink-0 overflow-hidden rounded">
        <CardImage
          src={item.card.imageUrl}
          alt={item.card.name}
          fill
          sizes="28px"
          className="rounded"
        />
      </div>

      <div className="min-w-0 flex-[2]">
        <p className="truncate text-sm font-medium">{item.card.name}</p>
        <p className="truncate text-xs text-muted-foreground">{item.card.gameName}</p>
      </div>

      <div className="hidden min-w-0 flex-1 truncate text-sm text-muted-foreground md:block">
        {item.card.setName ?? "—"}
      </div>

      <div className="hidden w-12 text-sm text-muted-foreground lg:block">
        {item.card.collectorNumber ?? "—"}
      </div>

      <div className="w-10 text-center text-sm font-medium tabular-nums">{item.quantity}</div>

      <div className="hidden w-12 text-center text-xs md:block">
        <Badge variant="outline" className="font-normal">
          {item.condition}
        </Badge>
      </div>

      <div className="hidden w-10 text-center text-xs text-muted-foreground sm:block">
        {item.language}
      </div>

      <div className="hidden w-20 lg:block">
        <PriceBadge price={marketPrice} currency={currency} />
      </div>

      <div className="hidden w-12 text-center text-sm text-muted-foreground xl:block">—</div>

      <div className="hidden w-20 text-right text-sm xl:block">
        {profit !== null ? (
          <span className={cn("tabular-nums", profit >= 0 ? "text-emerald-400" : "text-red-400")}>
            {formatCurrency(profit, currency)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </div>

      <div className="hidden w-16 gap-1 xl:flex">
        {item.isFoil && (
          <Badge className="border-0 bg-amber-500/15 text-[10px] text-amber-400">Foil</Badge>
        )}
        {isWishlisted && (
          <Badge className="border-0 bg-pink-500/15 text-[10px] text-pink-400">Wish</Badge>
        )}
      </div>
    </div>
  );
}
