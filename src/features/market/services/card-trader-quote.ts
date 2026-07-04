import type { CardPriceInput } from "@/lib/cardtrader";

export interface CardTraderQuoteResult {
  price: number | null;
  currency: string;
  url: string;
  blueprintId?: string | null;
  imageUrl?: string | null;
}

export async function fetchCardTraderQuote(
  input: CardPriceInput,
  currency: "USD" | "BRL"
): Promise<CardTraderQuoteResult | null> {
  const res = await fetch("/api/cards/prices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currency, cards: [input] }),
  });

  if (!res.ok) return null;

  const json = (await res.json()) as {
    configured: boolean;
    prices: Array<CardTraderQuoteResult | null>;
  };

  if (!json.configured) return null;
  const quote = json.prices[0];
  if (!quote?.url) return null;
  return quote;
}
