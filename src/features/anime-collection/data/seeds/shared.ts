import { getDlPortrait } from "@/features/anime-collection/data/seed-image-urls";

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

export function seedChar(name: string, accentColor: string) {
  return {
    name,
    imageUrl: getDlPortrait(name),
    accentColor,
  };
}
