import type { DemoCard } from "@/lib/demo/types";
import { buildYgoImageUrl, pickYgoImageSizeForRarity } from "@/lib/yugioh/urls";

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

function yugiohPreviewUrl(card: CardImageFields): string | null {
  if (card.externalId) {
    return buildYgoImageUrl(card.externalId, pickYgoImageSizeForRarity(card.rarity));
  }
  if (!card.imageUrl) return null;
  if (card.imageUrl.includes("cards_small") || card.imageUrl.includes("_small")) {
    return card.imageUrl
      .replace("/cards_small/", "/cards/")
      .replace("cards_small", "cards")
      .replace("_small", "");
  }
  return card.imageUrl;
}

function storedPreviewUrl(card: CardImageFields, preferLarge: boolean): string | null {
  if (card.gameSlug === "yugioh") {
    return yugiohPreviewUrl(card);
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

/** Prefer full-resolution card art for grid / binder thumbnails. */
export function getCardPreviewImageUrl(card: CardImageFields): string | null {
  return storedPreviewUrl(card, false);
}

export interface CardDisplayImageSources {
  quoteImage?: string | null;
  variantImage?: string | null;
  detailImage?: string | null;
}

/** Best image URL for detail modals — never falls back to Yu-Gi-Oh! CDN for other games. */
export function resolveCardDisplayImage(
  card: CardImageFields,
  sources: CardDisplayImageSources = {}
): string | null {
  const preferLarge = card.gameSlug === "pokemon";
  const candidates = [
    sources.quoteImage,
    sources.variantImage,
    sources.detailImage,
    storedPreviewUrl(card, preferLarge),
  ];

  for (const url of candidates) {
    if (!url) continue;
    return preferLarge ? upgradePokemonImageUrl(url, true) : url;
  }

  return null;
}
