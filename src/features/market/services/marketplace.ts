import type { DemoOwnedCard } from "@/lib/demo/types";

export interface MarketplaceListing {
  source: string;
  name: string;
  price: number | null;
  currency: string;
  url: string;
}

export function buildMarketplaceListings(card: DemoOwnedCard["card"]): MarketplaceListing[] {
  const listings: MarketplaceListing[] = [];
  const encodedName = encodeURIComponent(card.name);
  const setPart = card.setName ? ` ${card.setName}` : "";
  const searchQuery = encodeURIComponent(`${card.name}${setPart}`.trim());

  switch (card.gameSlug) {
    case "yugioh":
      listings.push(
        {
          source: "TCGPlayer",
          name: "TCGPlayer",
          price: card.marketPrice,
          currency: "USD",
          url: `https://www.tcgplayer.com/search/yugioh/product?q=${searchQuery}`,
        },
        {
          source: "Cardmarket",
          name: "Cardmarket",
          price: null,
          currency: "EUR",
          url: `https://www.cardmarket.com/en/YuGiOh/Products/Search?searchString=${searchQuery}`,
        },
        {
          source: "YGOPRODeck",
          name: "YGOPRODeck",
          price: card.marketPrice,
          currency: "USD",
          url: card.externalId
            ? `https://ygoprodeck.com/card/${card.externalId}`
            : `https://ygoprodeck.com/card-database/?search=${searchQuery}`,
        }
      );
      break;

    case "pokemon":
      listings.push(
        {
          source: "TCGPlayer",
          name: "TCGPlayer",
          price: card.marketPrice,
          currency: "USD",
          url: `https://www.tcgplayer.com/search/pokemon/product?q=${searchQuery}`,
        },
        {
          source: "Cardmarket",
          name: "Cardmarket",
          price: null,
          currency: "EUR",
          url: `https://www.cardmarket.com/en/Pokemon/Products/Search?searchString=${searchQuery}`,
        },
        {
          source: "PokemonTCG",
          name: "Pokemon TCG API",
          price: card.marketPrice,
          currency: "USD",
          url: card.externalId
            ? `https://www.pokemon.com/us/pokemon-tcg/pokemon-cards/series/${card.setCode ?? ""}/${card.externalId}`
            : `https://www.tcgplayer.com/search/pokemon/product?q=${searchQuery}`,
        }
      );
      break;

    case "digimon":
      listings.push(
        {
          source: "TCGPlayer",
          name: "TCGPlayer",
          price: card.marketPrice,
          currency: "USD",
          url: `https://www.tcgplayer.com/search/digimon-card-game/product?q=${searchQuery}`,
        },
        {
          source: "DigimonCard",
          name: "DigimonCard.io",
          price: null,
          currency: "USD",
          url: card.collectorNumber
            ? `https://digimoncard.io/card/${card.collectorNumber.toLowerCase()}`
            : `https://digimoncard.io/card-database/?search=${encodedName}`,
        },
        {
          source: "Cardmarket",
          name: "Cardmarket",
          price: null,
          currency: "EUR",
          url: `https://www.cardmarket.com/en/Digimon/Products/Search?searchString=${searchQuery}`,
        }
      );
      break;

    default:
      listings.push({
        source: "TCGPlayer",
        name: "TCGPlayer",
        price: card.marketPrice,
        currency: "USD",
        url: `https://www.tcgplayer.com/search/all/product?q=${searchQuery}`,
      });
  }

  return listings;
}

export function getPrimaryMarketplaceUrl(card: DemoOwnedCard["card"]): string {
  return buildMarketplaceListings(card)[0]?.url ?? "#";
}

export function openMarketplaceInNewTab(card: DemoOwnedCard["card"]): void {
  const url = getPrimaryMarketplaceUrl(card);
  if (url !== "#") window.open(url, "_blank", "noopener,noreferrer");
}
