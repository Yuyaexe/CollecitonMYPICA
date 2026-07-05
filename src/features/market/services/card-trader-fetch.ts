import type { CardPriceInput } from "@/lib/cardtrader";
import type { Currency } from "@/types/tcg";

export interface CardTraderQuoteResult {
  price: number | null;
  currency: Currency | string;
  url: string;
  blueprintId?: string | null;
  imageUrl?: string | null;
}

function quoteFromResponse(raw: CardTraderQuoteResult | null | undefined): CardTraderQuoteResult | null {
  if (!raw?.url) return null;
  return raw;
}

/** Fetch CardTrader quotes for one or more cards in a single API call. */
export async function fetchCardTraderPrices(
  cards: CardPriceInput[],
  currency: Currency
): Promise<Array<CardTraderQuoteResult | null>> {
  if (cards.length === 0) return [];

  const res = await fetch("/api/cards/prices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currency, cards }),
  });

  if (!res.ok) return cards.map(() => null);

  const json = (await res.json()) as {
    configured: boolean;
    prices: Array<CardTraderQuoteResult | null>;
  };

  if (!json.configured) return cards.map(() => null);
  return json.prices;
}

export async function fetchCardTraderQuote(
  input: CardPriceInput,
  currency: Currency
): Promise<CardTraderQuoteResult | null> {
  const prices = await fetchCardTraderPrices([input], currency);
  return quoteFromResponse(prices[0]);
}

export async function fetchCardTraderPriceMap(
  inputs: CardPriceInput[],
  keys: string[],
  currency: Currency
): Promise<Map<string, CardTraderQuoteResult>> {
  const map = new Map<string, CardTraderQuoteResult>();
  if (inputs.length === 0) return map;

  const prices = await fetchCardTraderPrices(inputs, currency);
  inputs.forEach((_input, index) => {
    const quote = quoteFromResponse(prices[index]);
    if (quote) map.set(keys[index], quote);
  });

  return map;
}
