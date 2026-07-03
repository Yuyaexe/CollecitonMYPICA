import type { CardApiAdapter, CardDetail, CardSearchResult } from "./types";

const API = "https://db.ygoprodeck.com/api/v7";
const HEADERS = { Accept: "application/json", "User-Agent": "DeckVault/0.2" };

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

function mapYgoCard(card: YgoCard): CardSearchResult {
  const primarySet = card.card_sets?.[0];
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
    rarity: primarySet?.set_rarity ?? card.type,
    edition: primarySet?.set_rarity_code ?? null,
    imageUrl: image,
    price: tcgPrice,
    metadata: { type: card.type, sets: card.card_sets, prices: card.card_prices },
  };
}

export const yugiohAdapter: CardApiAdapter = {
  gameSlug: "yugioh",

  async search(query: string): Promise<CardSearchResult[]> {
    if (!query.trim()) return [];
    const res = await fetch(
      `${API}/cardinfo.php?fname=${encodeURIComponent(query)}`,
      { headers: HEADERS }
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.data) return [];
    return (data.data as YgoCard[]).slice(0, 20).map(mapYgoCard);
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
