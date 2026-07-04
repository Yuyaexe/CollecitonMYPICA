import type { AnimeCharacter, AnimeSeries } from "@/features/anime-collection/types";

export interface AnimeSeedSeries {
  name: string;
  slug: string;
  coverImageUrl: string | null;
  coverColor?: string;
  characters: Array<{
    name: string;
    imageUrl: string | null;
    accentColor?: string;
  }>;
}

export const ANIME_SEED: AnimeSeedSeries[] = [
  {
    name: "Yu-Gi-Oh!",
    slug: "yugioh",
    coverImageUrl: null,
    coverColor: "#1e3a5f",
    characters: [
      { name: "Yugi Muto", imageUrl: null, accentColor: "#4a1d6e" },
      { name: "Seto Kaiba", imageUrl: null, accentColor: "#1a365d" },
      { name: "Joey Wheeler", imageUrl: null, accentColor: "#7c2d12" },
      { name: "Téa Gardner", imageUrl: null, accentColor: "#831843" },
      { name: "Tristan Taylor", imageUrl: null, accentColor: "#365314" },
      { name: "Ryo Bakura", imageUrl: null, accentColor: "#374151" },
      { name: "Mai Valentine", imageUrl: null, accentColor: "#701a75" },
      { name: "Maximilian Pegasus", imageUrl: null, accentColor: "#713f12" },
    ],
  },
  {
    name: "Yu-Gi-Oh! GX",
    slug: "yugioh-gx",
    coverImageUrl: null,
    coverColor: "#14532d",
    characters: [
      { name: "Jaden Yuki", imageUrl: null, accentColor: "#b45309" },
      { name: "Chazz Princeton", imageUrl: null, accentColor: "#1e3a8a" },
      { name: "Alexis Rhodes", imageUrl: null, accentColor: "#be185d" },
      { name: "Syrus Truesdale", imageUrl: null, accentColor: "#0369a1" },
      { name: "Zane Truesdale", imageUrl: null, accentColor: "#334155" },
      { name: "Aster Phoenix", imageUrl: null, accentColor: "#7c3aed" },
    ],
  },
];

export function buildSeedState(): {
  animeSeries: AnimeSeries[];
  animeCharacters: AnimeCharacter[];
} {
  const animeSeries: AnimeSeries[] = [];
  const animeCharacters: AnimeCharacter[] = [];

  ANIME_SEED.forEach((series, seriesIndex) => {
    const seriesId = `seed-series-${series.slug}`;
    animeSeries.push({
      id: seriesId,
      name: series.name,
      slug: series.slug,
      coverImageUrl: series.coverImageUrl,
      coverColor: series.coverColor ?? null,
      isSeeded: true,
      sortOrder: seriesIndex,
    });

    series.characters.forEach((character, charIndex) => {
      animeCharacters.push({
        id: `seed-char-${series.slug}-${charIndex}`,
        seriesId,
        name: character.name,
        imageUrl: character.imageUrl,
        accentColor: character.accentColor ?? null,
        isSeeded: true,
        sortOrder: charIndex,
      });
    });
  });

  return { animeSeries, animeCharacters };
}

export function slugifyAnimeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
