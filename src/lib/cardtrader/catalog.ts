import { cardTraderFetch, unwrapCardTraderList } from "./client";
import type { CardPriceInput, CardTraderBlueprint, CardTraderExpansion, CardTraderGame } from "./types";
import type { CardSearchResult } from "@/features/catalog/services/card-api/types";
import { resolveRarityStyle } from "@/lib/rarity/resolve-rarity";
import {
  isCardTraderLostArtPromosExpansion,
  isYugiohLostArtCode,
  yugiohCollectorNumbersMatch,
  yugiohSetPrefix,
  yugiohSetCodeLooksLike,
} from "@/lib/yugioh/set-code";
import {
  isDigimonTcgPlayerExternalId,
  normalizeDigimonSetCode,
  splitDigimonCardId,
} from "@/features/catalog/services/card-api/digimon.utils";
import { normalizeCardTraderImageUrl } from "./images";

const SEARCH_RESULT_LIMIT = 24;
/** Supplemental merge (Digimon/YGO/Pokemon + CT) — keep fast. */
const MERGE_MAX_EXPANSIONS = 10;
/** Legacy constant — no CT-primary games in DeckVault. */
export const CARDTRADER_PRIMARY_MAX_EXPANSIONS = 48;
const PARALLEL_EXPANSION_BATCH = 4;

export type CardTraderSearchOptions = {
  limit?: number;
  maxExpansions?: number;
};

const TTL_MS = 24 * 60 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  expires: number;
}

const gameSlugPatterns: Record<string, RegExp[]> = {
  yugioh: [/yu[-\s]?gi[-\s]?oh/i, /yugioh/i],
  pokemon: [/pok[eé]mon/i, /pokemon/i],
  digimon: [/digimon/i],
};

let gamesCache: CacheEntry<CardTraderGame[]> | null = null;
const expansionsByGame = new Map<number, CacheEntry<CardTraderExpansion[]>>();
const blueprintsByExpansion = new Map<number, CacheEntry<CardTraderBlueprint[]>>();
const blueprintLookup = new Map<string, number>();
const blueprintImageCache = new Map<number, string>();
const blueprintSlugCache = new Map<number, string>();

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
    cacheBlueprintImage(blueprint.id, blueprint.image_url);
  }
  blueprintsByExpansion.set(expansionId, { data, expires: Date.now() + TTL_MS });
  return data;
}

function cacheBlueprintImage(blueprintId: number, imageUrl?: string | null): void {
  const normalized = normalizeCardTraderImageUrl(imageUrl);
  if (!normalized) return;
  blueprintImageCache.set(blueprintId, normalized);
  cacheBlueprintSlug(blueprintId, normalized);
}

export function getBlueprintImageUrl(blueprintId: number): string | null {
  return normalizeCardTraderImageUrl(blueprintImageCache.get(blueprintId) ?? null);
}

