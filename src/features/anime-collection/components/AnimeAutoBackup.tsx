"use client";

import { useAnimeAutoBackup } from "@/features/anime-collection/hooks/useAnimeAutoBackup";

/** Watches anime collection changes and downloads a JSON backup automatically. */
export function AnimeAutoBackup() {
  useAnimeAutoBackup();
  return null;
}
