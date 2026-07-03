import type { CardSearchResult } from "./types";

export interface CardPrintVariant {
  key: string;
  setCode: string | null;
  setName: string | null;
  rarity: string | null;
  price: number | null;
}

type YgoSet = {
  set_name: string;
  set_code: string;
  set_rarity: string;
  set_price: string;
};

export function getSearchResultVariants(
  result: CardSearchResult,
  gameSlug: string
): CardPrintVariant[] {
  if (gameSlug === "yugioh") {
    const sets = result.metadata?.sets as YgoSet[] | undefined;
    if (sets?.length) {
      return sets.map((s) => ({
        key: `${s.set_code}-${s.set_rarity}`,
        setCode: s.set_code,
        setName: s.set_name,
        rarity: s.set_rarity,
        price: s.set_price ? parseFloat(s.set_price) : null,
      }));
    }
  }

  return [
    {
      key: "default",
      setCode: result.setCode,
      setName: result.setName,
      rarity: result.rarity,
      price: result.price,
    },
  ];
}

export function applyVariant(
  result: CardSearchResult,
  variant: CardPrintVariant
): CardSearchResult {
  return {
    ...result,
    setCode: variant.setCode,
    setName: variant.setName,
    rarity: variant.rarity,
    price: variant.price,
    collectorNumber: variant.setCode ?? result.collectorNumber,
  };
}
