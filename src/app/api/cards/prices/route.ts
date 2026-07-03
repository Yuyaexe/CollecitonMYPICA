import { NextRequest, NextResponse } from "next/server";
import {
  getCardTraderPriceForProfile,
  isCardTraderConfigured,
  type CardTraderClientQuote,
} from "@/lib/cardtrader";
import type { CardPriceInput } from "@/lib/cardtrader";
import type { Currency } from "@/types/tcg";

const MAX_BATCH = 12;
const BATCH_DELAY_MS = 50;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  if (!isCardTraderConfigured()) {
    return NextResponse.json({
      configured: false,
      prices: [],
    });
  }

  try {
    const body = (await request.json()) as {
      cards?: CardPriceInput[];
      currency?: Currency;
    };

    const cards = (body.cards ?? []).slice(0, MAX_BATCH);
    const currency = body.currency ?? "USD";
    const prices: Array<CardTraderClientQuote | null> = [];

    for (let i = 0; i < cards.length; i++) {
      try {
        const quote = await getCardTraderPriceForProfile(cards[i], currency);
        prices.push(quote);
      } catch {
        prices.push(null);
      }
      if (i < cards.length - 1) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    return NextResponse.json({ configured: true, prices });
  } catch (error) {
    console.error("POST /api/cards/prices", error);
    return NextResponse.json({ error: "Price lookup failed" }, { status: 500 });
  }
}
