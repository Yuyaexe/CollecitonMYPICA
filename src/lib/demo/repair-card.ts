import { extractBlueprintIdFromImageUrl } from "@/lib/cardtrader";
import type { DemoCard } from "./types";

/** Infer CardTrader blueprint id for cards added before cardTraderBlueprintId existed. */
export function repairDemoCard(card: DemoCard): DemoCard {
  let cardTraderBlueprintId = card.cardTraderBlueprintId ?? null;

  if (!cardTraderBlueprintId) {
    const fromImage = extractBlueprintIdFromImageUrl(card.imageUrl);
    if (fromImage != null) {
      cardTraderBlueprintId = String(fromImage);
    } else if (
      card.externalId &&
      /^\d+$/.test(card.externalId) &&
      card.externalId.length < 8
    ) {
      cardTraderBlueprintId = card.externalId;
    }
  }

  if (cardTraderBlueprintId === card.cardTraderBlueprintId) {
    return card;
  }

  return { ...card, cardTraderBlueprintId };
}

export function cardTraderBlueprintFromSearch(
  externalId: string | null,
  imageUrl: string | null,
  catalogSource?: string
): string | null {
  if (catalogSource === "cardtrader" && externalId) {
    return externalId;
  }
  const fromImage = extractBlueprintIdFromImageUrl(imageUrl);
  if (fromImage != null) return String(fromImage);
  if (externalId && /^\d+$/.test(externalId) && externalId.length < 8) {
    return externalId;
  }
  return null;
}
