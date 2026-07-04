import type { CardApiAdapter, CardDetail, CardSearchResult, YugiohCardApiAdapter } from "./types";

const API = "https://db.ygoprodeck.com/api/v7";
const HEADERS = { Accept: "application/json", "User-Agent": "DeckVault/0.2" };
const YGO_RESULT_CAP = 80;

interface YgoCard {
  id: number;
  name: string;
  type: string;
  card_sets?: {
    set_name: string;
    set_code: string;
    set_rarity: string;
    set_rarity_code: string;
    set_price: string;
  }[];
  card_prices?: {
    tcgplayer_price: string;
    cardmarket_price: string;
    ebay_price: string;
  }[];
  card_images?: { image_url: string; image_url_small: string }[];
}

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
    metadata: { type: card.type, sets: card.card_sets, prices: card.card_prices },
  };
}

async function fetchYgoCards(params: string): Promise<YgoCard[]> {
  const res = await fetch(`${API}/cardinfo.php?${params}`, { headers: HEADERS });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data.data) ? (data.data as YgoCard[]) : [];
}

function mergeYgoCards(...lists: YgoCard[][]): YgoCard[] {
  const byId = new Map<number, YgoCard>();
  for (const list of lists) {
    for (const card of list) {
      if (!byId.has(card.id)) byId.set(card.id, card);
    }
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export const yugiohAdapter: YugiohCardApiAdapter = {
  gameSlug: "yugioh",

  async searchByNameOnly(query: string): Promise<CardSearchResult[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const cards = await fetchYgoCards(`fname=${encodeURIComponent(trimmed)}`);
    return cards.slice(0, YGO_RESULT_CAP).map((card) => mapYgoCard(card));
  },

  async getBySetNumber(setNumber: string): Promise<CardDetail | null> {
    const normalized = setNumber.trim().toUpperCase();
    if (!normalized) return null;

    const cards = await fetchYgoCards(`num=${encodeURIComponent(normalized)}`);
    const card = cards[0];
    if (!card) return null;

    return { ...mapYgoCard(card, normalized), gameSlug: "yugioh" };
  },

  async search(query: string): Promise<CardSearchResult[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const encoded = encodeURIComponent(trimmed);
    const [byName, byDesc] = await Promise.all([
      fetchYgoCards(`fname=${encoded}`),
      fetchYgoCards(`desc=${encoded}`),
    ]);

    return mergeYgoCards(byName, byDesc)
      .slice(0, YGO_RESULT_CAP)
      .map((card) => mapYgoCard(card));
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
