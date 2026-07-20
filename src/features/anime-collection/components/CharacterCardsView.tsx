"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, LayoutGrid, Minus, Plus, Trash2 } from "lucide-react";
import { CardImage } from "@/components/shared/CardImage";
import { RarityBadge } from "@/components/shared/RarityBadge";
import {
  BinderEmptySlot,
  BinderLayoutToggle,
  BinderPagePanel,
  BinderSpine,
  BinderSpreadFrame,
  BINDER_GRID_LAYOUTS,
  type BinderGridLayoutId,
} from "@/components/shared/binder/BinderChrome";
import { Button } from "@/components/ui/button";
import { resolveCollectionThumbUrl } from "@/lib/cards/preview-image";
import { useYugiohPasscodeForDisplay } from "@/hooks/useYugiohPasscodeForDisplay";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";
import { useDragReorder, dragHandleProps, emptySlotDragProps } from "@/hooks/useDragReorder";
import type { AnimeCharacterCard } from "@/lib/demo/types";

export type CharacterCardsViewMode = "grid" | "binder";
type BinderLayout = BinderGridLayoutId;

const VIEW_STORAGE_KEY = "deckvault-anime-character-cards-view";
const BINDER_LAYOUT_KEY = "deckvault-anime-character-binder-layout";

function usePersistedViewMode(): [CharacterCardsViewMode, (mode: CharacterCardsViewMode) => void] {
  const [mode, setMode] = useState<CharacterCardsViewMode>("grid");

  useEffect(() => {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY);
    if (stored === "grid" || stored === "binder") setMode(stored);
  }, []);

  const update = (next: CharacterCardsViewMode) => {
    setMode(next);
    localStorage.setItem(VIEW_STORAGE_KEY, next);
  };

  return [mode, update];
}

function usePersistedBinderLayout(): [BinderLayout, (layout: BinderLayout) => void] {
  const [layout, setLayout] = useState<BinderLayout>("4x3");

  useEffect(() => {
    const stored = localStorage.getItem(BINDER_LAYOUT_KEY);
    if (stored === "4x3" || stored === "3x3") setLayout(stored);
  }, []);

  const update = (next: BinderLayout) => {
    setLayout(next);
    localStorage.setItem(BINDER_LAYOUT_KEY, next);
  };

  return [layout, update];
}

function buildSpreads(cards: AnimeCharacterCard[], pageSize: number): AnimeCharacterCard[][] {
  const spreadSize = pageSize * 2;
  if (cards.length === 0) return [[]];
  const spreads: AnimeCharacterCard[][] = [];
  for (let i = 0; i < cards.length; i += spreadSize) {
    spreads.push(cards.slice(i, i + spreadSize));
  }
  return spreads;
}

function pageSlots(
  cards: AnimeCharacterCard[],
  offset: number,
  pageSize: number
): (AnimeCharacterCard | null)[] {
  const slice = cards.slice(offset, offset + pageSize);
  return Array.from({ length: pageSize }, (_, i) => slice[i] ?? null);
}

interface CharacterCardsViewProps {
  cards: AnimeCharacterCard[];
  onRemove: (id: string) => void;
  onQuantityChange: (id: string, quantity: number) => void;
  onOpenCard: (item: AnimeCharacterCard) => void;
  onReorder: (draggedId: string, targetId: string | null) => void;
  onReorderToIndex: (draggedId: string, targetIndex: number) => void;
}

function CharacterCardThumb({
  item,
  className,
  onClick,
}: {
  item: AnimeCharacterCard;
  className?: string;
  onClick?: () => void;
}) {
  const t = useT();
  const ygoPasscode = useYugiohPasscodeForDisplay(item.card, item.id);
  const thumbSrc = resolveCollectionThumbUrl(item.card, ygoPasscode);

  const image = (
    <CardImage src={thumbSrc} alt={item.card.name} fill sizes="140px" className="object-contain p-1" />
  );

  const classes = cn(
    "relative aspect-[59/86] overflow-hidden rounded-lg bg-muted/30 ring-1 ring-border/30 transition-all",
    onClick && "cursor-pointer hover:ring-primary/40 hover:shadow-md",
    className
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={classes}
        aria-label={t("anime.openCard", { name: item.card.name })}
      >
        {image}
      </button>
    );
  }

  return <div className={classes}>{image}</div>;
}

