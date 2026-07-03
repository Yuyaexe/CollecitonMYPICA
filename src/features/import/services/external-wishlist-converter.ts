import {
  BACKUP_VERSION,
  type DeckVaultBackup,
} from "@/features/import/services/backup-export";
import {
  createInitialDemoState,
  DEMO_GAMES,
  type DemoCollection,
  type DemoOwnedCard,
} from "@/lib/demo/types";
import type { Currency } from "@/types/tcg";

/** CardTrader wishlist / binder export (backupVersion: 1). */
export interface ExternalWishlistBackup {
  backupVersion: number;
  exportedAt?: string;
  collection: {
    activeTabId?: string;
    tabs: ExternalWishlistTab[];
  };
  ui?: Record<string, unknown>;
}

interface ExternalWishlistTab {
  id: string;
  name: string;
  items: ExternalWishlistItem[];
}

type ExternalWishlistItem = ExternalWishlistFolder | ExternalWishlistCardEntry;

interface ExternalWishlistFolder {
  type: "folder";
  id: string;
  label: string;
  description?: string;
  imageDataUrl?: string;
  items: ExternalWishlistItem[];
}

interface ExternalWishlistCardEntry {
  card: {
    id: number;
    name: string;
    card_images?: Array<{ image_url?: string }>;
    expansion?: { id?: number | null; name?: string };
  };
  pricing?: {
    priceLabel?: string;
    detailUrl?: string;
    cheapestPriceCents?: number | null;
    cheapestPriceCurrency?: string;
  };
  owned?: boolean;
  quantity?: number;
}

const YGO = DEMO_GAMES[0];

const RARITY_SLUGS: Array<[string, string]> = [
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

export function isExternalWishlistBackup(raw: unknown): raw is ExternalWishlistBackup {
  if (!raw || typeof raw !== "object") return false;
  const obj = raw as Record<string, unknown>;
  if (obj.backupVersion !== 1) return false;
  const collection = obj.collection;
  if (!collection || typeof collection !== "object") return false;
  return Array.isArray((collection as { tabs?: unknown }).tabs);
}

function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function rarityFromDetailUrl(url: string | undefined): string | null {
  if (!url) return null;
  const slug = url.split("/").pop()?.toLowerCase() ?? "";
  for (const [needle, label] of RARITY_SLUGS) {
    if (slug.includes(needle)) return label;
  }
  return null;
}

function detectCurrency(tabs: ExternalWishlistTab[]): Currency {
  for (const tab of tabs) {
    for (const entry of walkItems(tab.items)) {
      if (entry.pricing?.cheapestPriceCurrency === "BRL") return "BRL";
    }
  }
  return "USD";
}

function* walkItems(items: ExternalWishlistItem[]): Generator<ExternalWishlistCardEntry> {
  for (const item of items) {
    if ("type" in item && item.type === "folder") {
      yield* walkItems(item.items);
    } else if ("card" in item && item.card?.name) {
      yield item;
    }
  }
}

function collectionLabel(
  tabName: string,
  folderLabel: string,
  multipleTabs: boolean
): string {
  const folder = folderLabel.trim() || "Sem pasta";
  if (!multipleTabs) return folder;
  const tab = tabName.trim() || "Coleção";
  return `${tab} · ${folder}`;
}

function cardEntryToOwned(
  entry: ExternalWishlistCardEntry,
  collectionId: string
): DemoOwnedCard {
  const blueprintId =
    entry.card.id > 0 ? String(entry.card.id) : null;
  const imageUrl = entry.card.card_images?.[0]?.image_url ?? null;
  const cents = entry.pricing?.cheapestPriceCents;
  const marketPrice =
    cents != null && Number.isFinite(cents) ? cents / 100 : null;
  const cardId = newId();

  return {
    id: newId(),
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

function processFolder(
  folder: ExternalWishlistFolder,
  tabName: string,
  multipleTabs: boolean,
  collections: DemoCollection[],
  ownedCards: DemoOwnedCard[],
  makeDefault: { value: boolean }
): void {
  const collectionId = newId();
  const name = collectionLabel(tabName, folder.label, multipleTabs);
  collections.push({
    id: collectionId,
    name,
    isDefault: makeDefault.value,
    isFavorite: makeDefault.value,
    coverImageUrl: null,
  });
  makeDefault.value = false;

  for (const item of folder.items) {
    if ("type" in item && item.type === "folder") {
      processFolder(item, tabName, multipleTabs, collections, ownedCards, makeDefault);
    } else if ("card" in item && item.card?.name) {
      ownedCards.push(cardEntryToOwned(item, collectionId));
    }
  }
}

/** Convert CardTrader wishlist JSON into a DeckVault backup payload. */
export function convertExternalWishlistToDeckVault(
  source: ExternalWishlistBackup
): DeckVaultBackup {
  const tabs = source.collection.tabs ?? [];
  const multipleTabs = tabs.length > 1;
  const collections: DemoCollection[] = [];
  const ownedCards: DemoOwnedCard[] = [];
  const makeDefault = { value: true };

  for (const tab of tabs) {
    const looseCards: ExternalWishlistCardEntry[] = [];

    for (const item of tab.items) {
      if ("type" in item && item.type === "folder") {
        processFolder(item, tab.name, multipleTabs, collections, ownedCards, makeDefault);
      } else if ("card" in item && item.card?.name) {
        looseCards.push(item);
      }
    }

    if (looseCards.length > 0) {
      const collectionId = newId();
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

  if (collections.length === 0) {
    const initial = createInitialDemoState();
    return {
      version: BACKUP_VERSION,
      exportedAt: source.exportedAt ?? new Date().toISOString(),
      profile: {
        ...initial.profile,
        currency: detectCurrency(tabs),
      },
      collections: initial.collections,
      ownedCards: [],
      tags: [],
    };
  }

  const initial = createInitialDemoState();

  return {
    version: BACKUP_VERSION,
    exportedAt: source.exportedAt ?? new Date().toISOString(),
    profile: {
      ...initial.profile,
      currency: detectCurrency(tabs),
    },
    collections,
    ownedCards,
    tags: [],
  };
}
