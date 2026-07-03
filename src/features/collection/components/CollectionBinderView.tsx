"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardImage } from "@/components/shared/CardImage";
import { RarityBadge } from "@/components/shared/RarityBadge";
import { getCardPreviewImageUrl } from "@/lib/cards/preview-image";
import { cn, formatCurrency } from "@/lib/utils";
import { useCollectionUIStore } from "@/features/collection/stores/collection-ui.store";
import type { CollectionViewData } from "@/features/collection/hooks/useCollectionViewData";
import type { DemoOwnedCard } from "@/lib/demo/types";
import type { Currency } from "@/types/tcg";

const GRID_SIZE = 4;
const PAGE_SIZE = GRID_SIZE * GRID_SIZE;
const SPREAD_SIZE = PAGE_SIZE * 2;

interface CollectionBinderViewProps {
  data: CollectionViewData;
}

function buildSpreads(cards: DemoOwnedCard[]): DemoOwnedCard[][] {
  if (cards.length === 0) return [[]];
  const spreads: DemoOwnedCard[][] = [];
  for (let i = 0; i < cards.length; i += SPREAD_SIZE) {
    spreads.push(cards.slice(i, i + SPREAD_SIZE));
  }
  return spreads;
}

function pageSlots(cards: DemoOwnedCard[], offset: number): (DemoOwnedCard | null)[] {
  const slice = cards.slice(offset, offset + PAGE_SIZE);
  return Array.from({ length: PAGE_SIZE }, (_, i) => slice[i] ?? null);
}

interface BinderSlotProps {
  card: DemoOwnedCard | null;
  selected: boolean;
  marketPrice: number | null;
  currency: Currency;
  onOpen: () => void;
}

function BinderSlot({ card, selected, marketPrice, currency, onOpen }: BinderSlotProps) {
  if (!card) {
    return (
      <div className="flex flex-col gap-1" aria-hidden>
        <div className="aspect-[59/86] rounded-md border border-dashed border-stone-400/25 bg-stone-500/5 dark:border-stone-600/30 dark:bg-stone-950/20" />
        <div className="h-9 rounded-md border border-dashed border-stone-400/20 bg-stone-500/5 dark:border-stone-600/25 dark:bg-stone-950/15" />
      </div>
    );
  }

  const thumbSrc = getCardPreviewImageUrl(card.card) ?? card.card.imageUrl;

  return (
    <div
      className={cn(
        "group flex flex-col gap-1 rounded-lg transition-all duration-150",
        selected && "ring-2 ring-primary ring-offset-1 ring-offset-stone-200 dark:ring-offset-stone-900"
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "relative aspect-[59/86] w-full overflow-hidden rounded-md bg-stone-900/10 shadow-sm ring-1 ring-stone-900/10",
          "transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-primary/40",
          "dark:bg-stone-950/40 dark:ring-stone-100/10"
        )}
      >
        <CardImage
          src={thumbSrc}
          alt={card.card.name}
          fill
          sizes="(max-width: 768px) 20vw, 100px"
          className="object-contain p-0.5 transition-transform duration-150 group-hover:scale-[1.02]"
        />
      </button>

      <button
        type="button"
        onClick={onOpen}
        className="flex w-full flex-col gap-0.5 rounded-md bg-zinc-900/90 px-1.5 py-1 text-left ring-1 ring-white/5 transition-colors hover:bg-zinc-800/95 dark:bg-zinc-950/90"
      >
        <div className="flex items-center justify-between gap-1">
          <RarityBadge rarity={card.card.rarity} gameSlug={card.card.gameSlug} size="sm" />
          <span className="min-w-0 truncate text-[10px] font-semibold tabular-nums text-white">
            {marketPrice != null ? formatCurrency(marketPrice, currency) : "—"}
          </span>
          <span className="shrink-0 text-[10px] font-bold tabular-nums text-white/90">
            ×{card.quantity}
          </span>
        </div>
        <p className="truncate text-[9px] font-medium leading-tight text-white/75">
          {card.card.name}
        </p>
        <p className="truncate text-[8px] text-white/50">
          {[card.card.setName, card.card.collectorNumber].filter(Boolean).join(" · ") || "—"}
        </p>
      </button>
    </div>
  );
}

interface BinderPageProps {
  cards: (DemoOwnedCard | null)[];
  side: "left" | "right";
  selectedIds: Set<string>;
  currency: Currency;
  resolvePrice: (item: DemoOwnedCard) => number | null;
  onOpen: (id: string) => void;
}

