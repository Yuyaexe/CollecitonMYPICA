/** Games supported for CardTrader catalog search and pricing */
export const CARDTRADER_GAME_SLUGS = [
  "yugioh",
  "pokemon",
  "digimon",
  "onepiece",
  "lorcana",
  "magic",
] as const;

export type CardTraderGameSlug = (typeof CARDTRADER_GAME_SLUGS)[number];

export function isCardTraderGameSupported(gameSlug: string): boolean {
  return CARDTRADER_GAME_SLUGS.includes(gameSlug as CardTraderGameSlug);
}
