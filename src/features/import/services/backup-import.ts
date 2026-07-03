import {
  BACKUP_VERSION,
  type DeckVaultBackup,
} from "@/features/import/services/backup-export";
import {
  convertExternalWishlistToDeckVault,
  isExternalWishlistBackup,
  mergeDeckVaultCollectionsByTab,
} from "@/features/import/services/external-wishlist-converter";

export function parseBackupJson(raw: unknown): DeckVaultBackup {
  if (!raw || typeof raw !== "object") {
    throw new Error("Arquivo JSON inválido");
  }

  if (isExternalWishlistBackup(raw)) {
    return convertExternalWishlistToDeckVault(raw);
  }

  const backup = raw as DeckVaultBackup;

  if (backup.version !== BACKUP_VERSION) {
    throw new Error(`Versão de backup não suportada: ${String(backup.version)}`);
  }
  if (!backup.profile || !Array.isArray(backup.collections) || !Array.isArray(backup.ownedCards)) {
    throw new Error("Estrutura de backup incompleta");
  }

  const normalized: DeckVaultBackup = {
    version: BACKUP_VERSION,
    exportedAt: backup.exportedAt ?? new Date().toISOString(),
    profile: backup.profile,
    collections: backup.collections,
    ownedCards: backup.ownedCards,
    tags: backup.tags ?? [],
  };

  return mergeDeckVaultCollectionsByTab(normalized);
}

export async function readBackupFile(file: File): Promise<DeckVaultBackup> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Arquivo não é um JSON válido");
  }
  return parseBackupJson(parsed);
}

export async function restoreBackupOnServer(backup: DeckVaultBackup) {
  const res = await fetch("/api/app/backup/restore", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ backup }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error ?? "Falha ao restaurar backup");
  }
  return json as { importedCards: number; collections: number };
}
