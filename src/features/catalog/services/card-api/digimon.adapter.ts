import type { CardApiAdapter, CardDetail, CardSearchResult } from "./types";

const API = "https://digimoncard.io/api-public";
const HEADERS = { Accept: "application/json", "User-Agent": "DeckVault/0.2" };
const DIGIMON_CARD_ID = /^[A-Za-z][A-Za-z0-9]*-\d+\w*$/i;

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

/** digimoncard.io returns 400 when the query contains ":" — strip it before searching. */
function normalizeDigimonQuery(query: string): string {
  return query
    .replace(/:/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

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

async function fetchDigimonCards(path: string): Promise<DigimonCard[]> {
  const res = await fetch(`${API}${path}`, { headers: HEADERS });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? (data as DigimonCard[]) : [];
}

export const digimonAdapter: CardApiAdapter = {
  gameSlug: "digimon",

  async search(query: string): Promise<CardSearchResult[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const collected: DigimonCard[] = [];
    const seen = new Set<string>();

    const addCards = (cards: DigimonCard[]) => {
      for (const card of cards) {
        if (!isDigimonGameCard(card) || seen.has(card.id)) continue;
        seen.add(card.id);
        collected.push(card);
      }
    };

    if (DIGIMON_CARD_ID.test(trimmed)) {
      addCards(await fetchDigimonCards(`/search?card=${encodeURIComponent(trimmed)}`));
    }

    const normalized = normalizeDigimonQuery(trimmed);
    const nameQueries = normalized === trimmed ? [normalized] : [normalized, trimmed];

    for (const nameQuery of nameQueries) {
      if (!nameQuery) continue;
      const cards = await fetchDigimonCards(
        `/search?n=${encodeURIComponent(nameQuery)}&limit=20&series=Digimon Card Game`
      );
      if (cards.length > 0) {
        addCards(cards);
        break;
      }
    }

    return collected.slice(0, 20).map(mapDigimonCard);
  },

  async getById(externalId: string): Promise<CardDetail | null> {
    const cards = await fetchDigimonCards(`/search?card=${encodeURIComponent(externalId)}`);
    const card = cards.find(isDigimonGameCard) ?? null;
    if (!card) return null;
    return { ...mapDigimonCard(card), gameSlug: "digimon" };
  },
};
