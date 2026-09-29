"use client";

import { use } from "react";
import { CharacterDetailPage } from "@/features/anime-collection/components/CharacterDetailPage";

export default function AnimeCharacterDetailPage({
  params,
}: {
  params: Promise<{ seriesSlug: string; characterId: string }>;
}) {
  const { seriesSlug, characterId } = use(params);

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <CharacterDetailPage seriesSlug={seriesSlug} characterId={characterId} />
    </div>
  );
}
