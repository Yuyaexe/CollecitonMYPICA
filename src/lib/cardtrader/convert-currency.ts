import type { Currency } from "@/types/tcg";

/** Static rates — CardTrader returns account currency; normalize for profile display. */
const TO_USD: Record<string, number> = {
  USD: 1,
  EUR: 1.08,
  BRL: 0.18,
  GBP: 1.27,
};

export function convertToCurrency(
  amount: number,
  fromCurrency: string,
  target: Currency
): number {
  const from = fromCurrency.toUpperCase();
  const usd = amount * (TO_USD[from] ?? 1);
  if (target === "USD") return Math.round(usd * 100) / 100;
  if (target === "BRL") return Math.round(usd * (1 / TO_USD.BRL) * 100) / 100;
  return amount;
}

export function centsToAmount(cents: number): number {
  return Math.round(cents) / 100;
}
