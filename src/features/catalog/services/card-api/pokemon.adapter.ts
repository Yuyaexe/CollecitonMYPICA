import type { CardApiAdapter, CardDetail, CardSearchResult, CatalogSearchOptions } from "./types";
import { parsePokemonSearch, type PokemonSearchPage } from "../pokemon-search";

const API = "https://api.pokemontcg.io/v2";
const TCGDEX_API = "https://api.tcgdex.net/v2/en";
const TCGDEX_PAGE_SIZE = 48;
const POKEMON_PRIMARY_TIMEOUT_MS = 2_500;
const POKEMON_PRIMARY_CIRCUIT_MS = 30_000;

let pokemonPrimaryCircuitOpenUntil = 0;

function primaryCircuitIsOpen(): boolean {
  return pokemonPrimaryCircuitOpenUntil > Date.now();
}

function openPrimaryCircuit(): void {
  pokemonPrimaryCircuitOpenUntil = Date.now() + POKEMON_PRIMARY_CIRCUIT_MS;
}

function closePrimaryCircuit(): void {
  pokemonPrimaryCircuitOpenUntil = 0;
}

export function resetPokemonPrimaryCircuitForTesting(): void {
  closePrimaryCircuit();
}

function isRetryablePrimaryStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function quoted(value: string): string {
  return `"${value.replace(/[\\"]/g, "\\$&")}"`;
}

function prefixTerm(value: string): string {
  return value.replace(/[+\-!():^\[\]"{}~*?|&\\/]/g, "\\$&");
}

function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    Accept: "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) DeckVault/0.2.19",
  };
  const key = process.env.POKEMON_TCG_API_KEY;
  if (key) headers["X-Api-Key"] = key;
  return headers;
}

interface PokemonCard {
  id: string;
  name: string;
  number: string;
  rarity: string;
  set: { id: string; name: string; printedTotal?: number; ptcgoCode?: string };
  images: { small: string; large: string };
  tcgplayer?: { prices?: { normal?: { market?: number }; holofoil?: { market?: number } } };
  cardmarket?: { prices?: { averageSellPrice?: number } };
}

interface TcgdexCardBrief {
  id: string;
  localId: string | number;
  name: string;
  image?: string | null;
}

interface TcgdexSetBrief {
  id: string;
  name: string;
}

let tcgdexSetsCache: { expiresAt: number; sets: Map<string, string> } | null = null;

function tcgdexImageUrl(
  image: string | null | undefined,
  quality: "low" | "high"
): string | null {
  return image ? `${image}/${quality}.webp` : null;
}

function tcgdexSetIdFromCardId(id: string): string {
  const split = id.lastIndexOf("-");
  return split > 0 ? id.slice(0, split) : "";
}

async function getTcgdexSetNames(signal?: AbortSignal): Promise<Map<string, string>> {
  if (tcgdexSetsCache && tcgdexSetsCache.expiresAt > Date.now()) {
    return tcgdexSetsCache.sets;
  }
  const response = await fetch(`${TCGDEX_API}/sets`, { signal });
  if (!response.ok) throw new Error(`TCGdex sets HTTP ${response.status}`);
  const data = (await response.json()) as TcgdexSetBrief[];
  const sets = new Map(data.map((set) => [set.id, set.name]));
  tcgdexSetsCache = { sets, expiresAt: Date.now() + 60 * 60 * 1000 };
  return sets;
}

