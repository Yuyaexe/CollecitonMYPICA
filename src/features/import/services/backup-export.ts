import type {
  DemoCollection,
  DemoOwnedCard,
  DemoProfile,
  DemoTag,
} from "@/lib/demo/types";

export const BACKUP_VERSION = "1.0" as const;

export interface DeckVaultBackup {
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  profile: DemoProfile;
  collections: DemoCollection[];
  ownedCards: DemoOwnedCard[];
  wishlistCardIds: string[];
  tags: DemoTag[];
}

export function buildBackupPayload(data: Omit<DeckVaultBackup, "version" | "exportedAt">): DeckVaultBackup {
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    ...data,
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
    wishlistCardIds: state.wishlistCardIds,
    tags: state.tags ?? [],
  });
}
