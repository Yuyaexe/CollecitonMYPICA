#!/usr/bin/env node
/**
 * Convert CardTrader wishlist JSON (backupVersion: 1) to DeckVault backup format.
 *
 * Usage:
 *   node scripts/convert-external-backup.mjs input.json [output.json]
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
      if (entry.pricing?.cheapestPriceCents != null && entry.pricing?.cheapestPriceCurrency === "BRL") {
        return "BRL";
      }
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

function collectionLabel(tabName, folderLabel, multipleTabs) {
  const folder = folderLabel.trim() || "Sem pasta";
  if (!multipleTabs) return folder;
  const tab = tabName.trim() || "Coleção";
  return `${tab} · ${folder}`;
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

function processFolder(folder, tabName, multipleTabs, collections, ownedCards, makeDefault) {
  const collectionId = randomUUID();
  collections.push({
    id: collectionId,
    name: collectionLabel(tabName, folder.label, multipleTabs),
    isDefault: makeDefault.value,
    isFavorite: makeDefault.value,
    coverImageUrl: null,
  });
  makeDefault.value = false;

  for (const item of folder.items) {
    if (item.type === "folder") {
      processFolder(item, tabName, multipleTabs, collections, ownedCards, makeDefault);
    } else if (item.card?.name) {
      ownedCards.push(cardEntryToOwned(item, collectionId));
    }
  }
}

function convert(source) {
  const tabs = source.collection.tabs ?? [];
  const multipleTabs = tabs.length > 1;
  const collections = [];
  const ownedCards = [];
  const makeDefault = { value: true };

  for (const tab of tabs) {
    const looseCards = [];

    for (const item of tab.items) {
      if (item.type === "folder") {
        processFolder(item, tab.name, multipleTabs, collections, ownedCards, makeDefault);
      } else if (item.card?.name) {
        looseCards.push(item);
      }
    }

    if (looseCards.length > 0) {
      const collectionId = randomUUID();
      collections.push({
        id: collectionId,
        name: tab.name.trim() || "Coleção",
        isDefault: makeDefault.value,
        isFavorite: makeDefault.value,
        coverImageUrl: null,
      });
      makeDefault.value = false;
      for (const entry of looseCards) {
        ownedCards.push(cardEntryToOwned(entry, collectionId));
      }
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
    ownedCards,
    tags: [],
  };
}

function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("Uso: node scripts/convert-external-backup.mjs <input.json> [output.json]");
    process.exitCode = 1;
    return;
  }

  const outputPath =
    process.argv[3] ??
    resolve(
      process.cwd(),
      `deckvault_backup_${new Date().toISOString().slice(0, 10)}.json`
    );

  let raw;
  try {
    raw = JSON.parse(readFileSync(resolve(inputPath), "utf8"));
  } catch (err) {
    console.error(`Erro ao ler ${inputPath}:`, err.message);
    process.exitCode = 1;
    return;
  }

  if (!isExternalWishlistBackup(raw)) {
    console.error(
      "JSON não reconhecido. Esperado backupVersion: 1 com collection.tabs (export CardTrader/wishlist)."
    );
    process.exitCode = 1;
    return;
  }

  const backup = convert(raw);
  writeFileSync(outputPath, JSON.stringify(backup, null, 2), "utf8");

  console.log(`Backup DeckVault salvo em: ${outputPath}`);
  console.log(
    `${backup.ownedCards.length} cartas · ${backup.collections.length} coleções · moeda ${backup.profile.currency}`
  );
}

main();
