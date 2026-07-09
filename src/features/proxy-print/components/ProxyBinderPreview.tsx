"use client";

import { memo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RarityBadge } from "@/components/shared/RarityBadge";
import { previewImageSrc } from "@/lib/proxy-print/preview-image";
import {
  CARDS_PER_PAGE,
  SLOTS_PER_SPREAD,
  type ProxyPrintSlot,
} from "@/lib/proxy-print/types";
import { useT } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

interface ProxyBinderPreviewProps {
  slots: ProxyPrintSlot[];
  spreadIndex: number;
  onSpreadChange: (index: number) => void;
}

const BinderThumb = memo(function BinderThumb({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className="absolute inset-0 h-full w-full object-contain p-0.5"
    />
  );
});

const BinderSlot = memo(function BinderSlot({ slot }: { slot: ProxyPrintSlot }) {
  const setLine = slot.setLine ?? "—";
  const imgSrc = previewImageSrc(slot.imageUrl);

  return (
    <div className="flex flex-col gap-1">
      <div
        className={cn(
          "relative aspect-[59/86] w-full overflow-hidden rounded-md bg-stone-900/10 shadow-sm ring-1 ring-stone-900/10",
          "dark:bg-stone-950/40 dark:ring-stone-100/10"
        )}
      >
        {imgSrc ? (
          <BinderThumb src={imgSrc} alt={slot.name} />
        ) : (
          <div className="flex h-full items-center justify-center bg-muted/40 text-[10px] text-muted-foreground">
            ?
          </div>
        )}
      </div>

      <div
        className={cn(
          "flex w-full flex-col gap-0.5 rounded-md bg-zinc-900/90 px-1.5 py-1 text-left ring-1 ring-white/5",
          "dark:bg-zinc-950/90"
        )}
      >
        <div className="flex items-center justify-between gap-1">
          {slot.rarity ? (
            <RarityBadge rarity={slot.rarity} gameSlug="yugioh" size="sm" />
          ) : (
            <span className="h-4 w-6" />
          )}
        </div>
        <p className="truncate text-[9px] font-medium leading-tight text-white/80">{slot.name}</p>
        <p className="truncate text-[8px] text-white/50">{setLine}</p>
      </div>
    </div>
  );
});

function BinderPage({
  pageSlots,
  side,
}: {
  pageSlots: (ProxyPrintSlot | null)[];
  side: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "relative flex min-w-0 flex-1 flex-col p-2 sm:p-3",
        "bg-gradient-to-br from-stone-100 via-stone-50 to-stone-200/90",
        "dark:from-stone-800 dark:via-stone-900 dark:to-stone-950",
        side === "left"
          ? "rounded-t-xl md:rounded-l-2xl md:rounded-tr-none"
          : "rounded-b-xl md:rounded-r-2xl md:rounded-bl-none"
      )}
    >
      <div
        className="grid flex-1 gap-1.5 sm:gap-2"
        style={{
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gridTemplateRows: "repeat(3, minmax(0, auto))",
        }}
      >
        {pageSlots.map((slot, index) => {
          if (!slot) {
            return (
              <div key={`empty-${side}-${index}`} className="flex flex-col gap-1">
                <div className="aspect-[59/86] rounded-md border border-dashed border-stone-400/25 bg-stone-500/5 dark:border-stone-600/30 dark:bg-stone-950/20" />
                <div className="h-9 rounded-md border border-dashed border-stone-400/20 bg-stone-500/5 dark:border-stone-600/25" />
              </div>
            );
          }

          return <BinderSlot key={slot.slotId} slot={slot} />;
        })}
      </div>
    </div>
  );
}

export const ProxyBinderPreview = memo(function ProxyBinderPreview({
  slots,
  spreadIndex,
  onSpreadChange,
}: ProxyBinderPreviewProps) {
  const t = useT();
  const totalSpreads = Math.max(1, Math.ceil(slots.length / SLOTS_PER_SPREAD));
  const spreadStart = spreadIndex * SLOTS_PER_SPREAD;
  const spreadSlots = slots.slice(spreadStart, spreadStart + SLOTS_PER_SPREAD);

  const leftPage: (ProxyPrintSlot | null)[] = Array.from({ length: CARDS_PER_PAGE }, (_, i) =>
    spreadSlots[i] ?? null
  );
  const rightPage: (ProxyPrintSlot | null)[] = Array.from({ length: CARDS_PER_PAGE }, (_, i) =>
    spreadSlots[i + CARDS_PER_PAGE] ?? null
  );

  const onSpread = spreadSlots.filter(Boolean).length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
        <span className="font-medium text-foreground/80">{t("proxyPrint.binderPreview")}</span>
        <span className="tabular-nums">
          {t("proxyPrint.spreadCount", { onSpread, total: slots.length })}
        </span>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-xl shadow-2xl ring-1 ring-black/20 md:flex-row md:rounded-2xl">
        <BinderPage pageSlots={leftPage} side="left" />
        <div
          className="relative h-2 w-full shrink-0 bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 md:h-auto md:w-3 md:bg-gradient-to-b lg:w-4"
          aria-hidden
        />
        <BinderPage pageSlots={rightPage} side="right" />
      </div>

      {totalSpreads > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={spreadIndex === 0}
            onClick={() => onSpreadChange(spreadIndex - 1)}
            aria-label={t("binder.previous")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs tabular-nums text-muted-foreground">
            {t("binder.pageOf", { current: spreadIndex + 1, total: totalSpreads })}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={spreadIndex >= totalSpreads - 1}
            onClick={() => onSpreadChange(spreadIndex + 1)}
            aria-label={t("binder.next")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
});
