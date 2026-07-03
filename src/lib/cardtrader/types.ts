import type { CardCondition, CardLanguage } from "@/types/tcg";

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
  tcg_player_id: string | null;
  image_url?: string | null;
  /** Card variant / rarity label from CardTrader (e.g. "Rare", "Secret Rare"). */
  version?: string | null;
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
  rarity?: string | null;
  condition?: CardCondition;
  language?: CardLanguage;
  isFoil?: boolean;
  blueprintId?: number | null;
}

export interface CardTraderPriceResult {
  price: number;
  currency: string;
  blueprintId: number;
  url: string;
  listingCount: number;
  imageUrl?: string | null;
}
