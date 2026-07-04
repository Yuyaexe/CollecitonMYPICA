import { convertToCurrency } from "@/lib/cardtrader/convert-currency";
import type { Currency } from "@/types/tcg";

/** YGOPRODeck / catalog prices are USD; CardTrader live quotes match profile currency. */
export function normalizeCatalogPrice(
  price: number | null | undefined,
  profileCurrency: Currency
): number | null {
  if (price == null) return null;
  if (profileCurrency === "USD") return price;
  return convertToCurrency(price, "USD", profileCurrency);
}