async function searchPokemonViaTcgdex(
  query: string,
  options: {
    setId?: string;
    number?: string;
    page?: number;
    order?: string;
    exact?: boolean;
    signal?: AbortSignal;
  }
): Promise<PokemonSearchPage> {
  const page = Number.isSafeInteger(options.page) && options.page! > 0 ? options.page! : 1;
  const parsed = parsePokemonSearch(query);
  const number = (options.number?.trim() || parsed.number)
    .replace(/^#/, "")
    .split("/")[0]
    .replace(/^0+(?=\d)/, "");
  const params = new URLSearchParams();
  if (parsed.name) {
    params.set("name", options.exact ? `eq:${parsed.name}` : parsed.name);
  }
  if (number) params.set("localId", number);
  if (options.setId) params.set("set.id", options.setId);
  params.set("pagination:page", String(page));
  params.set("pagination:itemsPerPage", String(TCGDEX_PAGE_SIZE));
  if (options.order === "number") {
    params.set("sort:field", "localId");
    params.set("sort:order", "ASC");
  }

  const setsPromise = getTcgdexSetNames(options.signal).catch((error) => {
    if (options.signal?.aborted) throw error;
    return new Map<string, string>();
  });
  const response = await fetch(`${TCGDEX_API}/cards?${params}`, { signal: options.signal });
  if (!response.ok) throw new Error(`TCGdex cards HTTP ${response.status}`);
  let cards = (await response.json()) as TcgdexCardBrief[];
  const sets = await setsPromise;
  if (options.order === "oldest") cards = [...cards].reverse();
  const hasMore = cards.length === TCGDEX_PAGE_SIZE;
  const totalCount = hasMore
    ? null
    : (page - 1) * TCGDEX_PAGE_SIZE + cards.length;
  return {
    results: cards.map((card) => {
      const setId = tcgdexSetIdFromCardId(card.id);
      return {
        externalId: card.id,
        name: card.name,
        setCode: setId || null,
        setName: sets.get(setId) ?? setId ?? null,
        collectorNumber: String(card.localId),
        rarity: null,
        edition: null,
        imageUrl: tcgdexImageUrl(card.image, "low"),
        price: null,
        metadata: {
          largeImageUrl: tcgdexImageUrl(card.image, "high"),
          catalogSource: "tcgdex",
        },
      };
    }),
    page,
    totalCount,
    hasMore,
  };
}

function mapPokemonCard(card: PokemonCard): CardSearchResult {
  const tcgPrice =
    card.tcgplayer?.prices?.holofoil?.market ??
    card.tcgplayer?.prices?.normal?.market ??
    card.cardmarket?.prices?.averageSellPrice ??
    null;

  return {
    externalId: card.id,
    name: card.name,
    setCode: card.set.id,
    setName: card.set.name,
    collectorNumber: card.number,
    rarity: card.rarity,
    edition: null,
    imageUrl: card.images?.small ?? card.images?.large ?? null,
    price: tcgPrice,
    metadata: { tcgplayer: card.tcgplayer, cardmarket: card.cardmarket,
      largeImageUrl: card.images?.large, printedTotal: card.set.printedTotal,
      ptcgoCode: card.set.ptcgoCode },
  };
}

export async function searchPokemonPage(query: string, options: {
  setId?: string; number?: string; page?: number; order?: string; exact?: boolean; signal?: AbortSignal;
} = {}): Promise<PokemonSearchPage> {
  const page = Number.isSafeInteger(options.page) && options.page! > 0 ? options.page! : 1;
  const pageSize = 48;
  const parsed = parsePokemonSearch(query);
  const parts: string[] = [];
  if (options.setId) parts.push(`set.id:${quoted(options.setId)}`);
  if (parsed.setCode) parts.push(`set.ptcgoCode:${quoted(parsed.setCode)}`);
  const number = (options.number?.trim() || parsed.number).replace(/^#/, "").split("/")[0].replace(/^0+(?=\d)/, "");
  if (number) parts.push(`number:${quoted(number)}`);
  if (parsed.name) {
    parts.push(options.exact
      ? `!name:${quoted(parsed.name)}`
      : parsed.name.split(/\s+/).map((term) => `name:${prefixTerm(term)}*`).join(" "));
  }
  if (!parts.length) return { results: [], page, totalCount: 0, hasMore: false };
  const orderBy = options.order === "oldest" ? "set.releaseDate,number,id"
    : options.order === "number" ? "number,id" : "-set.releaseDate,number,id";
  const params = new URLSearchParams({ q: parts.join(" "), page: String(page), pageSize: String(pageSize), orderBy });
  if (primaryCircuitIsOpen()) {
    return searchPokemonViaTcgdex(query, options);
  }
  const timeout = AbortSignal.timeout(POKEMON_PRIMARY_TIMEOUT_MS);
  try {
    const response = await fetch(`${API}/cards?${params}`, {
      headers: getHeaders(),
      signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout,
    });
    if (!response.ok) {
      if (isRetryablePrimaryStatus(response.status)) openPrimaryCircuit();
      return searchPokemonViaTcgdex(query, options);
    }
    closePrimaryCircuit();
    const data = await response.json() as { data?: PokemonCard[]; totalCount?: number };
    const cards = data.data ?? [];
    const totalCount = data.totalCount ?? ((page - 1) * pageSize + cards.length);
    return {
      results: cards.map(mapPokemonCard), page, totalCount,
      hasMore: cards.length > 0 && (data.totalCount != null ? page * pageSize < totalCount : cards.length === pageSize),
    };
  } catch (error) {
    if (options.signal?.aborted) throw error;
    openPrimaryCircuit();
    return searchPokemonViaTcgdex(query, options);
  }
}

export const pokemonAdapter: CardApiAdapter = {
  gameSlug: "pokemon",

  async search(query: string, options?: CatalogSearchOptions): Promise<CardSearchResult[]> {
    return (await searchPokemonPage(query, options)).results;
  },

  async getById(externalId: string): Promise<CardDetail | null> {
    let res: Response | null = null;
    if (!primaryCircuitIsOpen()) {
      try {
        res = await fetch(`${API}/cards/${externalId}`, {
          headers: getHeaders(),
          signal: AbortSignal.timeout(POKEMON_PRIMARY_TIMEOUT_MS),
        });
        if (res.ok) closePrimaryCircuit();
        else if (isRetryablePrimaryStatus(res.status)) openPrimaryCircuit();
      } catch {
        openPrimaryCircuit();
      }
    }
    if (!res?.ok) {
      const fallback = await fetch(`${TCGDEX_API}/cards/${encodeURIComponent(externalId)}`);
      if (!fallback.ok) return null;
      const card = (await fallback.json()) as TcgdexCardBrief & {
        rarity?: string | null;
        set?: { id: string; name: string; cardCount?: { official?: number } };
      };
      return {
        externalId: card.id,
        name: card.name,
        setCode: card.set?.id ?? tcgdexSetIdFromCardId(card.id),
        setName: card.set?.name ?? null,
        collectorNumber: String(card.localId),
        rarity: card.rarity ?? null,
        edition: null,
        imageUrl: tcgdexImageUrl(card.image, "high"),
        price: null,
        metadata: {
          largeImageUrl: tcgdexImageUrl(card.image, "high"),
          printedTotal: card.set?.cardCount?.official,
          catalogSource: "tcgdex",
        },
        gameSlug: "pokemon",
      };
    }
    const data = await res.json();
    const card = data.data as PokemonCard | undefined;
    if (!card) return null;
    return { ...mapPokemonCard(card), gameSlug: "pokemon" };
  },
};
