export type ProxyGame = "yugioh" | "pokemon" | "digimon" | "onepiece";

export type CardSizePreset = "yugioh" | "bandai";

export interface DeckEntry {
  key: string;
  name: string;
  quantity: number;
  query: string;
  artHint?: string | null;
}

export interface ProxyCardVariant {
  key: string;
  label: string;
  rarity: string | null;
  setName: string | null;
  setCode: string | null;
  imageUrl: string;
}

export interface ProxyPrintSlot {
  slotId: string;
  entryKey: string;
  name: string;
  setLine: string | null;
  rarity: string | null;
  imageUrl: string | null;
  variants: ProxyCardVariant[];
  selectedVariantKey: string | null;
}

export interface ProxyDeckPreview {
  game: ProxyGame;
  slots: ProxyPrintSlot[];
  missing: string[];
}

export interface ProxyPrintOptions {
  game: ProxyGame;
  cardSize: CardSizePreset;
  dpi: 200 | 300;
  cardsGlued: boolean;
}

export const PROXY_GAMES: ProxyGame[] = ["yugioh", "pokemon", "digimon", "onepiece"];

export const GAME_LABELS: Record<ProxyGame, string> = {
  yugioh: "Yu-Gi-Oh!",
  pokemon: "Pokemon",
  digimon: "Digimon",
  onepiece: "One Piece",
};

export const CARD_SIZE_PRESETS: Record<CardSizePreset, { w: number; h: number }> = {
  yugioh: { w: 59, h: 86 },
  bandai: { w: 63, h: 88 },
};

export const DEFAULT_PDF_DPI = 300;
export const CARDS_PER_PAGE = 9;
export const PDF_COLS = 3;
export const PDF_ROWS = 3;
export const SLOTS_PER_SPREAD = CARDS_PER_PAGE * 2;
