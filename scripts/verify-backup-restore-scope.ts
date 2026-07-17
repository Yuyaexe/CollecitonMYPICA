import assert from "node:assert/strict";
import {
  ANIME_BACKUP_KIND,
  BACKUP_VERSION,
} from "../src/features/import/services/backup-export";
import { parseBackupFileJson } from "../src/features/import/services/backup-import";

const tcgBackup = {
  version: BACKUP_VERSION,
  exportedAt: "2026-07-17T00:00:00.000Z",
  profile: {},
  collections: [],
  ownedCards: [],
  tags: [],
};

assert.equal(
  parseBackupFileJson(tcgBackup).scope,
  "tcg",
  "Legacy and external TCG backups must not replace local anime data"
);

assert.equal(
  parseBackupFileJson({
    ...tcgBackup,
    animeSeries: [],
    animeCharacters: [],
    animeCharacterCards: [],
  }).scope,
  "full",
  "A complete anime snapshot must be restored even when intentionally empty"
);

assert.equal(
  parseBackupFileJson({
    version: BACKUP_VERSION,
    kind: ANIME_BACKUP_KIND,
    exportedAt: "2026-07-17T00:00:00.000Z",
    animeSeries: [],
    animeCharacters: [],
    animeCharacterCards: [],
  }).scope,
  "anime",
  "Anime-only backups must remain independently restorable"
);

console.log("Backup restore scope checks passed.");
