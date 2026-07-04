export interface CardSearchResult {
  externalId: string;
  name: string;
  setCode: string | null;
  setName: string | null;
  collectorNumber: string | null;
  rarity: string | null;
  edition: string | null;
  imageUrl: string | null;
  price: number | null;
  metadata: Record<string, unknown>;
}

export interface CardDetail extends CardSearchResult {
  gameSlug: string;
}

export interface CardApiAdapter {
  gameSlug: string;
  search(query: string): Promise<CardSearchResult[]>;
  getById(externalId: string): Promise<CardDetail | null>;
}

export interface YugiohCardApiAdapter extends CardApiAdapter {
  searchByNameOnly(query: string): Promise<CardSearchResult[]>;
  getBySetNumber(setNumber: string): Promise<CardDetail | null>;
}
