import type { CardApiAdapter, CardDetail, CardSearchResult, CatalogSearchOptions, YugiohCardApiAdapter } from "./types";
import { rankSearchResults } from "@/features/catalog/services/search-ranking";
import {
  applyYgoAdvancedClientFilters,
  buildYgoAdvancedSearchParams,
  hasActiveYgoAdvancedFilters,
  type YgoRawCard,
  type YugiohAdvancedSearchFilters,
} from "@/lib/yugioh/advanced-search";
import {
  buildYugiohSearchQueries,
  normalizeYugiohSearchQuery,
} from "@/lib/yugioh/search-query";

const API = "https://db.ygoprodeck.com/api/v7";
const HEADERS = { Accept: "application/json", "User-Agent": "DeckVault/0.2" };
const YGO_RESULT_CAP = 80;

interface YgoCard extends YgoRawCard {}

function mapYgoCard(card: YgoCard, preferredSetCode?: string | null): CardSearchResult {
  const preferred = preferredSetCode?.toUpperCase();
  const primarySet =
    (preferred
      ? card.card_sets?.find((entry) => entry.set_code.toUpperCase() === preferred)
      : undefined) ?? card.card_sets?.[0];
  const prices = card.card_prices?.[0];
  const tcgPrice = prices?.tcgplayer_price ? parseFloat(prices.tcgplayer_price) : null;
  const image =
    card.card_images?.[0]?.image_url_small ??
    card.card_images?.[0]?.image_url ??
    `https://images.ygoprodeck.com/images/cards/${card.id}.jpg`;

  return {
    externalId: String(card.id),
    name: card.name,
    setCode: primarySet?.set_code ?? null,
    setName: primarySet?.set_name ?? null,
    collectorNumber: primarySet?.set_code ?? null,
    rarity: primarySet?.set_rarity ?? null,
    edition: primarySet?.set_rarity_code ?? null,
    imageUrl: image,
    price: tcgPrice,
    metadata: {
      type: card.type,
      race: card.race,
      attribute: card.attribute,
      level: card.level,
      sets: card.card_sets,
      prices: card.card_prices,
    },
  };
}

async function fetchYgoCards(params: string): Promise<YgoCard[]> {
  const res = await fetch(`${API}/cardinfo.php?${params}`, { headers: HEADERS });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data.data) ? (data.data as YgoCard[]) : [];
}

async function fetchYgoAdvancedCards(
  filters: YugiohAdvancedSearchFilters,
  options?: CatalogSearchOptions
): Promise<YgoCard[]> {
  const localeOpts = options?.locale ? { locale: options.locale } : undefined;
  const setNames = filters.cardSets;

  if (setNames.length <= 1) {
    const params = buildYgoAdvancedSearchParams(filters, {
      ...localeOpts,
      cardSet: setNames[0] ?? null,
    });
    const cards = await fetchYgoCards(params);
    return applyYgoAdvancedClientFilters(cards, filters);
  }

  const seen = new Map<number, YgoCard>();
  const batchSize = 3;
  for (let i = 0; i < setNames.length; i += batchSize) {
    const batch = setNames.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (setName) => {
        const params = buildYgoAdvancedSearchParams(filters, {
          ...localeOpts,
          cardSet: setName,
        });
        return fetchYgoCards(params);
      })
    );
    for (const cards of results) {
      for (const card of cards) {
        seen.set(card.id, card);
      }
    }
  }

  return applyYgoAdvancedClientFilters([...seen.values()], filters);
}

export const yugiohAdapter: YugiohCardApiAdapter = {
  gameSlug: "yugioh",

  async searchByNameOnly(query: string, options?: CatalogSearchOptions): Promise<CardSearchResult[]> {
    return this.search(query, options);
  },

  async getBySetNumber(setNumber: string): Promise<CardDetail | null> {
    const normalized = setNumber.trim().toUpperCase();
    if (!normalized) return null;

    const cards = await fetchYgoCards(`num=${encodeURIComponent(normalized)}`);
    const card = cards[0];
    if (!card) return null;

    return { ...mapYgoCard(card, normalized), gameSlug: "yugioh" };
  },

  async search(query: string, options?: CatalogSearchOptions): Promise<CardSearchResult[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const localePt = options?.locale === "pt";

    for (const fname of buildYugiohSearchQueries(trimmed)) {
      const params = new URLSearchParams();
      params.set("fname", fname);
      if (localePt) params.set("language", "pt");

      const cards = await fetchYgoCards(params.toString());
      if (cards.length === 0) continue;

      const mapped = cards.map((card) => mapYgoCard(card));
      return rankSearchResults(trimmed, mapped).slice(0, YGO_RESULT_CAP);
    }

    // Archetype fallback (e.g. "B.E.S." cards that share the archetype name)
    const archetype = normalizeYugiohSearchQuery(trimmed);
    if (archetype) {
      const params = new URLSearchParams();
      params.set("archetype", archetype);
      if (localePt) params.set("language", "pt");
      const cards = await fetchYgoCards(params.toString());
      if (cards.length > 0) {
        const mapped = cards.map((card) => mapYgoCard(card));
        return rankSearchResults(trimmed, mapped).slice(0, YGO_RESULT_CAP);
      }
    }

    return [];
  },

  async advancedSearch(
    filters: YugiohAdvancedSearchFilters,
    options?: CatalogSearchOptions
  ): Promise<CardSearchResult[]> {
    if (!hasActiveYgoAdvancedFilters(filters)) return [];

    const cards = await fetchYgoAdvancedCards(filters, options);
    const mapped = cards.map((card) => mapYgoCard(card));
    const keyword = filters.keyword.trim();
    const ranked = keyword ? rankSearchResults(keyword, mapped) : mapped;
    return ranked;
  },

  async getById(externalId: string): Promise<CardDetail | null> {
    const res = await fetch(`${API}/cardinfo.php?id=${externalId}`, { headers: HEADERS });
    if (!res.ok) return null;
    const data = await res.json();
    const card = data.data?.[0] as YgoCard | undefined;
    if (!card) return null;
    return { ...mapYgoCard(card), gameSlug: "yugioh" };
  },
};
