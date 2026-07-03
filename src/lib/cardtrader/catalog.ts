import { cardTraderFetch } from "./client";
import type { CardPriceInput, CardTraderBlueprint, CardTraderExpansion, CardTraderGame } from "./types";

const TTL_MS = 24 * 60 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  expires: number;
}

const gameSlugPatterns: Record<string, RegExp[]> = {
  yugioh: [/yu[-\s]?gi[-\s]?oh/i, /yugioh/i],
  pokemon: [/pok[eé]mon/i, /pokemon/i],
  digimon: [/digimon/i],
  onepiece: [/one piece/i],
  lorcana: [/lorcana/i, /disney lorcana/i],
};

let gamesCache: CacheEntry<CardTraderGame[]> | null = null;
const expansionsByGame = new Map<number, CacheEntry<CardTraderExpansion[]>>();
const blueprintsByExpansion = new Map<number, CacheEntry<CardTraderBlueprint[]>>();
const blueprintLookup = new Map<string, number>();
const blueprintImageCache = new Map<number, string>();

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isFresh<T>(entry: CacheEntry<T> | null | undefined): entry is CacheEntry<T> {
  return Boolean(entry && entry.expires > Date.now());
}

async function getGames(): Promise<CardTraderGame[]> {
  if (isFresh(gamesCache)) return gamesCache.data;
  const data = await cardTraderFetch<CardTraderGame[]>("/games");
  gamesCache = { data, expires: Date.now() + TTL_MS };
  return data;
}

export async function resolveCardTraderGameId(gameSlug: string): Promise<number | null> {
  const patterns = gameSlugPatterns[gameSlug];
  if (!patterns) return null;
  const games = await getGames();
  const match = games.find((game) =>
    patterns.some((p) => p.test(game.display_name) || p.test(game.name))
  );
  return match?.id ?? null;
}

async function getExpansions(gameId: number): Promise<CardTraderExpansion[]> {
  const cached = expansionsByGame.get(gameId);
  if (isFresh(cached)) return cached.data;

  const data = await cardTraderFetch<CardTraderExpansion[]>("/expansions", {
    game_id: String(gameId),
  });
  expansionsByGame.set(gameId, { data, expires: Date.now() + TTL_MS });
  return data;
}

async function getBlueprints(expansionId: number): Promise<CardTraderBlueprint[]> {
  const cached = blueprintsByExpansion.get(expansionId);
  if (isFresh(cached)) return cached.data;

  const data = await cardTraderFetch<CardTraderBlueprint[]>("/blueprints/export", {
    expansion_id: String(expansionId),
  });
  for (const blueprint of data) {
    if (blueprint.image_url) {
      blueprintImageCache.set(blueprint.id, blueprint.image_url);
    }
  }
  blueprintsByExpansion.set(expansionId, { data, expires: Date.now() + TTL_MS });
  return data;
}

export function getBlueprintImageUrl(blueprintId: number): string | null {
  return blueprintImageCache.get(blueprintId) ?? null;
}

function scoreExpansion(expansion: CardTraderExpansion, setName?: string | null, setCode?: string | null): number {
  if (!setName && !setCode) return 0;
  const expName = normalize(expansion.name);
  const expCode = normalize(expansion.code ?? "");
  let score = 0;

  if (setCode) {
    const code = normalize(setCode);
    if (expCode === code) score += 100;
    if (expName.includes(code)) score += 40;
  }

  if (setName) {
    const set = normalize(setName);
    if (expName === set) score += 120;
    if (expName.includes(set) || set.includes(expName)) score += 60;
    for (const token of set.split(" ").filter((t) => t.length > 2)) {
      if (expName.includes(token)) score += 8;
    }
  }

  return score;
}

function scoreBlueprint(blueprint: CardTraderBlueprint, cardName: string): number {
  const a = normalize(blueprint.name);
  const b = normalize(cardName);
  if (a === b) return 100;
  if (a.includes(b) || b.includes(a)) return 70;
  return 0;
}

export async function resolveBlueprintId(input: CardPriceInput): Promise<number | null> {
  if (input.blueprintId) return input.blueprintId;

  const cacheKey = `${input.gameSlug}|${input.setName ?? ""}|${input.setCode ?? ""}|${input.name}`;
  const cached = blueprintLookup.get(cacheKey);
  if (cached) return cached;

  const gameId = await resolveCardTraderGameId(input.gameSlug);
  if (!gameId) return null;

  const expansions = await getExpansions(gameId);
  const rankedExpansions = expansions
    .map((expansion) => ({
      expansion,
      score: scoreExpansion(expansion, input.setName, input.setCode),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const candidates =
    rankedExpansions.length > 0
      ? rankedExpansions
      : expansions.slice(0, 2).map((expansion) => ({ expansion, score: 0 }));

  for (const { expansion } of candidates) {
    const blueprints = await getBlueprints(expansion.id);
    const best = blueprints
      .map((blueprint) => ({ blueprint, score: scoreBlueprint(blueprint, input.name) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)[0];

    if (best) {
      blueprintLookup.set(cacheKey, best.blueprint.id);
      if (best.blueprint.image_url) {
        blueprintImageCache.set(best.blueprint.id, best.blueprint.image_url);
      }
      return best.blueprint.id;
    }
  }

  return null;
}

export function buildCardTraderSearchUrl(
  name: string,
  setName?: string | null,
  setCode?: string | null
): string {
  const terms = [name, setName, setCode].filter(Boolean).join(" ").trim();
  return `https://www.cardtrader.com/en/search?query=${encodeURIComponent(terms)}`;
}

/** @deprecated Prefer buildCardTraderSearchUrl — avoids exposing blueprint ids in links */
export function buildCardTraderUrl(gameSlug: string, blueprintId: number): string {
  const gamePath =
    gameSlug === "yugioh"
      ? "yu-gi-oh"
      : gameSlug === "onepiece"
        ? "one-piece"
        : gameSlug;
  return `https://www.cardtrader.com/en/${gamePath}/cards/${blueprintId}`;
}
