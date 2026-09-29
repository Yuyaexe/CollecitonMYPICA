import {
  buildCardTraderManaSearchUrl,
  cardTraderBlueprintMatchesCard,
  collectCardTraderBlueprintGroupIds,
  resolveCardTraderProductUrl,
  resolveStoredBlueprintId,
  type CardTraderBlueprintPayload,
} from "./catalog";

export interface ResolveCardTraderUrlInput {
  name: string;
  gameSlug?: string | null;
  externalId?: string | null;
  cardTraderBlueprintId?: string | null;
  setName?: string | null;
  setCode?: string | null;
  rarity?: string | null;
  imageUrl?: string | null;
}

const blueprintGroupCache = new Map<
  number,
  { name: string; ids: number[]; expiresAt: number }
>();
const blueprintSearchCache = new Map<
  string,
  { ids: number[]; expiresAt: number }
>();

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const CARDTRADER_GAME_SLUG: Record<string, string> = {
  yugioh: "yu-gi-oh",
  pokemon: "pokemon",
  digimon: "digimon",
  onepiece: "one-piece",
  dragonball: "dragon-ball-super",
};

function normalizeCardName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchCardTraderBlueprintGroup(
  blueprintId: number
): Promise<{ name: string; ids: number[] } | null> {
  const cached = blueprintGroupCache.get(blueprintId);
  if (cached && cached.expiresAt > Date.now()) {
    return { name: cached.name, ids: cached.ids };
  }

  const response = await fetch(`https://www.cardtrader.com/en/cards/${blueprintId}.json`, {
    headers: { "User-Agent": "DeckVault/1.0 (cardtrader-url)" },
    next: { revalidate: 86400 },
  });
  if (!response.ok) return null;

  const data = (await response.json()) as { blueprint?: CardTraderBlueprintPayload };
  const blueprint = data.blueprint;
  if (!blueprint?.id) return null;

  const resolved = {
    name: blueprint.name,
    ids: collectCardTraderBlueprintGroupIds(blueprint),
  };
  blueprintGroupCache.set(blueprintId, {
    ...resolved,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
  return resolved;
}

async function searchCardTraderBlueprintIds(
  input: ResolveCardTraderUrlInput
): Promise<number[]> {
  const gameSlug = input.gameSlug ? CARDTRADER_GAME_SLUG[input.gameSlug] : null;
  if (!gameSlug) return [];

  const normalizedName = normalizeCardName(input.name);
  if (!normalizedName) return [];
  const cacheKey = `${gameSlug}:${normalizedName}`;
  const cached = blueprintSearchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.ids;

  const params = new URLSearchParams({
    sort: "manasearch_sort",
    "blueprints_search[name_en_or_version_cont]": input.name.trim(),
  });
  const response = await fetch(
    `https://www.cardtrader.com/en/games/${gameSlug}/blueprints_search?${params}`,
    {
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent": "DeckVault/1.0 (cardtrader-url)",
      },
      next: { revalidate: 86400 },
    }
  );
  if (!response.ok) return [];

  const payload = (await response.json()) as {
    blueprints?: Array<{ id?: number; name?: string }>;
  };
  const ids = [
    ...new Set(
      (payload.blueprints ?? [])
        .filter(
          (blueprint) =>
            blueprint.id != null &&
            normalizeCardName(blueprint.name ?? "") === normalizedName
        )
        .map((blueprint) => Number(blueprint.id))
        .filter((id) => Number.isFinite(id) && id > 0)
    ),
  ];

  blueprintSearchCache.set(cacheKey, {
    ids,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
  return ids;
}

function resolveBlueprintId(input: ResolveCardTraderUrlInput): number | null {
  let blueprintId = resolveStoredBlueprintId(
    input.externalId,
    input.imageUrl,
    input.cardTraderBlueprintId,
    input.gameSlug
  );
  if (
    blueprintId != null &&
    !cardTraderBlueprintMatchesCard(blueprintId, {
      rarity: input.rarity,
      gameSlug: input.gameSlug,
      imageUrl: input.imageUrl,
      setCode: input.setCode,
    })
  ) {
    blueprintId = null;
  }
  return blueprintId;
}

/** Resolves a CardTrader manasearch URL with every printing of the card. */
export async function resolveCardTraderManaSearchUrl(
  input: ResolveCardTraderUrlInput
): Promise<string> {
  const blueprintId = resolveBlueprintId(input);
  if (blueprintId == null) {
    const searchedIds = await searchCardTraderBlueprintIds(input);
    if (searchedIds.length > 0) {
      return buildCardTraderManaSearchUrl(input.name, searchedIds);
    }
    return resolveCardTraderProductUrl(input);
  }

  const group = await fetchCardTraderBlueprintGroup(blueprintId);
  if (!group) {
    const searchedIds = await searchCardTraderBlueprintIds(input);
    if (searchedIds.length > 0) {
      return buildCardTraderManaSearchUrl(input.name, searchedIds);
    }
    return resolveCardTraderProductUrl(input);
  }
  if (normalizeCardName(group.name) !== normalizeCardName(input.name)) {
    const searchedIds = await searchCardTraderBlueprintIds(input);
    return buildCardTraderManaSearchUrl(input.name, searchedIds);
  }

  return buildCardTraderManaSearchUrl(group.name || input.name, group.ids);
}
