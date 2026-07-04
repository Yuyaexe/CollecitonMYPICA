import type { DemoCard } from "@/lib/demo/types";
import { buildYgoImageUrl, pickYgoImageSizeForRarity } from "@/lib/yugioh/urls";
import { isCardTraderHostedImage } from "@/lib/cardtrader/images";
import { isYugiohPasscodeId, resolveYugiohPasscode } from "@/lib/yugioh/passcode";

type CardImageFields = Pick<
  DemoCard,
  "imageUrl" | "gameSlug" | "externalId" | "rarity" | "cardTraderBlueprintId"
>;

function upgradePokemonImageUrl(url: string, preferLarge: boolean): string {
  if (!preferLarge || !url.includes("pokemontcg.io") || url.includes("_hires")) {
    return url;
  }
  return url.replace(/(\.[a-z]+)$/i, "_hires$1");
}

function pokemonImageFromExternalId(externalId: string, preferLarge: boolean): string | null {
  const dash = externalId.lastIndexOf("-");
  if (dash <= 0) return null;
  const setId = externalId.slice(0, dash);
  const number = externalId.slice(dash + 1);
  if (!setId || !number) return null;
  const suffix = preferLarge ? "_hires.png" : ".png";
  return `https://images.pokemontcg.io/${setId}/${number}${suffix}`;
}

/** CardTrader art wins over YGOPRODeck when both are available. */
function pickCardTraderImage(
  card: CardImageFields,
  cardTraderImage?: string | null
): string | null {
  if (cardTraderImage && isCardTraderHostedImage(cardTraderImage)) {
    return cardTraderImage;
  }
  if (card.imageUrl && isCardTraderHostedImage(card.imageUrl)) {
    return card.imageUrl;
  }
  return null;
}

function yugiohPreviewUrl(
  card: CardImageFields,
  detailPasscode?: string | null | undefined,
  _cardTraderImage?: string | null
): string | null {
  if (detailPasscode === undefined) {
    return null;
  }

  if (detailPasscode) {
    const ygoUrl = buildYgoImageUrl(detailPasscode, pickYgoImageSizeForRarity(card.rarity));
    if (ygoUrl) return ygoUrl;
  }

  return null;
}

function storedPreviewUrl(
  card: CardImageFields,
  preferLarge: boolean,
  detailPasscode?: string | null,
  cardTraderImage?: string | null
): string | null {
  if (card.gameSlug === "yugioh") {
    return yugiohPreviewUrl(card, detailPasscode, cardTraderImage);
  }
  if (card.imageUrl) {
    return card.gameSlug === "pokemon"
      ? upgradePokemonImageUrl(card.imageUrl, preferLarge)
      : card.imageUrl;
  }
  if (card.gameSlug === "pokemon" && card.externalId) {
    return pokemonImageFromExternalId(card.externalId, preferLarge);
  }
  return null;
}

/** Full framed card for hover popover (never cropped Yu-Gi-Oh! art-only). */
export function getCardHoverPreviewUrl(
  card: CardImageFields,
  detailPasscode?: string | null | undefined,
  cardTraderImage?: string | null
): string | null {
  if (card.gameSlug === "yugioh") {
    if (detailPasscode === undefined) {
      return null;
    }

    if (detailPasscode) {
      const ygoUrl = buildYgoImageUrl(detailPasscode, "full");
      if (ygoUrl) return ygoUrl;
    }

    return null;
  }
  if (card.gameSlug === "pokemon") {
    return storedPreviewUrl(card, true, detailPasscode, cardTraderImage);
  }
  return storedPreviewUrl(card, false, detailPasscode, cardTraderImage);
}

/** YGOPRODeck art URL when CardTrader has no scan — used as CardImage fallback. */
export function getYugiohPasscodeFallbackUrl(
  card: CardImageFields,
  detailPasscode?: string | null
): string | null {
  const passcode = resolveYugiohPasscode(card.externalId, card.imageUrl, detailPasscode);
  if (!passcode) return null;
  return buildYgoImageUrl(passcode, pickYgoImageSizeForRarity(card.rarity));
}

/** Prefer CardTrader art, then YGOPRODeck passcode art for grid / binder thumbnails. */
/** Collection thumbnail — never fall back to stale Yu-Gi-Oh art while passcode resolves. */
export function resolveCollectionThumbUrl(
  card: CardImageFields,
  passcode: string | null | undefined,
  _cardTraderImage?: string | null
): string | null {
  return getCardPreviewImageUrl(card, passcode, null);
}

export function getCardPreviewImageUrl(
  card: CardImageFields,
  detailPasscode?: string | null,
  cardTraderImage?: string | null
): string | null {
  return storedPreviewUrl(card, false, detailPasscode, cardTraderImage);
}

export interface CardDisplayImageSources {
  quoteImage?: string | null;
  variantImage?: string | null;
  detailImage?: string | null;
  /** undefined = passcode still resolving — do not use stored art yet */
  detailPasscode?: string | null | undefined;
}

/** Best image URL for detail modals — CardTrader first, YGOPRODeck fallback. */
export function resolveCardDisplayImage(
  card: CardImageFields,
  sources: CardDisplayImageSources = {}
): string | null {
  if (card.gameSlug === "yugioh") {
    if (sources.detailPasscode === undefined) {
      return null;
    }

    if (sources.detailPasscode) {
      const ygoUrl = buildYgoImageUrl(sources.detailPasscode, "full");
      if (ygoUrl) return ygoUrl;
    }

    return sources.detailImage ?? null;
  }

  const preferLarge = card.gameSlug === "pokemon";
  const candidates = [
    sources.quoteImage,
    sources.variantImage,
    sources.detailImage,
    storedPreviewUrl(card, preferLarge, sources.detailPasscode, sources.quoteImage),
  ];

  for (const url of candidates) {
    if (!url) continue;
    return preferLarge ? upgradePokemonImageUrl(url, true) : url;
  }

  return null;
}

export { isYugiohPasscodeId, isCardTraderHostedImage };
