"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchYugiohCardByName } from "@/lib/yugioh/lookup";
import { isYugiohPasscodeId, resolveYugiohPasscode } from "@/lib/yugioh/passcode";
import type { DemoCard } from "@/lib/demo/types";

type CardPasscodeFields = Pick<DemoCard, "name" | "gameSlug" | "externalId" | "imageUrl">;

export function useYugiohPasscodeForDisplay(card: CardPasscodeFields): string | null {
  const storedPasscode = isYugiohPasscodeId(card.externalId, card.imageUrl)
    ? card.externalId!
    : null;

  const { data: lookedUpPasscode } = useQuery({
    queryKey: ["ygo-passcode", card.name],
    queryFn: async () => {
      const result = await fetchYugiohCardByName(card.name);
      return result?.externalId ?? null;
    },
    enabled: card.gameSlug === "yugioh" && Boolean(card.name.trim()),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const namePasscode =
    lookedUpPasscode && isYugiohPasscodeId(lookedUpPasscode, null) ? lookedUpPasscode : null;

  // Card name wins when stored passcode points at a different card (bad import / CardTrader mix-up).
  if (namePasscode && storedPasscode && namePasscode !== storedPasscode) {
    return namePasscode;
  }
  if (namePasscode) return namePasscode;
  if (storedPasscode) return storedPasscode;
  return null;
}

export function needsYugiohPasscodeLookup(card: CardPasscodeFields): boolean {
  return card.gameSlug === "yugioh" && !isYugiohPasscodeId(card.externalId, card.imageUrl);
}