function slugifyForCardTrader(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Extract numeric blueprint id from CardTrader CDN image URLs. */
export function extractBlueprintIdFromImageUrl(
  imageUrl: string | null | undefined
): number | null {
  const slug = extractCardTraderSlugFromImageUrl(imageUrl);
  if (!slug) return null;
  const id = Number(slug.split("-")[0]);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/** Yu-Gi-Oh Konami passcodes are 8 digits — not CardTrader blueprint ids. */
function isLikelyYugiohPasscodeDigits(externalId: string, imageUrl?: string | null): boolean {
  if (!/^\d{7,10}$/.test(externalId)) return false;
  if (imageUrl && /cardtrader\.com|product-images\.cardtrader/i.test(imageUrl)) return false;
  if (imageUrl?.includes("ygoprodeck.com")) return true;
  return externalId.length >= 8;
}

function isPlausibleCardTraderBlueprintId(id: number): boolean {
  if (!Number.isFinite(id) || id <= 0) return false;
  if (id >= 10_000_000 && id <= 99_999_999) return false;
  return true;
}

function digimonBlueprintIdIsTcgPlayerId(input: CardPriceInput, id: number): boolean {
  if (input.gameSlug !== "digimon") return false;
  if (input.tcgPlayerId && Number(input.tcgPlayerId) === id) return true;
  return false;
}

/**
 * Blueprint id stored on owned cards — ignores Yu-Gi-Oh passcodes mistaken for blueprint ids.
 * Prefers explicit cardTraderBlueprintId, then CardTrader CDN image slug, then short numeric externalId.
 */
export function resolveStoredBlueprintId(
  externalId: string | null | undefined,
  imageUrl?: string | null,
  cardTraderBlueprintId?: string | null,
  gameSlug?: string | null
): number | null {
  const explicit = parseCardTraderBlueprintId(cardTraderBlueprintId);
  if (explicit != null && isPlausibleCardTraderBlueprintId(explicit)) {
    if (
      gameSlug === "digimon" &&
      isDigimonTcgPlayerExternalId(cardTraderBlueprintId, "digimon") &&
      explicit === Number(cardTraderBlueprintId)
    ) {
      // Previously saved tcgplayer id as blueprint id — ignore.
    } else {
      return explicit;
    }
  }

  const fromImage = extractBlueprintIdFromImageUrl(imageUrl);
  if (fromImage != null) return fromImage;

  if (!externalId || !/^\d+$/.test(externalId)) return null;
  if (isLikelyYugiohPasscodeDigits(externalId, imageUrl)) return null;
  if (gameSlug === "digimon" && isDigimonTcgPlayerExternalId(externalId, gameSlug)) {
    return null;
  }

  const id = Number(externalId);
  return isPlausibleCardTraderBlueprintId(id) ? id : null;
}

/** Extract `{id}-{slug}` from CardTrader CDN blueprint image URLs. */
export function extractCardTraderSlugFromImageUrl(
  imageUrl: string | null | undefined
): string | null {
  if (!imageUrl) return null;
  const match = imageUrl.match(/blueprints\/(\d+-[^/?#]+)/i);
  return match?.[1] ?? null;
}

function cacheBlueprintSlug(blueprintId: number, imageUrl?: string | null): void {
  const slug = extractCardTraderSlugFromImageUrl(imageUrl);
  if (slug) blueprintSlugCache.set(blueprintId, slug);
}

export function getBlueprintProductSlug(blueprintId: number): string | null {
  return blueprintSlugCache.get(blueprintId) ?? null;
}

/** Direct product page — e.g. /en/cards/201101-speedroid-scratch-secret-rare-brothers-of-legend */
export function buildCardTraderCardUrl(input: {
  blueprintId: number;
  name: string;
  setName?: string | null;
  rarity?: string | null;
  imageUrl?: string | null;
}): string {
  const cached = getBlueprintProductSlug(input.blueprintId);
  const fromImage = cached ?? extractCardTraderSlugFromImageUrl(input.imageUrl);
  if (fromImage) {
    return `https://www.cardtrader.com/en/cards/${fromImage}`;
  }

  const parts = [slugifyForCardTrader(input.name)];
  if (input.rarity?.trim()) parts.push(slugifyForCardTrader(input.rarity));
  if (input.setName?.trim()) parts.push(slugifyForCardTrader(input.setName));

  return `https://www.cardtrader.com/en/cards/${input.blueprintId}-${parts.join("-")}`;
}

export function resolveCardTraderProductUrl(params: {
  name: string;
  gameSlug?: string | null;
  externalId?: string | null;
  cardTraderBlueprintId?: string | null;
  setName?: string | null;
  setCode?: string | null;
  rarity?: string | null;
  imageUrl?: string | null;
}): string {
  let blueprintId = resolveStoredBlueprintId(
    params.externalId,
    params.imageUrl,
    params.cardTraderBlueprintId,
    params.gameSlug
  );
  if (
    blueprintId != null &&
    !cardTraderBlueprintMatchesCard(blueprintId, {
      rarity: params.rarity,
      gameSlug: params.gameSlug,
      imageUrl: params.imageUrl,
      setCode: params.setCode,
    })
  ) {
    blueprintId = null;
  }
  if (blueprintId != null) {
    return buildCardTraderCardUrl({
      blueprintId,
      name: params.name,
      setName: params.setName,
      rarity: params.rarity,
      imageUrl: params.imageUrl,
    });
  }
  return buildCardTraderSearchUrl(params.name, params.setName);
}

function scoreExpansion(
  expansion: CardTraderExpansion,
  setName?: string | null,
  setCode?: string | null,
  gameSlug?: string | null
): number {
  if (!setName && !setCode) return 0;
  const expName = normalize(expansion.name);
  const expCode = normalize(expansion.code ?? "");
  let score = 0;

  if (gameSlug === "yugioh") {
    const prefix = yugiohSetPrefix(setCode);
    const expansionCode = (expansion.code ?? "").toUpperCase();

    if (prefix && expansionCode === prefix) {
      score += 180;
    }

    if (isYugiohLostArtCode(setCode)) {
      if (isCardTraderLostArtPromosExpansion(expansion.name)) {
        score += 250;
      }
      if (/\b20\d{2}\b/.test(expName)) {
        score -= 120;
      }
      if (setName && /\b20\d{2}\b/.test(normalize(setName))) {
        return score;
      }
    }
  }

  const normInputCode = normalizeDigimonSetCode(setCode);
  const normExpCode = normalizeDigimonSetCode(expansion.code);
  if (normInputCode && normExpCode && normInputCode === normExpCode) {
    score += 100;
  }

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
    if (normInputCode) {
      const setNorm = normalizeDigimonSetCode(setName.split(":")[0]);
      if (setNorm && normExpCode && setNorm === normExpCode) score += 50;
    }
  }

  return score;
}

function normalizeCollectorNumber(value: string): string {
  return value.toLowerCase().replace(/\s/g, "");
}

function tcgPlayerIdsMatch(
  blueprintId: string | number | null | undefined,
  targetId: string
): boolean {
  if (blueprintId == null || !targetId.trim()) return false;
  return String(blueprintId) === String(targetId).trim();
}

function blueprintCollectorNumber(blueprint: CardTraderBlueprint): string | null {
  const fromFixed = blueprint.fixed_properties?.collector_number;
  if (typeof fromFixed === "string" && fromFixed.trim()) return fromFixed.trim();
  return null;
}

type BlueprintScoreInput = Pick<
  CardPriceInput,
  "name" | "setCode" | "rarity" | "collectorNumber" | "variantLabel" | "gameSlug"
>;

function blueprintRarityText(blueprint: CardTraderBlueprint): string {
  return (blueprint.version?.trim() || blueprint.name).trim();
}

/** Reject QSCR blueprints when looking up SCR (and similar strict Yu-Gi-Oh! pairs). */
export function yugiohBlueprintRarityMatches(
  blueprint: CardTraderBlueprint,
  inputRarity: string
): boolean {
  const inputCode = resolveRarityStyle(inputRarity, "yugioh").code;
  const bpText = blueprintRarityText(blueprint);
  const bpCode = resolveRarityStyle(bpText, "yugioh").code;

  if (bpCode !== "?" && inputCode !== "?") {
    return bpCode === inputCode;
  }

  const haystack = normalize(bpText);
  const inputNorm = normalize(inputRarity);

  if (inputCode === "QSCR") {
    return haystack.includes("quarter century") || haystack.includes(inputNorm);
  }
  if (inputCode === "SCR") {
    if (haystack.includes("quarter century")) return false;
    if (haystack.includes("prismatic secret")) return false;
    if (haystack.includes("gold secret")) return false;
    if (haystack.includes("platinum secret")) return false;
    return haystack.includes("secret") || haystack.includes(inputNorm);
  }

  return haystack.includes(inputNorm) || bpCode === inputCode;
}

function storedBlueprintMatchesInput(
  blueprintId: number,
  input: Pick<CardPriceInput, "rarity" | "gameSlug" | "imageUrl" | "setCode">
): boolean {
  if (input.gameSlug !== "yugioh" || !input.rarity?.trim()) return true;

  const slug =
    getBlueprintProductSlug(blueprintId) ??
    extractCardTraderSlugFromImageUrl(input.imageUrl);
  if (!slug) return false;

  const slugNorm = slug.toLowerCase().replace(/-/g, " ");

  if (isYugiohLostArtCode(input.setCode)) {
    if (/\b20\d{2}\b/.test(slugNorm)) return false;
    if (!slugNorm.includes("lost art promo")) return false;
    return true;
  }

  const inputCode = resolveRarityStyle(input.rarity, "yugioh").code;
  if (inputCode === "QSCR") return slugNorm.includes("quarter century");
  if (inputCode === "SCR") {
    return slugNorm.includes("secret") && !slugNorm.includes("quarter century");
  }

  const inputNorm = normalize(input.rarity);
  return slugNorm.includes(inputNorm.replace(/\s+/g, " "));
}

/** Validates a stored blueprint id against card set/rarity (sync + URL fallback). */
export function cardTraderBlueprintMatchesCard(
  blueprintId: number,
  card: {
    rarity?: string | null;
    gameSlug?: string | null;
    imageUrl?: string | null;
    setCode?: string | null;
  }
): boolean {
  return storedBlueprintMatchesInput(blueprintId, {
    rarity: card.rarity,
    gameSlug: card.gameSlug ?? "",
    imageUrl: card.imageUrl,
    setCode: card.setCode,
  });
}

function scoreBlueprint(blueprint: CardTraderBlueprint, input: BlueprintScoreInput): number {
  if (input.gameSlug === "yugioh" && input.rarity?.trim()) {
    if (!yugiohBlueprintRarityMatches(blueprint, input.rarity)) return 0;
  }

  const a = normalize(blueprint.name);
  const b = normalize(input.name);
  let score = 0;
  if (a === b) score += 100;
  else if (a.includes(b) || b.includes(a)) score += 70;

  const blueprintCollector = blueprintCollectorNumber(blueprint);
  const collectorRef = input.collectorNumber ?? input.setCode;
  if (collectorRef && blueprintCollector) {
    const numbersMatch =
      input.gameSlug === "yugioh"
        ? yugiohCollectorNumbersMatch(collectorRef, blueprintCollector)
        : normalizeCollectorNumber(collectorRef) === normalizeCollectorNumber(blueprintCollector);
    if (numbersMatch) {
      return 250;
    }
  }

  if (input.setCode) {
    const code = normalize(input.setCode);
    if (a.includes(code)) score += 90;
    const normCode = normalizeDigimonSetCode(input.setCode);
    if (normCode && a.includes(normCode.replace(/(\d+)/, "-$1"))) score += 40;
  }

  if (input.collectorNumber) {
    const { baseId, suffix } = splitDigimonCardId(input.collectorNumber);
    const collectorNorm = normalize(baseId);
    if (a.includes(collectorNorm)) score += 95;
    if (suffix) {
      if (a.includes("alternate art") || a.includes("alt art")) score += 85;
      if (blueprint.version && normalize(blueprint.version).includes("alternate")) score += 70;
    } else if (!a.includes("alternate art") && !a.includes("alt art")) {
      score += 20;
    }
  }

  if (input.variantLabel) {
    const variant = normalize(input.variantLabel);
    if (a.includes(variant)) score += 80;
    if (blueprint.version && normalize(blueprint.version).includes(variant)) score += 65;
  }

  if (input.rarity) {
    const r = normalize(input.rarity);
    if (a.includes(r)) score += 55;
    if (blueprint.version && normalize(blueprint.version).includes(r)) score += 50;
    for (const token of r.split(" ").filter((t) => t.length > 3)) {
      if (a.includes(token)) score += 12;
      if (blueprint.version?.toLowerCase().includes(token)) score += 10;
    }
  }

  return score;
}

const MIN_BLUEPRINT_SCORE = 72;

async function resolveBlueprintByTcgPlayerId(
  tcgPlayerId: string,
  gameId: number,
  setCode?: string | null
): Promise<number | null> {
  const expansions = await getExpansions(gameId);
  let ranked = [...expansions].sort((a, b) => b.id - a.id);

  const normSet = normalizeDigimonSetCode(setCode);
  if (normSet) {
    const matched = ranked.filter(
      (expansion) => normalizeDigimonSetCode(expansion.code) === normSet
    );
    if (matched.length > 0) {
      ranked = [...matched, ...ranked.filter((expansion) => !matched.includes(expansion))];
    }
  }

  for (const expansion of ranked.slice(0, 12)) {
    const blueprints = await getBlueprints(expansion.id);
    const match = blueprints.find(
      (blueprint) =>
        blueprint.game_id === gameId && tcgPlayerIdsMatch(blueprint.tcg_player_id, tcgPlayerId)
    );
    if (match) {
      cacheBlueprintImage(match.id, match.image_url);
      return match.id;
    }
  }

  return null;
}

async function resolveBlueprintByCollectorNumber(
  collectorNumber: string,
  gameId: number,
  setCode?: string | null,
  gameSlug?: string | null
): Promise<number | null> {
  const expansions = await getExpansions(gameId);

  let candidates = expansions;

  if (gameSlug === "yugioh") {
    const prefix = yugiohSetPrefix(setCode ?? collectorNumber);
    if (prefix) {
      const byPrefix = expansions.filter(
        (expansion) => (expansion.code ?? "").toUpperCase() === prefix
      );
      if (byPrefix.length > 0) candidates = byPrefix;
    }
    if (isYugiohLostArtCode(setCode ?? collectorNumber)) {
      const lostArtPromos = expansions.filter((expansion) =>
        isCardTraderLostArtPromosExpansion(expansion.name)
      );
      if (lostArtPromos.length > 0) candidates = lostArtPromos;
    }
  } else {
    const normSet = normalizeDigimonSetCode(setCode);
    if (normSet) {
      const filtered = expansions.filter(
        (expansion) => normalizeDigimonSetCode(expansion.code) === normSet
      );
      if (filtered.length > 0) candidates = filtered;
    }
  }

  const ranked = [...candidates].sort(
    (a, b) =>
      scoreExpansion(b, null, setCode ?? collectorNumber, gameSlug) -
      scoreExpansion(a, null, setCode ?? collectorNumber, gameSlug)
  );

  for (const expansion of ranked) {
    const blueprints = await getBlueprints(expansion.id);
    const match = blueprints.find((blueprint) => {
      if (blueprint.game_id !== gameId) return false;
      const cn = blueprintCollectorNumber(blueprint);
      if (!cn) return false;
      if (gameSlug === "yugioh") {
        return yugiohCollectorNumbersMatch(collectorNumber, cn);
      }
      return normalizeCollectorNumber(cn) === normalizeCollectorNumber(collectorNumber);
    });
    if (match) {
      cacheBlueprintImage(match.id, match.image_url);
      return match.id;
    }
  }

  return null;
}

export async function resolveBlueprintId(input: CardPriceInput): Promise<number | null> {
  const fromDedicated = parseCardTraderBlueprintId(input.cardTraderBlueprintId);
  if (fromDedicated != null && isPlausibleCardTraderBlueprintId(fromDedicated)) {
    if (
      !digimonBlueprintIdIsTcgPlayerId(input, fromDedicated) &&
      storedBlueprintMatchesInput(fromDedicated, input)
    ) {
      return fromDedicated;
    }
  }

  if (input.imageUrl) {
    const fromImage = extractBlueprintIdFromImageUrl(input.imageUrl);
    if (fromImage != null && storedBlueprintMatchesInput(fromImage, input)) {
      return fromImage;
    }
  }

  if (
    input.blueprintId != null &&
    isPlausibleCardTraderBlueprintId(input.blueprintId) &&
    !digimonBlueprintIdIsTcgPlayerId(input, input.blueprintId) &&
    storedBlueprintMatchesInput(input.blueprintId, input)
  ) {
    return input.blueprintId;
  }

  const cacheKey = [
    input.gameSlug,
    input.setName ?? "",
    input.setCode ?? "",
    input.collectorNumber ?? "",
    input.rarity ?? "",
    input.variantLabel ?? "",
    input.tcgPlayerId ?? "",
    input.name,
  ].join("|");
  const cached = blueprintLookup.get(cacheKey);
  if (cached) return cached;

  const gameId = await resolveCardTraderGameId(input.gameSlug);
  if (!gameId) return null;

  if (input.tcgPlayerId) {
    const fromTcg = await resolveBlueprintByTcgPlayerId(
      input.tcgPlayerId,
      gameId,
      input.setCode
    );
    if (fromTcg != null) {
      blueprintLookup.set(cacheKey, fromTcg);
      return fromTcg;
    }
  }

  const collectorRef = input.collectorNumber ?? input.setCode;
  const shouldResolveByCollector =
    collectorRef &&
    (input.gameSlug === "yugioh"
      ? yugiohSetCodeLooksLike(collectorRef)
      : /-\d/.test(collectorRef));

  if (shouldResolveByCollector) {
    const fromCollector = await resolveBlueprintByCollectorNumber(
      collectorRef,
      gameId,
      input.setCode ?? collectorRef,
      input.gameSlug
    );
    if (fromCollector != null) {
      blueprintLookup.set(cacheKey, fromCollector);
      return fromCollector;
    }
  }

  const expansions = await getExpansions(gameId);
  const rankedExpansions = expansions
    .map((expansion) => ({
      expansion,
      score: scoreExpansion(expansion, input.setName, input.setCode, input.gameSlug),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const candidates =
    rankedExpansions.length > 0
      ? rankedExpansions
      : expansions.slice(0, 2).map((expansion) => ({ expansion, score: 0 }));

  const blueprintInput: BlueprintScoreInput = {
    name: input.name,
    setCode: input.setCode,
    rarity: input.rarity,
    collectorNumber: input.collectorNumber,
    variantLabel: input.variantLabel,
    gameSlug: input.gameSlug,
  };

  for (const { expansion } of candidates) {
    const blueprints = await getBlueprints(expansion.id);
    const best = blueprints
      .map((blueprint) => ({
        blueprint,
        score: scoreBlueprint(blueprint, blueprintInput),
      }))
      .filter((item) => item.score >= MIN_BLUEPRINT_SCORE && item.blueprint.game_id === gameId)
      .sort((a, b) => b.score - a.score)[0];

    if (best) {
      blueprintLookup.set(cacheKey, best.blueprint.id);
      cacheBlueprintImage(best.blueprint.id, best.blueprint.image_url);
      return best.blueprint.id;
    }
  }

  return null;
}

export function buildCardTraderSearchUrl(
  name: string,
  setName?: string | null,
  /** @deprecated Collector/set codes break CardTrader search — ignored. */
  _setCode?: string | null
): string {
  const terms = [name, setName].filter(Boolean).join(" ").trim();
  return `https://www.cardtrader.com/en/search?query=${encodeURIComponent(terms)}`;
}

/** @deprecated Use buildCardTraderCardUrl for direct product links */
export function buildCardTraderUrl(gameSlug: string, blueprintId: number): string {
  return `https://www.cardtrader.com/en/cards/${blueprintId}`;
}

function blueprintToSearchResult(
  blueprint: CardTraderBlueprint,
  expansion: CardTraderExpansion
): CardSearchResult {
  cacheBlueprintImage(blueprint.id, blueprint.image_url);

  return {
    externalId: String(blueprint.id),
    name: blueprint.name,
    setCode: expansion.code ?? null,
    setName: expansion.name,
    collectorNumber: expansion.code ?? null,
    rarity: blueprint.version ?? null,
    edition: null,
    imageUrl: normalizeCardTraderImageUrl(blueprint.image_url),
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

/** Search CardTrader blueprints by name (scans expansions newest-first, cached). */
export async function searchCardTraderCatalog(
  gameSlug: string,
  query: string,
  options?: CardTraderSearchOptions
): Promise<CardSearchResult[]> {
  const limit = options?.limit ?? SEARCH_RESULT_LIMIT;
  const maxExpansions = options?.maxExpansions ?? MERGE_MAX_EXPANSIONS;
  const gameId = await resolveCardTraderGameId(gameSlug);
  if (!gameId) return [];

  const terms = normalize(query)
    .split(" ")
    .filter((t) => t.length > 1);
  if (terms.length === 0) return [];

  const expansions = await getExpansions(gameId);
  const ranked = [...expansions].sort((a, b) => b.id - a.id).slice(0, maxExpansions);

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
