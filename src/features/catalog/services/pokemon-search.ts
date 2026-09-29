import type { CardSearchResult } from "./card-api/types";

export interface PokemonSearchPage {
  results: CardSearchResult[];
  page: number;
  totalCount: number | null;
  hasMore: boolean;
}

export function parsePokemonSearch(input: string) {
  let name = input.trim();
  let number = "";
  let setCode = "";
  const tail = name.match(/(?:^|\s)#?((?:[A-Z]{1,5})?\d+)(?:\/\d+)?$/);
  if (tail) {
    number = tail[1];
    name = name.slice(0, tail.index).trim();
    const set = name.match(/\s([A-Z]{2,6})$/);
    if (set && !["V", "VMAX", "VSTAR", "EX", "GX"].includes(set[1])) {
      setCode = set[1];
      name = name.slice(0, set.index).trim();
    }
  }
  return { name, number, setCode };
}

export function pokemonPrintLabel(card: CardSearchResult): string {
  return [card.setName, card.collectorNumber ? `#${card.collectorNumber}` : null, card.rarity]
    .filter(Boolean).join(" · ");
}

export function pokemonPrintImage(card: CardSearchResult): string | null {
  return typeof card.metadata.largeImageUrl === "string" ? card.metadata.largeImageUrl : card.imageUrl;
}
