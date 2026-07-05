import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number,
  currency: "USD" | "BRL" = "USD"
): string {
  const code = currency === "BRL" ? "BRL" : "USD";
  const locale = code === "BRL" ? "pt-BR" : "en-US";
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: code,
  }).format(safeAmount);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}
