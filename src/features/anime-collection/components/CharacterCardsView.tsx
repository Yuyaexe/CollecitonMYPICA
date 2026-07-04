"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, LayoutGrid, Minus, Pencil, Plus, Trash2 } from "lucide-react";
import { CardImage } from "@/components/shared/CardImage";
import { Modal } from "@/components/shared/Modal";
import { RarityBadge } from "@/components/shared/RarityBadge";
import { PriceBadge } from "@/components/shared/PriceBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCardPreviewImageUrl } from "@/lib/cards/preview-image";
import { useYugiohPasscodeForDisplay } from "@/hooks/useYugiohPasscodeForDisplay";
import { useYugiohCardImageRepair } from "@/hooks/useYugiohCardImageRepair";
import { cn, formatCurrency } from "@/lib/utils";
import type { AnimeCharacterCard } from "@/lib/demo/types";
import type { Currency } from "@/types/tcg";

export type CharacterCardsViewMode = "grid" | "binder";
type BinderLayout = "4x3" | "3x3";

const VIEW_STORAGE_KEY = "deckvault-anime-character-cards-view";
const BINDER_LAYOUT_KEY = "deckvault-anime-character-binder-layout";

const BINDER_LAYOUTS: Record<
  BinderLayout,
  { cols: number; rows: number; label: string; maxWidth: string }
> = {
  "4x3": { cols: 4, rows: 3, label: "4×3", maxWidth: "max-w-6xl" },
  "3x3": { cols: 3, rows: 3, label: "3×3", maxWidth: "max-w-4xl" },
};

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
  currency: Currency;
  onRemove: (id: string) => void;
  onQuantityChange: (id: string, quantity: number) => void;
  onEditEdition: (id: string, setName: string | null) => void;
}

function CharacterCardThumb({
  item,
  className,
}: {
  item: AnimeCharacterCard;
  className?: string;
}) {
  const ygoPasscode = useYugiohPasscodeForDisplay(item.card);
  useYugiohCardImageRepair(item.id, item.card, ygoPasscode);
  const thumbSrc = getCardPreviewImageUrl(item.card, ygoPasscode) ?? item.card.imageUrl;

  return (
    <div className={cn("relative aspect-[59/86] overflow-hidden rounded-lg bg-muted/30 ring-1 ring-border/30", className)}>
      <CardImage src={thumbSrc} alt={item.card.name} fill sizes="140px" className="object-contain p-1" />
    </div>
  );
}

