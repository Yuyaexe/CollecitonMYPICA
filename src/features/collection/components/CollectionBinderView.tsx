"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardImage } from "@/components/shared/CardImage";
import { RarityBadge } from "@/components/shared/RarityBadge";
import { resolveCollectionThumbUrl, getYugiohPasscodeFallbackUrl } from "@/lib/cards/preview-image";
import { useYugiohPasscodeFromContext } from "@/hooks/useYugiohPasscodeForDisplay";
import { cn } from "@/lib/utils";
import { useDragReorder, emptySlotDragProps, binderCardDragProps, pageNavDropProps } from "@/hooks/useDragReorder";
import {
  binderSpreadCount,
  binderSpreadSlots,
  firstAvailableSlotInSpread,
} from "@/lib/collections/binder-layout";
import {
  useCollectionUIStore,
  type BinderGridLayout,
} from "@/features/collection/stores/collection-ui.store";
import { useCollectionView } from "@/features/collection/context/collection-view-context";
import type { DemoOwnedCard } from "@/lib/demo/types";

const LAYOUT_CONFIG: Record<
  BinderGridLayout,
  { cols: number; rows: number; label: string; maxWidth: string }
> = {
  "4x3": { cols: 4, rows: 3, label: "4×3", maxWidth: "max-w-6xl" },
  "3x3": { cols: 3, rows: 3, label: "3×3", maxWidth: "max-w-4xl" },
};

function resolvePageCards(
  slotIds: (string | null)[],
  cardById: Map<string, DemoOwnedCard>
): (DemoOwnedCard | null)[] {
  return slotIds.map((id) => (id ? (cardById.get(id) ?? null) : null));
}

function BinderCardName({ name }: { name: string }) {
  return (
    <p
      className={cn(
        "truncate text-[9px] font-medium leading-tight text-white/75 transition-all duration-150",
        "group-hover:text-[11px] group-hover:font-semibold group-hover:text-white"
      )}
    >
      {name}
    </p>
  );
}

interface BinderSlotProps {
  card: DemoOwnedCard | null;
  selected: boolean;
  onOpen: () => void;
  dragHandlers: ReturnType<typeof useDragReorder>;
  slotKey: string;
  globalIndex: number;
  moveToSlot: (draggedId: string, targetIndex: number) => void;
}

function BinderSlot({
  card,
  selected,
  onOpen,
  dragHandlers,
  slotKey,
  globalIndex,
  moveToSlot,
}: BinderSlotProps) {
  const ygoPasscode = useYugiohPasscodeFromContext(card?.id);

  if (!card) {
    return (
      <div
        className={cn(
          "flex min-h-[120px] flex-col gap-1 rounded-md transition-colors",
          dragHandlers.isDragOver(slotKey) && "ring-2 ring-primary/40"
        )}
        aria-hidden
        {...emptySlotDragProps(dragHandlers, slotKey, (draggedId) =>
          moveToSlot(draggedId, globalIndex)
        )}
      >
        <div className="aspect-[59/86] rounded-md border border-dashed border-stone-400/25 bg-stone-500/5 dark:border-stone-600/30 dark:bg-stone-950/20" />
        <div className="h-9 rounded-md border border-dashed border-stone-400/20 bg-stone-500/5 dark:border-stone-600/25 dark:bg-stone-950/15" />
      </div>
    );
  }

  const thumbSrc = resolveCollectionThumbUrl(card.card, ygoPasscode);
  const imageFallback =
    card.card.gameSlug === "yugioh" ? getYugiohPasscodeFallbackUrl(card.card, ygoPasscode) : null;
  const setLine = [card.card.setName, card.card.collectorNumber].filter(Boolean).join(" · ") || "—";
  const dragOver = dragHandlers.isDragOver(card.id);

  return (
    <div
      {...binderCardDragProps(dragHandlers, card.id, globalIndex, moveToSlot)}
      className={cn(
        "group flex flex-col gap-1 rounded-lg transition-all duration-150 cursor-grab active:cursor-grabbing",
        selected && "ring-2 ring-primary ring-offset-1 ring-offset-stone-200 dark:ring-offset-stone-900",
        dragOver && "ring-2 ring-primary/40"
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
          fallbackSrc={imageFallback}
          alt={card.card.name}
          fill
          sizes="(max-width: 768px) 20vw, 100px"
          className="object-contain p-0.5 transition-transform duration-150 group-hover:scale-[1.02]"
        />
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-1.5 pb-1.5 pt-6",
            "translate-y-full opacity-0 transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100"
          )}
        >
          <p className="line-clamp-2 text-center text-[10px] font-semibold leading-tight text-white sm:text-[11px]">
            {card.card.name}
          </p>
        </div>
      </button>

      <button
        type="button"
        onClick={onOpen}
        className="flex w-full flex-col gap-0.5 rounded-md bg-zinc-900/90 px-1.5 py-1 text-left ring-1 ring-white/5 transition-colors hover:bg-zinc-800/95 group-hover:ring-primary/20 dark:bg-zinc-950/90"
      >
        <div className="flex items-center justify-between gap-1">
          <RarityBadge rarity={card.card.rarity} gameSlug={card.card.gameSlug} size="sm" />
          <span className="shrink-0 text-[10px] font-bold tabular-nums text-white/90">
            ×{card.quantity}
          </span>
        </div>
        <BinderCardName name={card.card.name} />
        <p className="truncate text-[8px] text-white/50 group-hover:text-white/70">{setLine}</p>
      </button>
    </div>
  );
}

