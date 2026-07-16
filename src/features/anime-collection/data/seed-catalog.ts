import type { AnimeCharacter, AnimeSeries } from "@/features/anime-collection/types";
import { getDlPortrait } from "@/features/anime-collection/data/seed-image-urls";
import { ANIME_SEED } from "@/features/anime-collection/data/seeds";

export type { AnimeSeedSeries } from "@/features/anime-collection/data/seeds/shared";
export { ANIME_SEED };

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

const CHARACTER_NAME_ALIASES: Record<string, string> = {
  "maximilian pegasus": "maximillion pegasus",
  "ryo bakura": "yami bakura",
};

function characterNamesMatch(a: string, b: string): boolean {
  const left = a.toLowerCase();
  const right = b.toLowerCase();
  if (left === right) return true;
  return (
    CHARACTER_NAME_ALIASES[left] === right || CHARACTER_NAME_ALIASES[right] === left
  );
}

function backfillImagesByName(
  animeCharacters: AnimeCharacter[],
  seedCharacters: AnimeCharacter[]
): AnimeCharacter[] {
  return animeCharacters.map((character) => {
    const seedMatch = seedCharacters.find(
      (seed) =>
        seed.seriesId === character.seriesId &&
        characterNamesMatch(character.name, seed.name)
    );
    if (!seedMatch) return character;
    return {
      ...character,
      imageUrl: character.imageUrl ?? seedMatch.imageUrl ?? getDlPortrait(character.name),
      accentColor: character.accentColor ?? seedMatch.accentColor,
    };
  });
}

export function mergeAnimeSeedIntoState(state: {
  animeSeries: AnimeSeries[];
  animeCharacters: AnimeCharacter[];
}): {
  animeSeries: AnimeSeries[];
  animeCharacters: AnimeCharacter[];
} {
  const seed = buildSeedState();
  let animeSeries = [...(state.animeSeries ?? [])];
  let animeCharacters = [...(state.animeCharacters ?? [])];

  const seriesById = new Map(animeSeries.map((s) => [s.id, s]));
  const seriesBySlug = new Map(animeSeries.map((s) => [s.slug, s]));

  for (const seedSeries of seed.animeSeries) {
    const existingBySlug = seriesBySlug.get(seedSeries.slug);
    const skipInsert =
      existingBySlug &&
      !existingBySlug.isSeeded &&
      existingBySlug.id !== seedSeries.id;

    if (skipInsert) continue;

    const existingById = seriesById.get(seedSeries.id);
    if (existingById) {
      animeSeries = animeSeries.map((s) =>
        s.id === seedSeries.id
          ? {
              ...s,
              coverImageUrl: s.coverImageUrl ?? seedSeries.coverImageUrl,
              coverColor: s.coverColor ?? seedSeries.coverColor,
            }
          : s
      );
    } else if (!existingBySlug) {
      animeSeries.push(seedSeries);
      seriesById.set(seedSeries.id, seedSeries);
      seriesBySlug.set(seedSeries.slug, seedSeries);
    }
  }

  const charById = new Map(animeCharacters.map((c) => [c.id, c]));

  const namesInSeries = (seriesId: string) =>
    new Set(
      animeCharacters.filter((c) => c.seriesId === seriesId).map((c) => c.name.toLowerCase())
    );

  for (const seedChar of seed.animeCharacters) {
    const seriesExists = animeSeries.some((s) => s.id === seedChar.seriesId);
    if (!seriesExists) continue;

    const existingById = charById.get(seedChar.id);
    if (existingById) {
      if (characterNamesMatch(existingById.name, seedChar.name)) {
        animeCharacters = animeCharacters.map((c) =>
          c.id === seedChar.id
            ? {
                ...c,
                imageUrl: c.imageUrl ?? seedChar.imageUrl,
                accentColor: c.accentColor ?? seedChar.accentColor,
              }
            : c
        );
      }
      continue;
    }

    const seriesNames = namesInSeries(seedChar.seriesId);
    if (seriesNames.has(seedChar.name.toLowerCase())) {
      animeCharacters = animeCharacters.map((c) =>
        c.seriesId === seedChar.seriesId &&
        c.name.toLowerCase() === seedChar.name.toLowerCase()
          ? {
              ...c,
              imageUrl: c.imageUrl ?? seedChar.imageUrl,
              accentColor: c.accentColor ?? seedChar.accentColor,
            }
          : c
      );
      continue;
    }

    animeCharacters.push(seedChar);
    charById.set(seedChar.id, seedChar);
  }

  animeCharacters = backfillImagesByName(animeCharacters, seed.animeCharacters);

  return { animeSeries, animeCharacters };
}
