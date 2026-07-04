"use client";

import { useMemo } from "react";
import { useDemoStore } from "@/lib/demo/store";
import type { AnimeCharacter, AnimeSeries } from "@/features/anime-collection/types";

export function useAnimeCollection() {
  const animeSeries = useDemoStore((s) => s.animeSeries);
  const animeCharacters = useDemoStore((s) => s.animeCharacters);
  const addAnimeSeries = useDemoStore((s) => s.addAnimeSeries);
  const renameAnimeSeries = useDemoStore((s) => s.renameAnimeSeries);
  const deleteAnimeSeries = useDemoStore((s) => s.deleteAnimeSeries);
  const addAnimeCharacter = useDemoStore((s) => s.addAnimeCharacter);
  const renameAnimeCharacter = useDemoStore((s) => s.renameAnimeCharacter);
  const deleteAnimeCharacter = useDemoStore((s) => s.deleteAnimeCharacter);

  const sortedSeries = useMemo(
    () => [...animeSeries].sort((a, b) => a.sortOrder - b.sortOrder),
    [animeSeries]
  );

  const characterCountBySeries = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of animeCharacters) {
      map.set(c.seriesId, (map.get(c.seriesId) ?? 0) + 1);
    }
    return map;
  }, [animeCharacters]);

  function getSeriesBySlug(slug: string): AnimeSeries | undefined {
    return animeSeries.find((s) => s.slug === slug);
  }

  function getCharactersForSeries(seriesId: string): AnimeCharacter[] {
    return animeCharacters
      .filter((c) => c.seriesId === seriesId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  function getCharacterById(id: string): AnimeCharacter | undefined {
    return animeCharacters.find((c) => c.id === id);
  }

  return {
    animeSeries: sortedSeries,
    animeCharacters,
    characterCountBySeries,
    getSeriesBySlug,
    getCharactersForSeries,
    getCharacterById,
    addAnimeSeries,
    renameAnimeSeries,
    deleteAnimeSeries,
    addAnimeCharacter,
    renameAnimeCharacter,
    deleteAnimeCharacter,
  };
}