interface BinderPageProps {
  cards: (DemoOwnedCard | null)[];
  side: "left" | "right";
  cols: number;
  rows: number;
  pageOffset: number;
  spreadIndex: number;
  spreadSize: number;
  selectedIds: Set<string>;
  onOpen: (id: string) => void;
  dragHandlers: ReturnType<typeof useDragReorder>;
  moveToSlot: (draggedId: string, targetIndex: number) => void;
}

function BinderPage({
  cards,
  side,
  cols,
  rows,
  pageOffset,
  spreadIndex,
  spreadSize,
  selectedIds,
  onOpen,
  dragHandlers,
  moveToSlot,
}: BinderPageProps) {
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
      <div
        className="grid flex-1 gap-1.5 sm:gap-2"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, auto))`,
        }}
      >
        {cards.map((card, index) => {
          const globalIndex = spreadIndex * spreadSize + pageOffset + index;
          const slotKey = card?.id ?? `${side}-slot-${globalIndex}`;
          return (
            <BinderSlot
              key={slotKey}
              card={card}
              selected={card ? selectedIds.has(card.id) : false}
              onOpen={() => card && onOpen(card.id)}
              dragHandlers={dragHandlers}
              slotKey={slotKey}
              globalIndex={globalIndex}
              moveToSlot={moveToSlot}
            />
          );
        })}
      </div>
    </div>
  );
}

function BinderLayoutToggle({
  layout,
  onChange,
}: {
  layout: BinderGridLayout;
  onChange: (layout: BinderGridLayout) => void;
}) {
  return (
    <div
      className="inline-flex items-center rounded-lg border border-border/60 bg-muted/30 p-0.5"
      role="group"
      aria-label="Binder grid layout"
    >
      {(Object.keys(LAYOUT_CONFIG) as BinderGridLayout[]).map((id) => (
        <Button
          key={id}
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 px-2.5 text-xs tabular-nums",
            layout === id && "bg-background shadow-sm"
          )}
          onClick={() => onChange(id)}
          aria-pressed={layout === id}
        >
          {LAYOUT_CONFIG[id].label}
        </Button>
      ))}
    </div>
  );
}

interface BinderSpreadNavProps {
  spreadIndex: number;
  totalSpreads: number;
  dragHandlers: ReturnType<typeof useDragReorder>;
  onPrevious: () => void;
  onNext: () => void;
  onDropToSpread: (draggedId: string, targetSpread: number) => void;
}

function BinderSpreadNav({
  spreadIndex,
  totalSpreads,
  dragHandlers,
  onPrevious,
  onNext,
  onDropToSpread,
}: BinderSpreadNavProps) {
  const dragging = dragHandlers.draggedId != null;
  const prevDropDisabled = spreadIndex <= 0;
  const canDropNext = spreadIndex < totalSpreads - 1 || dragging;
  const overPrev = dragHandlers.isDragOver("binder-nav-prev");
  const overNext = dragHandlers.isDragOver("binder-nav-next");
  const showNavHint = dragging && (overPrev || overNext);

  return (
    <div className="flex shrink-0 items-center justify-center gap-4 border-t border-border/60 bg-card/40 px-4 py-3 backdrop-blur-sm">
      <div
        className={cn(
          "rounded-lg transition-colors",
          overPrev && "bg-primary/10 ring-2 ring-primary/50"
        )}
        {...pageNavDropProps(
          dragHandlers,
          "binder-nav-prev",
          (draggedId) => onDropToSpread(draggedId, spreadIndex - 1),
          prevDropDisabled
        )}
      >
        <Button
          variant="outline"
          size="sm"
          disabled={prevDropDisabled}
          onClick={onPrevious}
          aria-label="Previous spread"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Anterior</span>
        </Button>
      </div>

      <span className="min-w-[7rem] text-center text-sm tabular-nums text-muted-foreground">
        {showNavHint ? (
          <span className="text-xs text-primary">Solte para mudar de página</span>
        ) : (
          <>Página {spreadIndex + 1} / {totalSpreads}</>
        )}
      </span>

      <div
        className={cn(
          "rounded-lg transition-colors",
          overNext && "bg-primary/10 ring-2 ring-primary/50"
        )}
        {...pageNavDropProps(
          dragHandlers,
          "binder-nav-next",
          (draggedId) => onDropToSpread(draggedId, spreadIndex + 1),
          !canDropNext
        )}
      >
        <Button
          variant="outline"
          size="sm"
          disabled={spreadIndex >= totalSpreads - 1}
          onClick={onNext}
          aria-label="Next spread"
        >
          <span className="hidden sm:inline">Próxima</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function CollectionBinderView() {
  const data = useCollectionView();
  const selectedIds = useCollectionUIStore((s) => s.selectedIds);
  const openCardInspect = useCollectionUIStore((s) => s.openCardInspect);
  const binderGridLayout = useCollectionUIStore((s) => s.binderGridLayout);
  const setBinderGridLayout = useCollectionUIStore((s) => s.setBinderGridLayout);
  const [spreadIndex, setSpreadIndex] = useState(0);
  const dragHandlers = useDragReorder(data.reorderCard);

  const { cols, rows, label, maxWidth } = LAYOUT_CONFIG[binderGridLayout];
  const pageSize = cols * rows;
  const spreadSize = pageSize * 2;

  const cardById = useMemo(
    () => new Map(data.filtered.map((card) => [card.id, card])),
    [data.filtered]
  );

  const totalSpreads = useMemo(
    () => binderSpreadCount(data.binderLayout, spreadSize),
    [data.binderLayout, spreadSize]
  );

  const pageResetKey = useMemo(
    () =>
      `${binderGridLayout}:${data.filtered
        .map((card) => card.id)
        .sort()
        .join(",")}`,
    [binderGridLayout, data.filtered]
  );

  useEffect(() => {
    setSpreadIndex(0);
  }, [pageResetKey]);

  useEffect(() => {
    if (spreadIndex >= totalSpreads) {
      setSpreadIndex(Math.max(0, totalSpreads - 1));
    }
  }, [spreadIndex, totalSpreads]);

  const currentSpreadSlots = useMemo(
    () => binderSpreadSlots(data.binderLayout, spreadIndex, spreadSize),
    [data.binderLayout, spreadIndex, spreadSize]
  );

  const leftPage = useMemo(
    () => resolvePageCards(currentSpreadSlots.slice(0, pageSize), cardById),
    [currentSpreadSlots, pageSize, cardById]
  );

  const rightPage = useMemo(
    () => resolvePageCards(currentSpreadSlots.slice(pageSize, spreadSize), cardById),
    [currentSpreadSlots, spreadSize, pageSize, cardById]
  );

  const cardsOnSpread = currentSpreadSlots.filter(Boolean).length;

  const handleDropToSpread = useCallback(
    (draggedId: string, targetSpread: number) => {
      if (targetSpread < 0) return;
      const targetIndex = firstAvailableSlotInSpread(
        data.binderLayout,
        targetSpread,
        spreadSize
      );
      data.moveCardToBinderSlot(draggedId, targetIndex);
      setSpreadIndex(targetSpread);
    },
    [data.binderLayout, data.moveCardToBinderSlot, spreadSize]
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-gradient-to-b from-zinc-950 via-zinc-900/95 to-background">
      <div className="flex flex-1 flex-col items-center overflow-auto px-2 py-3 sm:px-4 sm:py-5">
        <div className={cn("w-full", maxWidth)}>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted-foreground sm:mb-3 sm:text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground/80">Binder · {label}</span>
              <BinderLayoutToggle layout={binderGridLayout} onChange={setBinderGridLayout} />
            </div>
            <span className="tabular-nums">
              {cardsOnSpread} nesta página · {data.filtered.length} total
            </span>
          </div>

          <div className="flex flex-col overflow-hidden rounded-xl shadow-2xl ring-1 ring-black/20 md:flex-row md:rounded-2xl">
            <BinderPage
              cards={leftPage}
              side="left"
              cols={cols}
              rows={rows}
              pageOffset={0}
              spreadIndex={spreadIndex}
              spreadSize={spreadSize}
              selectedIds={selectedIds}
              onOpen={(id) => openCardInspect(id, "details")}
              dragHandlers={dragHandlers}
              moveToSlot={data.moveCardToBinderSlot}
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
              cols={cols}
              rows={rows}
              pageOffset={pageSize}
              spreadIndex={spreadIndex}
              spreadSize={spreadSize}
              selectedIds={selectedIds}
              onOpen={(id) => openCardInspect(id, "details")}
              dragHandlers={dragHandlers}
              moveToSlot={data.moveCardToBinderSlot}
            />
          </div>
        </div>
      </div>

      <BinderSpreadNav
        spreadIndex={spreadIndex}
        totalSpreads={totalSpreads}
        dragHandlers={dragHandlers}
        onPrevious={() => setSpreadIndex((i) => Math.max(0, i - 1))}
        onNext={() => setSpreadIndex((i) => Math.min(totalSpreads - 1, i + 1))}
        onDropToSpread={handleDropToSpread}
      />
    </div>
  );
}
