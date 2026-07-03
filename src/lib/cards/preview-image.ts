import type { DemoCard } from "@/lib/demo/types";

/** Prefer full-resolution card art for hover previews (Yu-Gi-Oh! API stores small URLs in search). */
export function getCardPreviewImageUrl(card: Pick<DemoCard, "imageUrl" | "gameSlug" | "externalId">): string | null {
  if (!card.imageUrl) return null;

  if (card.gameSlug === "yugioh") {
    if (card.externalId) {
      return `https://images.ygoprodeck.com/images/cards/${card.externalId}.jpg`;
    }
    if (card.imageUrl.includes("cards_small")) {
      return card.imageUrl.replace("cards_small", "cards").replace("_small", "");
    }
  }

  return card.imageUrl;
}