function CharacterGridCard({
  item,
  onRemove,
  onQuantityChange,
  onOpenCard,
  dragHandlers,
}: {
  item: AnimeCharacterCard;
  onRemove: (id: string) => void;
  onQuantityChange: (id: string, quantity: number) => void;
  onOpenCard: (item: AnimeCharacterCard) => void;
  dragHandlers: ReturnType<typeof useDragReorder>;
}) {
  const t = useT();
  const dragOver = dragHandlers.isDragOver(item.id);

  return (
    <div
      {...dragHandleProps(dragHandlers, item.id)}
      className={cn(
        "group relative flex flex-col rounded-xl border border-border/60 bg-card/40 p-2 transition-all hover:border-primary/40 hover:shadow-md cursor-grab active:cursor-grabbing",
        dragOver && "border-primary ring-2 ring-primary/30"
      )}
    >
      <button
        type="button"
        aria-label={t("anime.removeCard", { name: item.card.name })}
        onClick={() => onRemove(item.id)}
        className="absolute right-2 top-2 z-10 rounded-md bg-background/80 p-1 text-muted-foreground opacity-0 backdrop-blur-sm transition-opacity hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      <CharacterCardThumb
        item={item}
        className="mx-auto w-full max-w-[140px]"
        onClick={() => onOpenCard(item)}
      />

      <div className="mt-2 space-y-1.5 px-1">
        <div className="flex items-center justify-center gap-1.5">
          <RarityBadge rarity={item.card.rarity} gameSlug={item.card.gameSlug} />
          {item.quantity > 1 && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
              ×{item.quantity}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onOpenCard(item)}
          className="w-full text-center hover:text-primary"
        >
          <p className="line-clamp-2 text-xs font-semibold leading-tight">{item.card.name}</p>
          <p className="truncate text-[10px] text-muted-foreground">
            {item.card.setName ?? "—"}
          </p>
        </button>
        <div className="flex items-center justify-center gap-1 pt-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7"
            aria-label={t("qty.decrease")}
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
            aria-label={t("qty.increase")}
            onClick={() => onQuantityChange(item.id, item.quantity + 1)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function CharacterBinderSlot({
  item,
  onOpenCard,
  dragHandlers,
  slotKey,
  onDropAtIndex,
}: {
  item: AnimeCharacterCard | null;
  onOpenCard: (item: AnimeCharacterCard) => void;
  dragHandlers: ReturnType<typeof useDragReorder>;
  slotKey: string;
  onDropAtIndex?: (draggedId: string) => void;
}) {
  if (!item) {
    return (
      <div
        className={cn(
          "flex flex-col gap-1 rounded-md transition-colors",
          dragHandlers.isDragOver(slotKey) && "ring-2 ring-primary/40"
        )}
        aria-hidden
        {...emptySlotDragProps(dragHandlers, slotKey, onDropAtIndex)}
      >
        <BinderEmptySlot />
      </div>
    );
  }

  const setLine = item.card.setName ?? "—";
  const dragOver = dragHandlers.isDragOver(item.id);

  return (
    <div
      {...dragHandleProps(dragHandlers, item.id)}
      className={cn(
        "group relative flex flex-col gap-1 rounded-lg transition-all duration-150 cursor-grab active:cursor-grabbing",
        dragOver && "ring-2 ring-primary/40"
      )}
    >
      <CharacterCardThumb
        item={item}
        className="w-full rounded-md ring-stone-900/10 dark:ring-stone-100/10"
        onClick={() => onOpenCard(item)}
      />
      {item.quantity > 1 && (
        <span className="absolute right-1 top-1 z-10 rounded bg-black/70 px-1 py-0.5 text-[10px] font-bold text-white">
          ×{item.quantity}
        </span>
      )}
      <button
        type="button"
        onClick={() => onOpenCard(item)}
        className="flex w-full flex-col gap-0.5 rounded-md bg-zinc-900/90 px-1.5 py-1 text-left ring-1 ring-white/5 transition-colors hover:bg-zinc-800/95 group-hover:ring-primary/20 dark:bg-zinc-950/90"
      >
        <div className="flex items-center justify-between gap-1">
          <RarityBadge rarity={item.card.rarity} gameSlug={item.card.gameSlug} size="sm" />
        </div>
        <p className="truncate text-[9px] font-medium text-white/75 group-hover:text-white">
          {item.card.name}
        </p>
        <p className="truncate text-[8px] text-white/50 group-hover:text-white/70">{setLine}</p>
      </button>
    </div>
  );
}

function CharacterBinderView({
  cards,
  layout,
  onLayoutChange,
  onOpenCard,
  dragHandlers,
  onReorderToIndex,
}: {
  cards: AnimeCharacterCard[];
  layout: BinderLayout;
  onLayoutChange: (layout: BinderLayout) => void;
  onOpenCard: (item: AnimeCharacterCard) => void;
  dragHandlers: ReturnType<typeof useDragReorder>;
  onReorderToIndex: (draggedId: string, targetIndex: number) => void;
}) {
  const t = useT();
  const [spreadIndex, setSpreadIndex] = useState(0);
  const { cols, rows, label, maxWidth } = BINDER_GRID_LAYOUTS[layout];
  const pageSize = cols * rows;
  const spreadSize = pageSize * 2;

  const spreads = useMemo(() => buildSpreads(cards, pageSize), [cards, pageSize]);
  const totalSpreads = spreads.length;

  useEffect(() => {
    setSpreadIndex(0);
  }, [cards.length, layout]);

  useEffect(() => {
    if (spreadIndex >= totalSpreads) {
      setSpreadIndex(Math.max(0, totalSpreads - 1));
    }
  }, [spreadIndex, totalSpreads]);

  const currentSpread = spreads[spreadIndex] ?? [];
  const leftPage = pageSlots(currentSpread, 0, pageSize);
  const rightPage = pageSlots(currentSpread, pageSize, pageSize);
  const spreadStart = spreadIndex * spreadSize + 1;
  const spreadEnd = Math.min((spreadIndex + 1) * spreadSize, cards.length);

  const renderPage = (
    pageCards: (AnimeCharacterCard | null)[],
    side: "left" | "right",
    pageOffset: number
  ) => (
    <BinderPagePanel side={side} cols={cols} rows={rows}>
      {pageCards.map((item, index) => {
        const globalIndex = spreadIndex * spreadSize + pageOffset + index;
        const slotKey = item?.id ?? `${side}-slot-${globalIndex}`;
        return (
          <CharacterBinderSlot
            key={slotKey}
            item={item}
            onOpenCard={onOpenCard}
            dragHandlers={dragHandlers}
            slotKey={slotKey}
            onDropAtIndex={(draggedId) => onReorderToIndex(draggedId, globalIndex)}
          />
        );
      })}
    </BinderPagePanel>
  );

  return (
    <BinderSpreadFrame maxWidth={maxWidth}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted-foreground sm:mb-3 sm:text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground/80">Binder · {label}</span>
          <BinderLayoutToggle
            layout={layout}
            onChange={onLayoutChange}
            ariaLabel={t("collection.binderGridLayout")}
          />
        </div>
        <span className="tabular-nums">
          {spreadStart}–{spreadEnd} of {cards.length}
        </span>
      </div>

      <div className="flex flex-col overflow-hidden rounded-xl shadow-2xl ring-1 ring-black/20 md:flex-row md:rounded-2xl">
        {renderPage(leftPage, "left", 0)}
        <BinderSpine />
        {renderPage(rightPage, "right", pageSize)}
      </div>

      {totalSpreads > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={spreadIndex === 0}
            onClick={() => setSpreadIndex(spreadIndex - 1)}
            aria-label={t("anime.previousSpread")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs tabular-nums text-muted-foreground">
            {t("anime.spreadOf", { current: spreadIndex + 1, total: totalSpreads })}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={spreadIndex >= totalSpreads - 1}
            onClick={() => setSpreadIndex(spreadIndex + 1)}
            aria-label={t("anime.nextSpread")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </BinderSpreadFrame>
  );
}

function ViewModeSwitcher({
  mode,
  onChange,
}: {
  mode: CharacterCardsViewMode;
  onChange: (mode: CharacterCardsViewMode) => void;
}) {
  const t = useT();
  const modes: { id: CharacterCardsViewMode; label: string; icon: typeof LayoutGrid }[] = [
    { id: "grid", label: t("anime.viewGrid"), icon: LayoutGrid },
    { id: "binder", label: t("anime.viewBinder"), icon: BookOpen },
  ];

  return (
    <div
      className="inline-flex items-center rounded-lg border border-border/60 bg-muted/30 p-0.5"
      role="group"
      aria-label={t("anime.cardViewMode")}
    >
      {modes.map(({ id, label, icon: Icon }) => (
        <Button
          key={id}
          type="button"
          variant="ghost"
          size="sm"
          className={cn("h-7 gap-1.5 px-2.5 text-xs", mode === id && "bg-background shadow-sm")}
          onClick={() => onChange(id)}
          aria-pressed={mode === id}
          title={label}
        >
          <Icon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{label}</span>
        </Button>
      ))}
    </div>
  );
}

export function CharacterCardsView({
  cards,
  onRemove,
  onQuantityChange,
  onOpenCard,
  onReorder,
  onReorderToIndex,
}: CharacterCardsViewProps) {
  const t = useT();
  const [viewMode, setViewMode] = usePersistedViewMode();
  const [binderLayout, setBinderLayout] = usePersistedBinderLayout();

  const dragHandlers = useDragReorder(onReorder);

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{t("anime.dragToReorder")}</p>
        <ViewModeSwitcher mode={viewMode} onChange={setViewMode} />
      </div>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {cards.map((item) => (
            <CharacterGridCard
              key={item.id}
              item={item}
              onRemove={onRemove}
              onQuantityChange={onQuantityChange}
              onOpenCard={onOpenCard}
              dragHandlers={dragHandlers}
            />
          ))}
        </div>
      ) : (
        <CharacterBinderView
          cards={cards}
          layout={binderLayout}
          onLayoutChange={setBinderLayout}
          onOpenCard={onOpenCard}
          dragHandlers={dragHandlers}
          onReorderToIndex={onReorderToIndex}
        />
      )}
    </>
  );
}
