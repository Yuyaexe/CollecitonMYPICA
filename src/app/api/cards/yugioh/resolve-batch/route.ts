import { NextRequest, NextResponse } from "next/server";
import {
  resolveYugiohPasscodeForCard,
  yugiohPasscodeCacheKey,
  type YugiohPasscodeInput,
} from "@/lib/yugioh/resolve-passcode";

interface BatchCard extends YugiohPasscodeInput {
  id: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { cards?: BatchCard[] };
    const cards = body.cards ?? [];
    if (cards.length === 0) {
      return NextResponse.json({ passcodes: {} as Record<string, string | null> });
    }

    const uniqueByKey = new Map<string, BatchCard>();
    for (const card of cards) {
      if (!card.id || !card.name?.trim()) continue;
      uniqueByKey.set(yugiohPasscodeCacheKey(card), card);
    }

    const resolvedByKey = new Map<string, string | null>();
    await Promise.all(
      [...uniqueByKey.entries()].map(async ([key, card]) => {
        resolvedByKey.set(key, await resolveYugiohPasscodeForCard(card));
      })
    );

    const passcodes: Record<string, string | null> = {};
    for (const card of cards) {
      if (!card.id || !card.name?.trim()) {
        passcodes[card.id] = null;
        continue;
      }
      passcodes[card.id] = resolvedByKey.get(yugiohPasscodeCacheKey(card)) ?? null;
    }

    return NextResponse.json({ passcodes });
  } catch (error) {
    console.error("POST /api/cards/yugioh/resolve-batch", error);
    return NextResponse.json({ error: "Failed to resolve passcodes" }, { status: 500 });
  }
}
