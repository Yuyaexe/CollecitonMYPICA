export { isCardTraderConfigured, cardTraderFetch } from "./client";
export {
  resolveBlueprintId,
  resolveCardTraderGameId,
  buildCardTraderSearchUrl,
  buildCardTraderCardUrl,
  resolveCardTraderProductUrl,
  resolveStoredBlueprintId,
  extractBlueprintIdFromImageUrl,
  searchCardTraderCatalog,
  parseCardTraderBlueprintId,
  CARDTRADER_PRIMARY_MAX_EXPANSIONS,
} from "./catalog";
export { isCardTraderGameSupported, CARDTRADER_GAME_SLUGS } from "./games";

/** Games with no native catalog API — CardTrader is the only search source. */
export const CARDTRADER_PRIMARY_GAME_SLUGS = ["onepiece", "lorcana", "magic"] as const;

export function isCardTraderPrimarySearch(gameSlug: string): boolean {
  return CARDTRADER_PRIMARY_GAME_SLUGS.includes(
    gameSlug as (typeof CARDTRADER_PRIMARY_GAME_SLUGS)[number]
  );
}
export {
  getCardTraderPrice,
  getCardTraderPriceForProfile,
  resolveBestMarketPrice,
} from "./pricing";
export type { CardPriceInput, CardTraderPriceResult, CardTraderClientQuote } from "./types";
