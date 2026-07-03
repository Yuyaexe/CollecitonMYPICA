"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardImage } from "@/components/shared/CardImage";
import { getCardPreviewImageUrl } from "@/lib/cards/preview-image";
import { cn } from "@/lib/utils";
import { useCollectionUIStore } from "@/features/collection/stores/collection-ui.store";
import type { CollectionViewData } from "@/features/collection/hooks/useCollectionViewData";
import type { DemoOwnedCard } from "@/lib/demo/types";

const PAGE_SIZE = 9;
const SPREAD_SIZE = 18;

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
  onOpen: () => void;
}

function BinderSlot({ card, selected, onOpen }: BinderSlotProps) {
  if (!card) {
    return (
      <div
        className="aspect-[59/86] rounded-md border border-dashed border-stone-400/25 bg-stone-500/5 dark:border-stone-600/30 dark:bg-stone-950/20"
        aria-hidden
      />
    );
  }

  const thumbSrc = getCardPreviewImageUrl(card.card) ?? card.card.imageUrl;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group relative aspect-[59/86] overflow-hidden rounded-md bg-stone-900/10 shadow-sm ring-1 ring-stone-900/10 transition-all duration-150",
        "hover:-translate-y-0.5 hover:shadow-md hover:ring-primary/40",
        "dark:bg-stone-950/40 dark:ring-stone-100/10",
        selected && "ring-2 ring-primary shadow-md shadow-primary/20"
      )}
    >
      <CardImage
        src={thumbSrc}
        alt={card.card.name}
        fill
        sizes="(max-width: 768px) 28vw, 120px"
        className="object-contain p-0.5 transition-transform duration-150 group-hover:scale-[1.03]"
      />
      {card.quantity > 1 && (
        <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white backdrop-blur-sm">
          ×{card.quantity}
        </span>
      )}
    </button>
  );
}

interface BinderPageProps {
  cards: (DemoOwnedCard | null)[];
  side: "left" | "right";
  selectedIds: Set<string>;
  onOpen: (id: string) => void;
}

function BinderPage({ cards, side, selectedIds, onOpen }: BinderPageProps) {
  return (
    <div
      className={cn(
        "relative flex min-w-0 flex-1 flex-col p-3 sm:p-5",
        "bg-gradient-to-br from-stone-100 via-stone-50 to-stone-200/90",
        "dark:from-stone-800 dark:via-stone-900 dark:to-stone-950",
        side === "left" ? "rounded-t-xl md:rounded-l-2xl md:rounded-tr-none" : "rounded-b-xl md:rounded-r-2xl md:rounded-bl-none"
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-y-3 w-8 opacity-30 sm:inset-y-5",
          side === "left"
            ? "right-0 bg-gradient-to-l from-stone-900/15 to-transparent"
            : "left-0 bg-gradient-to-r from-stone-900/15 to-transparent"
        )}
      />
      <div className="grid flex-1 grid-cols-3 grid-rows-3 gap-2 sm:gap-3">
        {cards.map((card, index) => (
          <BinderSlot
            key={card?.id ?? `${side}-empty-${index}`}
            card={card}
            selected={card ? selectedIds.has(card.id) : false}
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
      <div className="flex flex-1 flex-col items-center justify-center overflow-auto px-3 py-4 sm:px-6 sm:py-6">
        <div className="w-full max-w-4xl">
          <div className="mb-3 flex items-center justify-between px-1 text-xs text-muted-foreground sm:text-sm">
            <span className="font-medium text-foreground/80">Binder view</span>
            <span className="tabular-nums">
              Cards {spreadStart}–{spreadEnd} of {data.filtered.length}
            </span>
          </div>

          <div className="flex flex-col overflow-hidden rounded-xl shadow-2xl ring-1 ring-black/20 md:flex-row md:rounded-2xl">
            <BinderPage
              cards={leftPage}
              side="left"
              selectedIds={selectedIds}
              onOpen={(id) => openCardInspect(id, "details")}
            />

            <div
              className="relative h-2 w-full shrink-0 bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 md:h-auto md:w-4 md:bg-gradient-to-b"
              aria-hidden
            >
              <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-amber-950/80 md:inset-y-0 md:left-1/2 md:h-full md:w-px md:translate-x-[-50%] md:translate-y-0" />
              {[0.2, 0.4, 0.6, 0.8].map((pos) => (
                <div
                  key={pos}
                  className="absolute h-2 w-2 rounded-full bg-amber-950/60 ring-1 ring-amber-800/40 md:h-2.5 md:w-2.5"
                  style={{
                    left: `${pos * 100}%`,
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                  }}
                />
              ))}
            </div>

            <BinderPage
              cards={rightPage}
              side="right"
              selectedIds={selectedIds}
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
          <span className="hidden sm:inline">Previous</span>
        </Button>
        <span className="min-w-[7rem] text-center text-sm tabular-nums text-muted-foreground">
          Spread {spreadIndex + 1} / {totalSpreads}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={spreadIndex >= totalSpreads - 1}
          onClick={() => setSpreadIndex((i) => Math.min(totalSpreads - 1, i + 1))}
          aria-label="Next spread"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
