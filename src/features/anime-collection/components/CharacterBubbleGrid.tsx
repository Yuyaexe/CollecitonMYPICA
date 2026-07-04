"use client";

import type { AnimeCharacter } from "@/features/anime-collection/types";
import { CharacterBubble } from "@/features/anime-collection/components/CharacterBubble";
import { AddCharacterBubble } from "@/features/anime-collection/components/AnimeSeriesCard";

export interface CharacterBubbleGridProps {
  characters: AnimeCharacter[];
  onSelect: (character: AnimeCharacter) => void;
  onAdd: () => void;
}

export function CharacterBubbleGrid({
  characters,
  onSelect,
  onAdd,
}: CharacterBubbleGridProps) {
  return (
    <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
      {characters.map((character, index) => (
        <CharacterBubble
          key={character.id}
          name={character.name}
          imageUrl={character.imageUrl}
          accentColor={character.accentColor}
          index={index}
          onClick={() => onSelect(character)}
        />
      ))}
      <AddCharacterBubble onClick={onAdd} index={characters.length} />
    </div>
  );
}
