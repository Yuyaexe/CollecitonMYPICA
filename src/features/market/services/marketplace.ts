import type { DemoOwnedCard } from "@/lib/demo/types";
import { buildYgoProDeckUrl } from "@/lib/yugioh/urls";
import { resolveCardTraderProductUrl } from "@/lib/cardtrader/catalog";

export interface MarketplaceListing {
  source: string;
  name: string;
  price: number | null;
  currency: string;
  url: string;
  primary?: boolean;
}

export interface MarketplaceOptions {
  cardTraderPrice?: number | null;
  cardTraderCurrency?: string;
  cardTraderUrl?: string | null;
  ygoProDeckPrice?: number | null;
  ygoProDeckUrl?: string | null;
}

export function buildMarketplaceListings(
  card: DemoOwnedCard["card"],
  options?: MarketplaceOptions
): MarketplaceListing[] {
  const listings: MarketplaceListing[] = [];
  const encodedName = encodeURIComponent(card.name);
  const setPart = card.setName ? ` ${card.setName}` : "";
  const searchQuery = encodeURIComponent(`${card.name}${setPart}`.trim());

  const cardTraderPrice = options?.cardTraderPrice ?? null;
  const cardTraderCurrency = options?.cardTraderCurrency ?? "USD";
  const cardTraderUrl =
    options?.cardTraderUrl ??
    resolveCardTraderProductUrl({
      name: card.name,
      externalId: card.externalId,
      setName: card.setName,
      rarity: card.rarity,
      imageUrl: card.imageUrl,
    });

  const ygoUrl =
    options?.ygoProDeckUrl ?? buildYgoProDeckUrl(card.name, card.externalId);
  const ygoPrice = options?.ygoProDeckPrice ?? null;

  switch (card.gameSlug) {
    case "yugioh":
      listings.push(
        {
          source: "CardTrader",
          name: "CardTrader",
          price: cardTraderPrice,
          currency: cardTraderCurrency,
          url: cardTraderUrl,
          primary: true,
        },
        {
          source: "YGOPRODeck",
          name: "YGOPRODeck",
          price: ygoPrice,
          currency: "USD",
          url: ygoUrl,
        },
        {
          source: "Cardmarket",
          name: "Cardmarket",
          price: null,
          currency: "EUR",
          url: `https://www.cardmarket.com/en/YuGiOh/Products/Search?searchString=${searchQuery}`,
        },
        {
          source: "TCGPlayer",
          name: "TCGPlayer",
          price: null,
          currency: "USD",
          url: `https://www.tcgplayer.com/search/yugioh/product?q=${searchQuery}`,
        }
      );
      break;

    case "pokemon":
      listings.push(
        {
          source: "CardTrader",
          name: "CardTrader",
          price: cardTraderPrice,
          currency: cardTraderCurrency,
          url: cardTraderUrl,
          primary: true,
        },
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
        }
      );
      break;

    case "digimon":
      listings.push(
        {
          source: "CardTrader",
          name: "CardTrader",
          price: cardTraderPrice,
          currency: cardTraderCurrency,
          url: cardTraderUrl,
          primary: true,
        },
        {
          source: "TCGPlayer",
          name: "TCGPlayer",
          price: card.marketPrice,
          currency: "USD",
          url: `https://www.tcgplayer.com/search/digimon-card-game/product?q=${searchQuery}`,
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
      listings.push(
        {
          source: "CardTrader",
          name: "CardTrader",
          price: cardTraderPrice,
          currency: cardTraderCurrency,
          url: cardTraderUrl,
          primary: true,
        },
        {
          source: "TCGPlayer",
          name: "TCGPlayer",
          price: card.marketPrice,
          currency: "USD",
          url: `https://www.tcgplayer.com/search/all/product?q=${searchQuery}`,
        }
      );
  }

  return listings;
}

export function getPrimaryMarketplaceUrl(
  card: DemoOwnedCard["card"],
  options?: MarketplaceOptions
): string {
  return buildMarketplaceListings(card, options)[0]?.url ?? "#";
}

export function openMarketplaceInNewTab(
  card: DemoOwnedCard["card"],
  options?: MarketplaceOptions
): void {
  const url = getPrimaryMarketplaceUrl(card, options);
  if (url !== "#") window.open(url, "_blank", "noopener,noreferrer");
}
