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

function cardMergeKey(card: DemoOwnedCard["card"]): string {
  return card.cardTraderBlueprintId ?? card.externalId ?? card.name;
}

function cardEntryToOwned(
  entry: ExternalWishlistCardEntry,
  collectionId: string
): DemoOwnedCard {
  const blueprintId = entry.card.id > 0 ? String(entry.card.id) : null;
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

function mergeOwnedInto(
  target: Map<string, DemoOwnedCard>,
  owned: DemoOwnedCard
): void {
  const key = `${owned.collectionId}:${cardMergeKey(owned.card)}`;
  const existing = target.get(key);
  if (!existing) {
    target.set(key, owned);
    return;
  }
  existing.quantity += owned.quantity;
}

/** Merge folder-split DeckVault collections back into one per tab (opa, CARDTRADER, …). */
export function mergeDeckVaultCollectionsByTab(
  backup: DeckVaultBackup
): DeckVaultBackup {
  if (backup.collections.length <= 1) return backup;

  const tabToOldIds = new Map<string, string[]>();

  for (const col of backup.collections) {
    const sep = col.name.indexOf(" · ");
    const tabName = sep >= 0 ? col.name.slice(0, sep).trim() : col.name.trim();
    const list = tabToOldIds.get(tabName) ?? [];
    list.push(col.id);
    tabToOldIds.set(tabName, list);
  }

  if (tabToOldIds.size === backup.collections.length) {
    return backup;
  }

  const oldToNew = new Map<string, string>();
  const collections: DemoCollection[] = [];
  let isFirst = true;

  for (const [tabName] of tabToOldIds) {
    const collectionId = newId();
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

  const merged = new Map<string, DemoOwnedCard>();
  for (const oc of backup.ownedCards) {
    const collectionId = oldToNew.get(oc.collectionId);
    if (!collectionId) continue;
    mergeOwnedInto(merged, { ...oc, collectionId });
  }

  return {
    ...backup,
    collections,
    ownedCards: [...merged.values()],
  };
}

/** Convert CardTrader wishlist JSON — one DeckVault collection per tab, folders merged. */
export function convertExternalWishlistToDeckVault(
  source: ExternalWishlistBackup
): DeckVaultBackup {
  const tabs = source.collection.tabs ?? [];
  const collections: DemoCollection[] = [];
  const mergedCards = new Map<string, DemoOwnedCard>();
  let makeDefault = true;

  for (const tab of tabs) {
    const collectionId = newId();
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
    ownedCards: [...mergedCards.values()],
    tags: [],
  };
}