function BinderPage({ cards, side, selectedIds, currency, resolvePrice, onOpen }: BinderPageProps) {
  return (
    <div
      className={cn(
        "relative flex min-w-0 flex-1 flex-col p-2 sm:p-4",
        "bg-gradient-to-br from-stone-100 via-stone-50 to-stone-200/90",
        "dark:from-stone-800 dark:via-stone-900 dark:to-stone-950",
        side === "left"
          ? "rounded-t-xl md:rounded-l-2xl md:rounded-tr-none"
          : "rounded-b-xl md:rounded-r-2xl md:rounded-bl-none"
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-y-2 w-6 opacity-30 sm:inset-y-4",
          side === "left"
            ? "right-0 bg-gradient-to-l from-stone-900/15 to-transparent"
            : "left-0 bg-gradient-to-r from-stone-900/15 to-transparent"
        )}
      />
      <div className="grid flex-1 grid-cols-4 grid-rows-4 gap-1.5 sm:gap-2">
        {cards.map((card, index) => (
          <BinderSlot
            key={card?.id ?? `${side}-empty-${index}`}
            card={card}
            selected={card ? selectedIds.has(card.id) : false}
            marketPrice={card ? resolvePrice(card) : null}
            currency={currency}
            onOpen={() => card && onOpen(card.id)}
          />
        ))}
      </div>
    </div>
  );
}

export function CollectionBinderView({ data }: CollectionBinderViewProps) {
  const selectedIds = useCollectionUIStore((s) => s.selectedIds);
  const openCardInspect = useCollectionUIStore((s) => s.openCardInspect);
  const [spreadIndex, setSpreadIndex] = useState(0);

  const spreads = useMemo(() => buildSpreads(data.filtered), [data.filtered]);
  const totalSpreads = spreads.length;

  const filterKey = useMemo(
    () => data.filtered.map((c) => c.id).join(","),
    [data.filtered]
  );

  useEffect(() => {
    setSpreadIndex(0);
  }, [filterKey]);

  useEffect(() => {
    if (spreadIndex >= totalSpreads) {
      setSpreadIndex(Math.max(0, totalSpreads - 1));
    }
  }, [spreadIndex, totalSpreads]);

  const currentSpread = spreads[spreadIndex] ?? [];
  const leftPage = pageSlots(currentSpread, 0);
  const rightPage = pageSlots(currentSpread, PAGE_SIZE);

  const spreadStart = spreadIndex * SPREAD_SIZE + 1;
  const spreadEnd = Math.min((spreadIndex + 1) * SPREAD_SIZE, data.filtered.length);

  return (
    <div className="flex h-full min-h-0 flex-col bg-gradient-to-b from-zinc-950 via-zinc-900/95 to-background">
      <div className="flex flex-1 flex-col items-center overflow-auto px-2 py-3 sm:px-4 sm:py-5">
        <div className="w-full max-w-6xl">
          <div className="mb-2 flex items-center justify-between px-1 text-xs text-muted-foreground sm:mb-3 sm:text-sm">
            <span className="font-medium text-foreground/80">Binder · 4×4</span>
            <span className="tabular-nums">
              {spreadStart}–{spreadEnd} de {data.filtered.length}
            </span>
          </div>

          <div className="flex flex-col overflow-hidden rounded-xl shadow-2xl ring-1 ring-black/20 md:flex-row md:rounded-2xl">
            <BinderPage
              cards={leftPage}
              side="left"
              selectedIds={selectedIds}
              currency={data.profileCurrency}
              resolvePrice={data.resolvePrice}
              onOpen={(id) => openCardInspect(id, "details")}
            />

            <div
              className="relative h-2 w-full shrink-0 bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 md:h-auto md:w-3 md:bg-gradient-to-b lg:w-4"
              aria-hidden
            >
              <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-amber-950/80 md:inset-y-0 md:left-1/2 md:h-full md:w-px md:translate-x-[-50%] md:translate-y-0" />
            </div>

            <BinderPage
              cards={rightPage}
              side="right"
              selectedIds={selectedIds}
              currency={data.profileCurrency}
              resolvePrice={data.resolvePrice}
              onOpen={(id) => openCardInspect(id, "details")}
            />
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-center gap-4 border-t border-border/60 bg-card/40 px-4 py-3 backdrop-blur-sm">
        <Button
          variant="outline"
          size="sm"
          disabled={spreadIndex <= 0}
          onClick={() => setSpreadIndex((i) => Math.max(0, i - 1))}
          aria-label="Previous spread"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Anterior</span>
        </Button>
        <span className="min-w-[7rem] text-center text-sm tabular-nums text-muted-foreground">
          Página {spreadIndex + 1} / {totalSpreads}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={spreadIndex >= totalSpreads - 1}
          onClick={() => setSpreadIndex((i) => Math.min(totalSpreads - 1, i + 1))}
          aria-label="Next spread"
        >
          <span className="hidden sm:inline">Próxima</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
