import { resolveRarityStyle } from "@/lib/rarity/resolve-rarity";
import { isDigimonTcgPlayerExternalId } from "@/features/catalog/services/card-api/digimon.utils";
import { isYugiohLostArtCode } from "@/lib/yugioh/set-code";

const blueprintSlugCache = new Map<number, string>();

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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

export function parseCardTraderBlueprintId(externalId: string | null | undefined): number | null {
  if (!externalId || !/^\d+$/.test(externalId)) return null;
  const id = Number(externalId);
  return Number.isFinite(id) ? id : null;
}

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

/**
 * Blueprint id stored on owned cards — ignores Yu-Gi-Oh passcodes mistaken for blueprint ids.
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

export function buildCardTraderSearchUrl(
  name: string,
  setName?: string | null,
  _setCode?: string | null
): string {
  const terms = [name, setName].filter(Boolean).join(" ").trim();
  return `https://www.cardtrader.com/en/search?query=${encodeURIComponent(terms)}`;
}

function storedBlueprintMatchesInput(
  blueprintId: number,
  input: {
    rarity?: string | null;
    gameSlug?: string | null;
    imageUrl?: string | null;
    setCode?: string | null;
  }
): boolean {
  if (input.gameSlug !== "yugioh" || !input.rarity?.trim()) return true;

  const slug =
    getBlueprintProductSlug(blueprintId) ?? extractCardTraderSlugFromImageUrl(input.imageUrl);
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

/** Validates a stored blueprint id against card set/rarity (URL fallback). */
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
  if (params.imageUrl) {
    const fromImage = extractBlueprintIdFromImageUrl(params.imageUrl);
    if (fromImage != null) cacheBlueprintSlug(fromImage, params.imageUrl);
  }

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
