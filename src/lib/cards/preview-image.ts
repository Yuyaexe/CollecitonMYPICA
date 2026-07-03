import type { DemoCard } from "@/lib/demo/types";
import { buildYgoImageUrl, pickYgoImageSizeForRarity } from "@/lib/yugioh/urls";
import {
  isCardTraderHostedImage,
  isYugiohPasscodeId,
  resolveYugiohPasscode,
} from "@/lib/yugioh/passcode";

type CardImageFields = Pick<DemoCard, "imageUrl" | "gameSlug" | "externalId" | "rarity">;

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

function yugiohPreviewUrl(
  card: CardImageFields,
  detailPasscode?: string | null
): string | null {
  const passcode = resolveYugiohPasscode(card.externalId, card.imageUrl, detailPasscode);
  if (passcode) {
    return buildYgoImageUrl(passcode, pickYgoImageSizeForRarity(card.rarity));
  }

  if (card.imageUrl?.includes("ygoprodeck.com") && !passcode) {
    if (!isYugiohPasscodeId(card.externalId, card.imageUrl)) {
      return null;
    }
  }

  if (card.imageUrl && isCardTraderHostedImage(card.imageUrl)) {
    return card.imageUrl;
  }

  if (!card.imageUrl) return null;

  if (card.imageUrl.includes("cards_small") || card.imageUrl.includes("_small")) {
    return card.imageUrl
      .replace("/cards_small/", "/cards/")
      .replace("cards_small", "cards")
      .replace("_small", "");
  }

  if (card.imageUrl.includes("cards_cropped")) {
    return card.imageUrl.replace("/cards_cropped/", "/cards/").replace("cards_cropped", "cards");
  }

  return card.imageUrl;
}

function storedPreviewUrl(
  card: CardImageFields,
  preferLarge: boolean,
  detailPasscode?: string | null
): string | null {
  if (card.gameSlug === "yugioh") {
    return yugiohPreviewUrl(card, detailPasscode);
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
  detailPasscode?: string | null
): string | null {
  if (card.gameSlug === "yugioh") {
    const passcode = resolveYugiohPasscode(card.externalId, card.imageUrl, detailPasscode);
    if (passcode) {
      return buildYgoImageUrl(passcode, "full");
    }
    if (card.imageUrl) return card.imageUrl;
    return null;
  }
  if (card.gameSlug === "pokemon") {
    return storedPreviewUrl(card, true, detailPasscode);
  }
  return storedPreviewUrl(card, false, detailPasscode);
}

/** Prefer full-resolution card art for grid / binder thumbnails. */
export function getCardPreviewImageUrl(
  card: CardImageFields,
  detailPasscode?: string | null
): string | null {
  return storedPreviewUrl(card, false, detailPasscode);
}

export interface CardDisplayImageSources {
  quoteImage?: string | null;
  variantImage?: string | null;
  detailImage?: string | null;
  detailPasscode?: string | null;
}

/** Best image URL for detail modals — never use YGOPRODeck CDN with CardTrader blueprint IDs. */
export function resolveCardDisplayImage(
  card: CardImageFields,
  sources: CardDisplayImageSources = {}
): string | null {
  if (card.gameSlug === "yugioh") {
    const passcode = resolveYugiohPasscode(
      card.externalId,
      card.imageUrl,
      sources.detailPasscode
    );
    if (passcode) {
      const ygoUrl = buildYgoImageUrl(passcode, "full");
      if (ygoUrl) return ygoUrl;
    }
    if (card.imageUrl) return card.imageUrl;
    return sources.variantImage ?? sources.quoteImage ?? sources.detailImage ?? null;
  }

  const preferLarge = card.gameSlug === "pokemon";
  const candidates = [
    sources.quoteImage,
    sources.variantImage,
    sources.detailImage,
    storedPreviewUrl(card, preferLarge, sources.detailPasscode),
  ];

  for (const url of candidates) {
    if (!url) continue;
    return preferLarge ? upgradePokemonImageUrl(url, true) : url;
  }

  return null;
}

export { isYugiohPasscodeId };
