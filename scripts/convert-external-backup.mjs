#!/usr/bin/env node
/**
 * Convert CardTrader wishlist JSON (backupVersion: 1) to DeckVault backup format.
 * One collection per tab — all folders merged.
 *
 * Usage:
 *   node scripts/convert-external-backup.mjs input.json [output.json]
 *   node scripts/convert-external-backup.mjs --merge deckvault_backup.json
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

const YGO = {
  id: "a0000000-0000-4000-8000-000000000001",
  slug: "yugioh",
  name: "Yu-Gi-Oh!",
};

const RARITY_SLUGS = [
  ["quarter-century-secret-rare", "Quarter Century Secret Rare"],
  ["gold-secret-rare", "Gold Secret Rare"],
  ["starlight-rare", "Starlight Rare"],
  ["collectors-rare", "Collector's Rare"],
  ["ultimate-rare", "Ultimate Rare"],
  ["secret-rare", "Secret Rare"],
  ["ultra-rare", "Ultra Rare"],
  ["super-rare", "Super Rare"],
  ["starfoil-rare", "Starfoil Rare"],
  ["shatterfoil-rare", "Shatterfoil Rare"],
  ["ghost-rare", "Ghost Rare"],
  ["common", "Common"],
  ["rare", "Rare"],
];

function isExternalWishlistBackup(raw) {
  return (
    raw &&
    typeof raw === "object" &&
    raw.backupVersion === 1 &&
    raw.collection &&
    Array.isArray(raw.collection.tabs)
  );
}

function isDeckVaultBackup(raw) {
  return raw && typeof raw === "object" && raw.version === "1.0" && Array.isArray(raw.collections);
}

function rarityFromDetailUrl(url) {
  if (!url) return null;
  const slug = url.split("/").pop()?.toLowerCase() ?? "";
  for (const [needle, label] of RARITY_SLUGS) {
    if (slug.includes(needle)) return label;
  }
  return null;
}

function detectCurrency(tabs) {
  for (const tab of tabs) {
    for (const entry of walkItems(tab.items)) {
      if (entry.pricing?.cheapestPriceCurrency === "BRL") return "BRL";
    }
  }
  return "USD";
}

function* walkItems(items) {
  for (const item of items) {
    if (item.type === "folder") {
      yield* walkItems(item.items);
    } else if (item.card?.name) {
      yield item;
    }
  }
}

function cardMergeKey(card) {
  return card.cardTraderBlueprintId ?? card.externalId ?? card.name;
}

function cardEntryToOwned(entry, collectionId) {
  const blueprintId = entry.card.id > 0 ? String(entry.card.id) : null;
  const imageUrl = entry.card.card_images?.[0]?.image_url ?? null;
  const cents = entry.pricing?.cheapestPriceCents;
  const marketPrice =
    cents != null && Number.isFinite(cents) ? cents / 100 : null;
  const cardId = randomUUID();

  return {
    id: randomUUID(),
    collectionId,
    cardId,
    card: {
      id: cardId,
      gameId: YGO.id,
      gameSlug: YGO.slug,
      gameName: YGO.name,
      externalId: blueprintId,
      name: entry.card.name,
      setCode: null,
      setName: entry.card.expansion?.name ?? null,
      collectorNumber: null,
      rarity: rarityFromDetailUrl(entry.pricing?.detailUrl),
      imageUrl,
      marketPrice,
      cardTraderBlueprintId: blueprintId,
    },
    quantity: Math.max(1, entry.quantity ?? 1),
    condition: "NM",
    language: "EN",
    isFoil: false,
    purchasePrice: null,
    notes: entry.owned === false ? "Lista de desejos" : null,
    tagIds: [],
  };
}

function mergeOwnedInto(target, owned) {
  const key = `${owned.collectionId}:${cardMergeKey(owned.card)}`;
  const existing = target.get(key);
  if (!existing) {
    target.set(key, owned);
    return;
  }
  existing.quantity += owned.quantity;
}

function mergeDeckVaultCollectionsByTab(backup) {
  if (backup.collections.length <= 1) return backup;

  const tabToOldIds = new Map();
  for (const col of backup.collections) {
    const sep = col.name.indexOf(" · ");
    const tabName = sep >= 0 ? col.name.slice(0, sep).trim() : col.name.trim();
    const list = tabToOldIds.get(tabName) ?? [];
    list.push(col.id);
    tabToOldIds.set(tabName, list);
  }

  if (tabToOldIds.size === backup.collections.length) return backup;

  const oldToNew = new Map();
  const collections = [];
  let isFirst = true;

  for (const tabName of tabToOldIds.keys()) {
    const collectionId = randomUUID();
    collections.push({
      id: collectionId,
      name: tabName,
      isDefault: isFirst,
      isFavorite: isFirst,
      coverImageUrl: null,
    });
    for (const oldId of tabToOldIds.get(tabName) ?? []) {
      oldToNew.set(oldId, collectionId);
    }
    isFirst = false;
  }

  const merged = new Map();
  for (const oc of backup.ownedCards) {
    const collectionId = oldToNew.get(oc.collectionId);
    if (!collectionId) continue;
    mergeOwnedInto(merged, { ...oc, collectionId });
  }

  return { ...backup, collections, ownedCards: [...merged.values()] };
}

function convert(source) {
  const tabs = source.collection.tabs ?? [];
  const collections = [];
  const mergedCards = new Map();
  let makeDefault = true;

  for (const tab of tabs) {
    const collectionId = randomUUID();
    const tabName = tab.name.trim() || "Coleção";
    collections.push({
      id: collectionId,
      name: tabName,
      isDefault: makeDefault,
      isFavorite: makeDefault,
      coverImageUrl: null,
    });
    makeDefault = false;

    for (const entry of walkItems(tab.items)) {
      mergeOwnedInto(mergedCards, cardEntryToOwned(entry, collectionId));
    }
  }

  return {
    version: "1.0",
    exportedAt: source.exportedAt ?? new Date().toISOString(),
    profile: {
      displayName: "Collector",
      currency: detectCurrency(tabs),
      theme: "dark",
      defaultGameId: YGO.id,
    },
    collections,
    ownedCards: [...mergedCards.values()],
    tags: [],
  };
}

function main() {
  const mergeOnly = process.argv[2] === "--merge";
  const inputPath = mergeOnly ? process.argv[3] : process.argv[2];

  if (!inputPath) {
    console.error(
      "Uso:\n  node scripts/convert-external-backup.mjs <wishlist.json> [output.json]\n  node scripts/convert-external-backup.mjs --merge <deckvault_backup.json> [output.json]"
    );
    process.exitCode = 1;
    return;
  }

  const outputPath =
    process.argv[mergeOnly ? 4 : 3] ??
    resolve(
      process.cwd(),
      mergeOnly
        ? `deckvault_backup_merged_${new Date().toISOString().slice(0, 10)}.json`
        : `deckvault_backup_${new Date().toISOString().slice(0, 10)}.json`
    );

  let raw;
  try {
    raw = JSON.parse(readFileSync(resolve(inputPath), "utf8"));
  } catch (err) {
    console.error(`Erro ao ler ${inputPath}:`, err.message);
    process.exitCode = 1;
    return;
  }

  let backup;
  if (mergeOnly) {
    if (!isDeckVaultBackup(raw)) {
      console.error("Arquivo não é um backup DeckVault (version 1.0).");
      process.exitCode = 1;
      return;
    }
    backup = mergeDeckVaultCollectionsByTab(raw);
  } else if (isExternalWishlistBackup(raw)) {
    backup = convert(raw);
  } else if (isDeckVaultBackup(raw)) {
    backup = mergeDeckVaultCollectionsByTab(raw);
  } else {
    console.error(
      "JSON não reconhecido. Use wishlist (backupVersion: 1) ou backup DeckVault."
    );
    process.exitCode = 1;
    return;
  }

  writeFileSync(outputPath, JSON.stringify(backup, null, 2), "utf8");

  console.log(`Backup DeckVault salvo em: ${outputPath}`);
  console.log(
    `${backup.ownedCards.length} cartas · ${backup.collections.length} coleções · moeda ${backup.profile.currency}`
  );
  console.log("Coleções:", backup.collections.map((c) => c.name).join(", "));
}

main();
