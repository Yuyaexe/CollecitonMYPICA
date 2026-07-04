"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CardImage } from "@/components/shared/CardImage";
import { getCharacterInitials } from "@/features/anime-collection/types";

export interface CharacterBubbleProps {
  name: string;
  imageUrl?: string | null;
  accentColor?: string | null;
  onClick: () => void;
  index?: number;
}

export function CharacterBubble({
  name,
  imageUrl,
  accentColor,
  onClick,
  index = 0,
}: CharacterBubbleProps) {
  const initials = getCharacterInitials(name);

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      whileHover={{ scale: 1.04, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "group flex flex-col items-center gap-2 p-1",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-full"
      )}
      aria-label={`Open ${name}`}
    >
      <div
        className={cn(
          "relative h-[88px] w-[88px] overflow-hidden rounded-full border-2 border-border/80",
          "transition-[border-color,box-shadow] duration-200",
          "group-hover:border-primary group-hover:shadow-[0_0_16px_hsla(221,83%,53%,0.25)]"
        )}
        style={
          !imageUrl && accentColor
            ? { background: `linear-gradient(135deg, ${accentColor}, hsl(0 0% 16%))` }
            : undefined
        }
      >
        {imageUrl ? (
          <CardImage src={imageUrl} alt={name} fill sizes="88px" className="object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-lg font-semibold text-white/90">
            {initials}
          </span>
        )}
      </div>
      <span className="max-w-[96px] text-center text-xs leading-tight text-muted-foreground group-hover:text-foreground">
        {name}
      </span>
    </motion.button>
  );
}
