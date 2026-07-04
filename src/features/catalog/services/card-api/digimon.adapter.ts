import type { CardApiAdapter, CardDetail, CardSearchResult } from "./types";
import { stripNestedPrintMetadata } from "@/features/catalog/services/serialize-search-results";
import {
  buildDigimonCollectorNumber,
  digimonVariantKey,
  parseDigimonVariant,
  resolveDigimonCardTraderRarity,
  splitDigimonCardId,
} from "./digimon.utils";

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
  const variant = parseDigimonVariant(card.id, card.tcgplayer_name);
  const collectorNumber = buildDigimonCollectorNumber(card.id, variant.collectorSuffix);
  const setName = card.set_name?.[0] ?? null;

  return {
    externalId: card.tcgplayer_id != null ? String(card.tcgplayer_id) : collectorNumber,
    name: card.name,
    setCode: card.id.split("-")[0] ?? null,
    setName,
    collectorNumber,
    rarity: card.rarity,
    edition: variant.label ?? card.stage ?? null,
    imageUrl: digimonImageUrl(card.id),
    price: null,
    metadata: {
      type: card.type,
      color: card.color,
      cardId: card.id,
      tcgplayer_id: card.tcgplayer_id,
      tcgplayer_name: card.tcgplayer_name,
      variantLabel: variant.label,
      cardTraderRarityHint: resolveDigimonCardTraderRarity(card.rarity, variant),
      sets: card.set_name,
    },
  };
}

function digimonPrintRefs(prints: CardSearchResult[]): CardSearchResult[] {
  return prints.map((print) => ({
    ...print,
    metadata: stripNestedPrintMetadata(print.metadata),
  }));
}

function groupDigimonSearchResults(cards: DigimonCard[]): CardSearchResult[] {
  const byCardId = new Map<string, CardSearchResult[]>();

  for (const card of cards) {
    const mapped = mapDigimonCard(card);
    const groupKey = card.id.toUpperCase();
    const group = byCardId.get(groupKey) ?? [];
    group.push(mapped);
    byCardId.set(groupKey, group);
  }

  const results: CardSearchResult[] = [];
  for (const prints of byCardId.values()) {
    const primary = prints[0]!;
    if (prints.length > 1) {
      primary.metadata = {
        ...primary.metadata,
        digimonPrints: digimonPrintRefs(prints),
      };
    }
    results.push(primary);
  }

  return results;
}

function pickDigimonPrint(
  prints: CardSearchResult[],
  externalId: string
): CardSearchResult {
  if (/^\d+$/.test(externalId)) {
    const byTcg = prints.find((print) => print.externalId === externalId);
    if (byTcg) return byTcg;
  }

  const normalized = externalId.toLowerCase();
  const byCollector = prints.find(
    (print) => print.collectorNumber?.toLowerCase() === normalized
  );
  if (byCollector) return byCollector;

  const { suffix } = splitDigimonCardId(externalId);
  if (suffix) {
    const bySuffix = prints.find((print) =>
      print.collectorNumber?.toLowerCase().endsWith(suffix)
    );
    if (bySuffix) return bySuffix;
  }

  return prints[0];
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
        if (!isDigimonGameCard(card)) continue;
        const key = digimonVariantKey(card);
        if (seen.has(key)) continue;
        seen.add(key);
        collected.push(card);
      }
    };

    if (DIGIMON_CARD_ID.test(trimmed)) {
      const { baseId } = splitDigimonCardId(trimmed);
      addCards(await fetchDigimonCards(`/search?card=${encodeURIComponent(baseId)}`));
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

    return groupDigimonSearchResults(collected).slice(0, 20);
  },

  async getById(externalId: string): Promise<CardDetail | null> {
    const lookupId = DIGIMON_CARD_ID.test(externalId)
      ? splitDigimonCardId(externalId).baseId
      : externalId;

    const cards = await fetchDigimonCards(`/search?card=${encodeURIComponent(lookupId)}`);
    const valid = cards.filter(isDigimonGameCard);
    if (valid.length === 0) return null;

    const prints = valid.map(mapDigimonCard);
    const primary = pickDigimonPrint(prints, externalId);

    if (prints.length > 1) {
      primary.metadata = {
        ...primary.metadata,
        digimonPrints: digimonPrintRefs(prints),
      };
    }

    return { ...primary, gameSlug: "digimon" };
  },
};
