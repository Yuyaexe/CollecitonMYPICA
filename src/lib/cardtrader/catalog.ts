import { cardTraderFetch, unwrapCardTraderList } from "./client";
import type { CardPriceInput, CardTraderBlueprint, CardTraderExpansion, CardTraderGame } from "./types";
import type { CardSearchResult } from "@/features/catalog/services/card-api/types";

const SEARCH_RESULT_LIMIT = 24;
const MAX_EXPANSIONS_SCAN = 8;
const PARALLEL_EXPANSION_BATCH = 3;

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
  magic: [/magic/i, /mtg/i, /gathering/i],
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
  const raw = await cardTraderFetch<unknown>("/games");
  const data = unwrapCardTraderList<CardTraderGame>(raw);
  gamesCache = { data, expires: Date.now() + TTL_MS };
  return data;
}

export async function resolveCardTraderGameId(gameSlug: string): Promise<number | null> {
  const patterns = gameSlugPatterns[gameSlug];
  if (!patterns) return null;
  const games = await getGames();

  const slugAliases: Record<string, string[]> = {
    yugioh: ["yu-gi-oh"],
    pokemon: ["pokemon", "pokémon"],
    onepiece: ["one piece"],
    lorcana: ["lorcana", "disney lorcana"],
    magic: ["magic"],
  };

  const aliases = slugAliases[gameSlug] ?? [];

  const ranked = games
    .map((game) => {
      let score = 0;
      const nameNorm = normalize(game.name);
      const displayNorm = normalize(game.display_name);

      for (const alias of aliases) {
        const aliasNorm = normalize(alias);
        if (nameNorm === aliasNorm || displayNorm === aliasNorm) score += 200;
        if (nameNorm.includes(aliasNorm) || displayNorm.includes(aliasNorm)) score += 120;
      }

      for (const pattern of patterns) {
        if (pattern.test(game.display_name) || pattern.test(game.name)) score += 80;
      }

      return { game, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.game.id ?? null;
}

async function getExpansions(gameId: number): Promise<CardTraderExpansion[]> {
  const cached = expansionsByGame.get(gameId);
  if (isFresh(cached)) return cached.data;

  const raw = await cardTraderFetch<unknown>("/expansions", {
    game_id: String(gameId),
  });
  // CardTrader returns all expansions regardless of game_id — filter client-side.
  const data = unwrapCardTraderList<CardTraderExpansion>(raw).filter(
    (expansion) => expansion.game_id === gameId
  );
  expansionsByGame.set(gameId, { data, expires: Date.now() + TTL_MS });
  return data;
}

async function getBlueprints(expansionId: number): Promise<CardTraderBlueprint[]> {
  const cached = blueprintsByExpansion.get(expansionId);
  if (isFresh(cached)) return cached.data;

  const raw = await cardTraderFetch<unknown>("/blueprints/export", {
    expansion_id: String(expansionId),
  });
  const data = unwrapCardTraderList<CardTraderBlueprint>(raw);
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

function scoreBlueprint(
  blueprint: CardTraderBlueprint,
  cardName: string,
  setCode?: string | null,
  rarity?: string | null
): number {
  const a = normalize(blueprint.name);
  const b = normalize(cardName);
  let score = 0;
  if (a === b) score += 100;
  else if (a.includes(b) || b.includes(a)) score += 70;

  if (setCode) {
    const code = normalize(setCode);
    if (a.includes(code)) score += 90;
  }

  if (rarity) {
    const r = normalize(rarity);
    if (a.includes(r)) score += 55;
    for (const token of r.split(" ").filter((t) => t.length > 3)) {
      if (a.includes(token)) score += 12;
    }
  }

  return score;
}

const MIN_BLUEPRINT_SCORE = 72;

export async function resolveBlueprintId(input: CardPriceInput): Promise<number | null> {
  if (input.blueprintId) return input.blueprintId;

  const cacheKey = `${input.gameSlug}|${input.setName ?? ""}|${input.setCode ?? ""}|${input.rarity ?? ""}|${input.name}`;
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
      .map((blueprint) => ({
        blueprint,
        score: scoreBlueprint(blueprint, input.name, input.setCode, input.rarity),
      }))
      .filter((item) => item.score >= MIN_BLUEPRINT_SCORE && item.blueprint.game_id === gameId)
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

function blueprintToSearchResult(
  blueprint: CardTraderBlueprint,
  expansion: CardTraderExpansion
): CardSearchResult {
  if (blueprint.image_url) {
    blueprintImageCache.set(blueprint.id, blueprint.image_url);
  }

  return {
    externalId: String(blueprint.id),
    name: blueprint.name,
    setCode: expansion.code ?? null,
    setName: expansion.name,
    collectorNumber: expansion.code ?? null,
    rarity: blueprint.version ?? null,
    edition: null,
    imageUrl: blueprint.image_url ?? null,
    price: null,
    metadata: {
      priceSource: "cardtrader",
      catalogSource: "cardtrader",
    },
  };
}

function matchesQuery(name: string, terms: string[]): boolean {
  const normalized = normalize(name);
  return terms.every((term) => normalized.includes(term));
}

/** Search CardTrader blueprints by name (scans recent expansions, cached). */
export async function searchCardTraderCatalog(
  gameSlug: string,
  query: string,
  limit = SEARCH_RESULT_LIMIT
): Promise<CardSearchResult[]> {
  const gameId = await resolveCardTraderGameId(gameSlug);
  if (!gameId) return [];

  const terms = normalize(query)
    .split(" ")
    .filter((t) => t.length > 1);
  if (terms.length === 0) return [];

  const expansions = await getExpansions(gameId);
  const ranked = [...expansions].sort((a, b) => b.id - a.id).slice(0, MAX_EXPANSIONS_SCAN);

  const results: CardSearchResult[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < ranked.length; i += PARALLEL_EXPANSION_BATCH) {
    if (results.length >= limit) break;

    const batch = ranked.slice(i, i + PARALLEL_EXPANSION_BATCH);
    const blueprintLists = await Promise.all(batch.map((exp) => getBlueprints(exp.id)));

    for (let j = 0; j < batch.length; j++) {
      const expansion = batch[j];
      const blueprints = blueprintLists[j];

      for (const blueprint of blueprints) {
        if (blueprint.game_id !== gameId) continue;
        if (!matchesQuery(blueprint.name, terms)) continue;

        const dedupeKey = `${blueprint.id}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        results.push(blueprintToSearchResult(blueprint, expansion));
        if (results.length >= limit) break;
      }
      if (results.length >= limit) break;
    }
  }

  return results;
}

export function parseCardTraderBlueprintId(externalId: string | null | undefined): number | null {
  if (!externalId || !/^\d+$/.test(externalId)) return null;
  const id = Number(externalId);
  return Number.isFinite(id) ? id : null;
}
