import type { CardApiAdapter, CardDetail, CardSearchResult } from "./types";

const API = "https://digimoncard.io/api-public";
const HEADERS = { Accept: "application/json", "User-Agent": "DeckVault/0.2" };

interface DigimonCard {
  name: string;
  id: string;
  type: string;
  rarity: string;
  stage: string;
  color: string;
  set_name?: string[];
  tcgplayer_id?: number | null;
  tcgplayer_name?: string | null;
}

const NON_DIGIMON_SET = /dragon ball|fusion world|one piece|pokemon|magic the gathering|yu-gi-oh|lorcana/i;

function digimonImageUrl(cardId: string): string {
  return `https://images.digimoncard.io/images/cards/${cardId}.jpg`;
}

function isDigimonGameCard(card: DigimonCard): boolean {
  const sets = card.set_name ?? [];
  if (sets.some((s) => NON_DIGIMON_SET.test(s))) return false;
  if (!card.id || !/^[A-Za-z][A-Za-z0-9]*-\d/.test(card.id)) return false;
  return true;
}

function mapDigimonCard(card: DigimonCard): CardSearchResult {
  const setName = card.set_name?.[0] ?? null;
  return {
    externalId: card.id,
    name: card.name,
    setCode: card.id.split("-")[0] ?? null,
    setName,
    collectorNumber: card.id,
    rarity: card.rarity,
    edition: card.stage,
    imageUrl: digimonImageUrl(card.id),
    price: null,
    metadata: {
      type: card.type,
      color: card.color,
      tcgplayer_id: card.tcgplayer_id,
      tcgplayer_name: card.tcgplayer_name,
      sets: card.set_name,
    },
  };
}

export const digimonAdapter: CardApiAdapter = {
  gameSlug: "digimon",

  async search(query: string): Promise<CardSearchResult[]> {
    if (!query.trim()) return [];
    const res = await fetch(
      `${API}/search?n=${encodeURIComponent(query)}&limit=20&series=Digimon Card Game`,
      { headers: HEADERS }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const cards = Array.isArray(data) ? data : [];
    const seen = new Set<string>();
    return (cards as DigimonCard[])
      .filter(isDigimonGameCard)
      .filter((card) => {
        if (seen.has(card.id)) return false;
        seen.add(card.id);
        return true;
      })
      .slice(0, 20)
      .map(mapDigimonCard);
  },

  async getById(externalId: string): Promise<CardDetail | null> {
    const res = await fetch(`${API}/search?card=${encodeURIComponent(externalId)}`, {
      headers: HEADERS,
    });
    if (!res.ok) return null;
    const data = await res.json();
    const card = (Array.isArray(data) ? data[0] : null) as DigimonCard | null;
    if (!card) return null;
    return { ...mapDigimonCard(card), gameSlug: "digimon" };
  },
};
