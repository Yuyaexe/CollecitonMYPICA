"use client";

import { create } from "zustand";
import type { Currency } from "@/types/tcg";

export interface BulkCardTraderQuote {
  price: number | null;
  currency: Currency;
  url: string;
  blueprintId?: string | null;
  imageUrl?: string | null;
}

interface CardTraderBulkStore {
  quotesByKey: Record<string, BulkCardTraderQuote>;
  mergeQuote: (key: string, quote: BulkCardTraderQuote) => void;
  clearQuotes: () => void;
}

export const useCardTraderBulkStore = create<CardTraderBulkStore>((set) => ({
  quotesByKey: {},
  mergeQuote: (key, quote) =>
    set((s) => ({
      quotesByKey: { ...s.quotesByKey, [key]: quote },
    })),
  clearQuotes: () => set({ quotesByKey: {} }),
}));
