import type { CardCondition, CardLanguage, Currency } from "@/types/tcg";

export interface CardTraderGame {
  id: number;
  name: string;
  display_name: string;
}

export interface CardTraderExpansion {
  id: number;
  name: string;
  code: string;
  game_id: number;
}

export interface CardTraderBlueprint {
  id: number;
  name: string;
  game_id: number;
  expansion_id: number | null;
  /** CardTrader returns this as a number; normalize before comparing. */
  tcg_player_id?: string | number | null;
  image_url?: string | null;
  /** Card variant / rarity label from CardTrader (e.g. "Rare", "Secret Rare"). */
  version?: string | null;
  fixed_properties?: {
    collector_number?: string | null;
    [key: string]: unknown;
  } | null;
}

export interface CardTraderProduct {
  id: number;
  blueprint_id: number;
  price?: { cents: number; currency: string };
  price_cents?: number;
  price_currency?: string;
  properties_hash?: Record<string, string>;
  quantity?: number;
  on_vacation?: boolean;
}

export interface CardPriceInput {
  gameSlug: string;
  name: string;
  setName?: string | null;
  setCode?: string | null;
  collectorNumber?: string | null;
  rarity?: string | null;
  /** Digimon print label, e.g. "Alternate Art" */
  variantLabel?: string | null;
  /** TCGPlayer product id — preferred CardTrader blueprint match for Digimon */
  tcgPlayerId?: string | null;
  condition?: CardCondition;
  language?: CardLanguage;
  isFoil?: boolean;
  blueprintId?: number | null;
  /** CardTrader CDN image — used to recover blueprint id when externalId is a YGO passcode */
  imageUrl?: string | null;
  cardTraderBlueprintId?: string | null;
}

export interface CardTraderPriceResult {
  price: number | null;
  currency: string;
  blueprintId: number;
  url: string;
  listingCount: number;
  imageUrl?: string | null;
}

export interface CardTraderClientQuote {
  price: number | null;
  currency: Currency;
  url: string;
  blueprintId: string;
  imageUrl: string | null;
}
