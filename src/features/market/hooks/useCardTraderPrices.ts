import { resolveCardTraderProductUrl } from "@/lib/cardtrader";
import type { DemoOwnedCard } from "@/lib/demo/types";

/** CardTrader marketplace product/search URL — no live pricing. */
export function resolveCardTraderUrl(item: DemoOwnedCard): string | null {
  const url = resolveCardTraderProductUrl({
    name: item.card.name,
    gameSlug: item.card.gameSlug,
    externalId: item.card.externalId,
    cardTraderBlueprintId: item.card.cardTraderBlueprintId,
    setName: item.card.setName,
    setCode: item.card.setCode,
    rarity: item.card.rarity,
    imageUrl: item.card.imageUrl,
  });
  return url || null;
}
