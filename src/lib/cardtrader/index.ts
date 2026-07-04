export { isCardTraderConfigured, cardTraderFetch } from "./client";
export {
  resolveBlueprintId,
  resolveCardTraderGameId,
  buildCardTraderSearchUrl,
  buildCardTraderCardUrl,
  resolveCardTraderProductUrl,
  resolveStoredBlueprintId,
  cardTraderBlueprintMatchesCard,
  extractBlueprintIdFromImageUrl,
  searchCardTraderCatalog,
  parseCardTraderBlueprintId,
  CARDTRADER_PRIMARY_MAX_EXPANSIONS,
} from "./catalog";
export { isCardTraderGameSupported, CARDTRADER_GAME_SLUGS } from "./games";

/** No supported games rely on CardTrader as the only search source. */
export const CARDTRADER_PRIMARY_GAME_SLUGS = [] as const;

export function isCardTraderPrimarySearch(_gameSlug: string): boolean {
  return false;
}
export {
  getCardTraderPrice,
  getCardTraderPriceForProfile,
  resolveBestMarketPrice,
} from "./pricing";
export type { CardPriceInput, CardTraderPriceResult, CardTraderClientQuote } from "./types";
