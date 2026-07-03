import type { CardCondition, CardLanguage, Currency } from "@/types/tcg";

export interface DemoCard {
  id: string;
  gameId: string;
  gameSlug: string;
  gameName: string;
  externalId: string | null;
  name: string;
  setCode: string | null;
  setName: string | null;
  collectorNumber: string | null;
  rarity: string | null;
  imageUrl: string | null;
  marketPrice: number | null;
  /** CardTrader catalog blueprint id — separate from Yu-Gi-Oh passcode in externalId */
  cardTraderBlueprintId?: string | null;
}

export interface DemoOwnedCard {
  id: string;
  collectionId: string;
  cardId: string;
  card: DemoCard;
  quantity: number;
  condition: CardCondition;
  language: CardLanguage;
  isFoil: boolean;
  purchasePrice: number | null;
  notes: string | null;
  tagIds: string[];
}

export interface DemoCollection {
  id: string;
  name: string;
  isDefault: boolean;
  isFavorite: boolean;
  coverImageUrl: string | null;
}

export interface DemoProfile {
  displayName: string;
  currency: Currency;
  theme: string;
  defaultGameId: string | null;
}

export interface DemoTag {
  id: string;
  name: string;
  color: string;
}

export interface DemoState {
  profile: DemoProfile;
  collections: DemoCollection[];
  ownedCards: DemoOwnedCard[];
  tags: DemoTag[];
}

export const DEMO_GAMES = [
  { id: "a0000000-0000-4000-8000-000000000001", slug: "yugioh", name: "Yu-Gi-Oh!" },
  { id: "a0000000-0000-4000-8000-000000000002", slug: "pokemon", name: "Pokemon" },
  { id: "a0000000-0000-4000-8000-000000000003", slug: "digimon", name: "Digimon" },
  { id: "a0000000-0000-4000-8000-000000000005", slug: "onepiece", name: "One Piece" },
  { id: "a0000000-0000-4000-8000-000000000006", slug: "lorcana", name: "Disney Lorcana" },
  { id: "a0000000-0000-4000-8000-000000000004", slug: "magic", name: "Magic: The Gathering" },
] as const;

export const DEFAULT_COLLECTION_ID = "demo-collection-1";

export function createInitialDemoState(): DemoState {
  return {
    profile: {
      displayName: "Collector",
      currency: "USD",
      theme: "dark",
      defaultGameId: DEMO_GAMES[0].id,
    },
    collections: [
      {
        id: DEFAULT_COLLECTION_ID,
        name: "My Collection",
        isDefault: true,
        isFavorite: true,
        coverImageUrl: null,
      },
    ],
    ownedCards: [],
    tags: [],
  };
}