function CharacterGridCard({
  item,
  currency,
  onRemove,
  onQuantityChange,
  onEditEdition,
}: {
  item: AnimeCharacterCard;
  currency: Currency;
  onRemove: (id: string) => void;
  onQuantityChange: (id: string, quantity: number) => void;
  onEditEdition: (item: AnimeCharacterCard) => void;
}) {
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

      <CharacterCardThumb item={item} className="mx-auto w-full max-w-[140px]" />

      <div className="mt-2 space-y-1.5 px-1">
        <div className="flex items-center justify-center gap-1.5">
          <RarityBadge rarity={item.card.rarity} gameSlug={item.card.gameSlug} />
          {item.quantity > 1 && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
              ×{item.quantity}
            </span>
          )}
        </div>
        <p className="line-clamp-2 text-center text-xs font-semibold leading-tight">{item.card.name}</p>
        <button
          type="button"
          onClick={() => onEditEdition(item)}
          className="group/edit mx-auto flex max-w-full items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-primary"
          title="Edit edition"
        >
          <span className="truncate">{item.card.setName ?? "Add edition…"}</span>
          <Pencil className="h-2.5 w-2.5 shrink-0 opacity-0 group-hover/edit:opacity-100" />
        </button>
        <div className="flex justify-center pt-0.5">
          <PriceBadge price={item.card.marketPrice} currency={currency} />
        </div>
        <div className="flex items-center justify-center gap-1 pt-1">
          <Button type="button" variant="outline" size="icon" className="h-7 w-7" aria-label="Decrease quantity" onClick={() => onQuantityChange(item.id, item.quantity - 1)}>
            <Minus className="h-3 w-3" />
          </Button>
          <span className="min-w-[2ch] text-center text-sm font-medium tabular-nums">{item.quantity}</span>
          <Button type="button" variant="outline" size="icon" className="h-7 w-7" aria-label="Increase quantity" onClick={() => onQuantityChange(item.id, item.quantity + 1)}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function CharacterBinderSlot({
  item,
  currency,
  onEditEdition,
}: {
  item: AnimeCharacterCard | null;
  currency: Currency;
  onEditEdition: (item: AnimeCharacterCard) => void;
}) {
  if (!item) {
    return (
      <div className="flex flex-col gap-1" aria-hidden>
        <div className="aspect-[59/86] rounded-md border border-dashed border-stone-400/25 bg-stone-500/5 dark:border-stone-600/30 dark:bg-stone-950/20" />
        <div className="h-9 rounded-md border border-dashed border-stone-400/20 bg-stone-500/5 dark:border-stone-600/25 dark:bg-stone-950/15" />
      </div>
    );
  }

  const setLine = item.card.setName ?? "Add edition…";

  return (
    <div className="group flex flex-col gap-1 rounded-lg transition-all duration-150">
      <div className="relative aspect-[59/86] w-full overflow-hidden rounded-md bg-stone-900/10 shadow-sm ring-1 ring-stone-900/10 dark:bg-stone-950/40 dark:ring-stone-100/10">
        <CharacterCardThumb item={item} className="h-full w-full rounded-md ring-0" />
        {item.quantity > 1 && (
          <span className="absolute right-1 top-1 rounded bg-black/70 px-1 py-0.5 text-[10px] font-bold text-white">
            ×{item.quantity}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => onEditEdition(item)}
        className="flex w-full flex-col gap-0.5 rounded-md bg-zinc-900/90 px-1.5 py-1 text-left ring-1 ring-white/5 transition-colors hover:bg-zinc-800/95 group-hover:ring-primary/20 dark:bg-zinc-950/90"
      >
        <div className="flex items-center justify-between gap-1">
          <RarityBadge rarity={item.card.rarity} gameSlug={item.card.gameSlug} size="sm" />
          <span className="min-w-0 truncate text-[10px] font-semibold tabular-nums text-white">
            {item.card.marketPrice != null ? formatCurrency(item.card.marketPrice, currency) : "—"}
          </span>
        </div>
        <p className="truncate text-[9px] font-medium text-white/75 group-hover:text-white">{item.card.name}</p>
        <p className="truncate text-[8px] text-white/50 group-hover:text-white/70">{setLine}</p>
      </button>
    </div>
  );
}

function CharacterBinderView({
  cards,
  currency,
  layout,
  onLayoutChange,
  onEditEdition,
}: {
  cards: AnimeCharacterCard[];
  currency: Currency;
  layout: BinderLayout;
  onLayoutChange: (layout: BinderLayout) => void;
  onEditEdition: (item: AnimeCharacterCard) => void;
}) {
  const [spreadIndex, setSpreadIndex] = useState(0);
  const { cols, rows, label, maxWidth } = BINDER_LAYOUTS[layout];
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

  const renderPage = (pageCards: (AnimeCharacterCard | null)[], side: "left" | "right") => (
    <div
      className={cn(
        "relative flex min-w-0 flex-1 flex-col p-2 sm:p-4",
        "bg-gradient-to-br from-stone-100 via-stone-50 to-stone-200/90 dark:from-stone-800 dark:via-stone-900 dark:to-stone-950",
        side === "left" ? "rounded-t-xl md:rounded-l-2xl md:rounded-tr-none" : "rounded-b-xl md:rounded-r-2xl md:rounded-bl-none"
      )}
    >
      <div
        className="grid flex-1 gap-1.5 sm:gap-2"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, auto))`,
        }}
      >
        {pageCards.map((item, index) => (
          <CharacterBinderSlot
            key={item?.id ?? `${side}-empty-${index}`}
            item={item}
            currency={currency}
            onEditEdition={onEditEdition}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="overflow-hidden rounded-xl bg-gradient-to-b from-zinc-950 via-zinc-900/95 to-background">
      <div className="flex flex-col items-center px-2 py-3 sm:px-4 sm:py-5">
        <div className={cn("w-full", maxWidth)}>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted-foreground sm:mb-3 sm:text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground/80">Binder · {label}</span>
              <div className="inline-flex rounded-md border border-border/60 bg-muted/30 p-0.5">
                {(Object.keys(BINDER_LAYOUTS) as BinderLayout[]).map((id) => (
                  <Button
                    key={id}
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={cn("h-7 px-2.5 text-xs tabular-nums", layout === id && "bg-background shadow-sm")}
                    onClick={() => onLayoutChange(id)}
                    aria-pressed={layout === id}
                  >
                    {BINDER_LAYOUTS[id].label}
                  </Button>
                ))}
              </div>
            </div>
            <span className="tabular-nums">
              {spreadStart}–{spreadEnd} of {cards.length}
            </span>
          </div>

          <div className="flex flex-col overflow-hidden rounded-xl shadow-2xl ring-1 ring-black/20 md:flex-row md:rounded-2xl">
            {renderPage(leftPage, "left")}
            <div className="relative h-2 w-full shrink-0 bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 md:h-auto md:w-3 md:bg-gradient-to-b lg:w-4" aria-hidden />
            {renderPage(rightPage, "right")}
          </div>

          {totalSpreads > 1 && (
            <div className="mt-3 flex items-center justify-center gap-2">
              <Button type="button" variant="outline" size="icon" className="h-8 w-8" disabled={spreadIndex === 0} onClick={() => setSpreadIndex((i) => i - 1)} aria-label="Previous spread">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs tabular-nums text-muted-foreground">
                Spread {spreadIndex + 1} / {totalSpreads}
              </span>
              <Button type="button" variant="outline" size="icon" className="h-8 w-8" disabled={spreadIndex >= totalSpreads - 1} onClick={() => setSpreadIndex((i) => i + 1)} aria-label="Next spread">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ViewModeSwitcher({
  mode,
  onChange,
}: {
  mode: CharacterCardsViewMode;
  onChange: (mode: CharacterCardsViewMode) => void;
}) {
  const modes: { id: CharacterCardsViewMode; label: string; icon: typeof LayoutGrid }[] = [
    { id: "grid", label: "Grid", icon: LayoutGrid },
    { id: "binder", label: "Binder", icon: BookOpen },
  ];

  return (
    <div className="inline-flex items-center rounded-lg border border-border/60 bg-muted/30 p-0.5" role="group" aria-label="Card view mode">
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
  currency,
  onRemove,
  onQuantityChange,
  onEditEdition,
}: CharacterCardsViewProps) {
  const [viewMode, setViewMode] = usePersistedViewMode();
  const [binderLayout, setBinderLayout] = usePersistedBinderLayout();
  const [editionOpen, setEditionOpen] = useState(false);
  const [editionTarget, setEditionTarget] = useState<AnimeCharacterCard | null>(null);
  const [editionValue, setEditionValue] = useState("");

  const openEditionEditor = (item: AnimeCharacterCard) => {
    setEditionTarget(item);
    setEditionValue(item.card.setName ?? "");
    setEditionOpen(true);
  };

  const handleSaveEdition = () => {
    if (!editionTarget) return;
    onEditEdition(editionTarget.id, editionValue.trim() || null);
    setEditionOpen(false);
    setEditionTarget(null);
  };

  return (
    <>
      <div className="mb-3 flex justify-end">
        <ViewModeSwitcher mode={viewMode} onChange={setViewMode} />
      </div>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {cards.map((item) => (
            <CharacterGridCard
              key={item.id}
              item={item}
              currency={currency}
              onRemove={onRemove}
              onQuantityChange={onQuantityChange}
              onEditEdition={openEditionEditor}
            />
          ))}
        </div>
      ) : (
        <CharacterBinderView
          cards={cards}
          currency={currency}
          layout={binderLayout}
          onLayoutChange={setBinderLayout}
          onEditEdition={openEditionEditor}
        />
      )}

      <Modal
        open={editionOpen}
        onOpenChange={setEditionOpen}
        title="Edit edition"
        description={editionTarget ? `Set or edition for ${editionTarget.card.name}` : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditionOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdition}>Save</Button>
          </>
        }
      >
        <div className="space-y-2 py-2">
          <Label htmlFor="card-edition">Edition / set name</Label>
          <Input
            id="card-edition"
            value={editionValue}
            onChange={(e) => setEditionValue(e.target.value)}
            placeholder="e.g. Dragons of Legend"
            autoFocus
          />
        </div>
      </Modal>
    </>
  );
}
