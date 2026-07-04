import type {
  AnimeCharacterCard,
  DemoCollection,
  DemoOwnedCard,
  DemoProfile,
  DemoTag,
} from "@/lib/demo/types";
import type {
  AnimeCharacter,
  AnimeSeries,
} from "@/features/anime-collection/types";
import { buildSeedState } from "@/features/anime-collection/data/seed-catalog";

export const BACKUP_VERSION = "1.0" as const;

export interface DeckVaultBackup {
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  profile: DemoProfile;
  collections: DemoCollection[];
  ownedCards: DemoOwnedCard[];
  tags: DemoTag[];
  animeSeries: AnimeSeries[];
  animeCharacters: AnimeCharacter[];
  animeCharacterCards: AnimeCharacterCard[];
}

/** Defaults for older backups / CT imports without Anime Collection. */
export function defaultAnimeBackupFields(): Pick<
  DeckVaultBackup,
  "animeSeries" | "animeCharacters" | "animeCharacterCards"
> {
  const seed = buildSeedState();
  return {
    animeSeries: seed.animeSeries,
    animeCharacters: seed.animeCharacters,
    animeCharacterCards: [],
  };
}

export function normalizeAnimeCharacterCards(
  cards: AnimeCharacterCard[] | undefined | null
): AnimeCharacterCard[] {
  const byCharacter = new Map<string, number>();
  return (cards ?? []).map((entry) => {
    const order = entry.sortOrder ?? byCharacter.get(entry.characterId) ?? 0;
    byCharacter.set(entry.characterId, order + 1);
    return {
      ...entry,
      sortOrder: order,
      condition: entry.condition ?? "NM",
      language: entry.language ?? "EN",
      isFoil: entry.isFoil ?? false,
    };
  });
}

export function resolveAnimeBackupFields(
  partial: Partial<
    Pick<DeckVaultBackup, "animeSeries" | "animeCharacters" | "animeCharacterCards">
  >
): Pick<DeckVaultBackup, "animeSeries" | "animeCharacters" | "animeCharacterCards"> {
  const defaults = defaultAnimeBackupFields();
  return {
    animeSeries:
      Array.isArray(partial.animeSeries) && partial.animeSeries.length > 0
        ? partial.animeSeries
        : defaults.animeSeries,
    animeCharacters:
      Array.isArray(partial.animeCharacters) && partial.animeCharacters.length > 0
        ? partial.animeCharacters
        : defaults.animeCharacters,
    animeCharacterCards: normalizeAnimeCharacterCards(partial.animeCharacterCards),
  };
}

export function buildBackupPayload(
  data: Omit<DeckVaultBackup, "version" | "exportedAt">
): DeckVaultBackup {
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    ...data,
    ...resolveAnimeBackupFields(data),
  };
}

export function downloadBackup(backup: DeckVaultBackup) {
  const date = backup.exportedAt.slice(0, 10);
  const filename = `deckvault_backup_${date}.json`;
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function fetchBackupFromServer(): Promise<DeckVaultBackup> {
  const res = await fetch("/api/app/state");
  if (!res.ok) {
    throw new Error("Could not load collection data for backup");
  }
  const state = await res.json();
  return buildBackupPayload({
    profile: state.profile,
    collections: state.collections,
    ownedCards: state.ownedCards,
    tags: state.tags ?? [],
    animeSeries: state.animeSeries ?? [],
    animeCharacters: state.animeCharacters ?? [],
    animeCharacterCards: state.animeCharacterCards ?? [],
  });
}
