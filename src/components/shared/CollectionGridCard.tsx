"use client";

import { motion } from "framer-motion";
import { Layers, Star } from "lucide-react";
import { CardImage } from "@/components/shared/CardImage";
import { cn } from "@/lib/utils";

export interface CollectionGridCardProps {
  name: string;
  coverImageUrl?: string | null;
  cardCount: number;
  isFavorite?: boolean;
  isActive?: boolean;
  onSelect: () => void;
  onToggleFavorite?: () => void;
  index?: number;
}

export function CollectionGridCard({
  name,
  coverImageUrl,
  cardCount,
  isFavorite = false,
  isActive = false,
  onSelect,
  onToggleFavorite,
  index = 0,
}: CollectionGridCardProps) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={cn(
        "group relative aspect-square w-full overflow-hidden rounded-xl border text-left",
        "bg-gradient-to-br from-card via-card to-secondary/40",
        "transition-[border-color,box-shadow] duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isActive
          ? "border-primary/60 shadow-[0_0_24px_hsla(221,83%,53%,0.25)]"
          : "border-border/70 hover:border-primary/40 hover:shadow-[0_0_20px_hsla(221,83%,53%,0.12)]"
      )}
    >
      {/* Cover / icon area */}
      <div className="absolute inset-0 flex items-center justify-center p-6 pb-14">
        {coverImageUrl ? (
          <div className="relative h-full w-full max-w-[72%] overflow-hidden rounded-lg shadow-lg ring-1 ring-white/10">
            <CardImage src={coverImageUrl} alt={name} fill sizes="160px" className="object-cover" />
          </div>
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 via-violet-500/10 to-primary/5 ring-1 ring-primary/20 transition-all duration-200 group-hover:from-primary/30 group-hover:ring-primary/40">
            <Layers className="h-9 w-9 text-primary/80" />
          </div>
        )}
      </div>

      {/* Purple accent glow on hover */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-violet-600/10 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100"
      />

      {/* Favorite star */}
      {onToggleFavorite && (
        <span
          role="button"
          tabIndex={0}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite();
            }
          }}
          className={cn(
            "absolute right-2 top-2 z-10 rounded-md p-1.5 transition-all duration-150",
            "hover:bg-background/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            isFavorite ? "text-amber-400" : "text-muted-foreground/50 hover:text-amber-400/80"
          )}
        >
          <Star className={cn("h-4 w-4", isFavorite && "fill-current")} />
        </span>
      )}

      {/* Name + count footer */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 via-background/80 to-transparent px-3 pb-3 pt-10">
        <p className="truncate text-sm font-semibold tracking-tight">{name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {cardCount === 1 ? "1 card" : `${cardCount} cards`}
        </p>
      </div>
    </motion.button>
  );
}
