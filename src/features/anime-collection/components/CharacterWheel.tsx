"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { AnimeCharacter } from "@/features/anime-collection/types";
import { CharacterBubble } from "@/features/anime-collection/components/CharacterBubble";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useT } from "@/lib/i18n/context";

export interface CharacterWheelProps {
  characters: AnimeCharacter[];
  activeCharacterId: string;
  seriesSlug: string;
}

export function CharacterWheel({
  characters,
  activeCharacterId,
  seriesSlug,
}: CharacterWheelProps) {
  const t = useT();
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeCharacterId]);

  if (characters.length <= 1) return null;

  return (
    <div
      ref={scrollRef}
      role="list"
      aria-label={t("anime.switchCharacter")}
      className="mx-auto mb-6 w-full max-w-5xl overflow-x-auto px-2 pb-2 [-ms-overflow-style:none] [scrollbar-width:thin]"
    >
      <div className="flex min-w-min items-end justify-center gap-4 px-2">
        {characters.map((character, index) => {
          const selected = character.id === activeCharacterId;

          return (
            <div
              key={character.id}
              ref={selected ? activeRef : undefined}
              role="listitem"
              className="shrink-0"
            >
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <div>
                    <CharacterBubble
                      name={character.name}
                      imageUrl={character.imageUrl}
                      accentColor={character.accentColor}
                      variant="wheel"
                      selected={selected}
                      showName={false}
                      index={index}
                      onClick={() =>
                        router.push(
                          `/anime-collection/${seriesSlug}/${character.id}`
                        )
                      }
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">{character.name}</TooltipContent>
              </Tooltip>
            </div>
          );
        })}
      </div>
    </div>
  );
}
