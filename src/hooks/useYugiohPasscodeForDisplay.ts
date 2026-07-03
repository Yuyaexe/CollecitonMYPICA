"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchYugiohCardByName } from "@/lib/yugioh/lookup";
import { isYugiohPasscodeId, resolveYugiohPasscode } from "@/lib/yugioh/passcode";
import type { DemoCard } from "@/lib/demo/types";

type CardPasscodeFields = Pick<DemoCard, "name" | "gameSlug" | "externalId" | "imageUrl">;

export function useYugiohPasscodeForDisplay(card: CardPasscodeFields): string | null {
  const storedPasscode = resolveYugiohPasscode(card.externalId, card.imageUrl);
  const needsLookup =
    card.gameSlug === "yugioh" && Boolean(card.name.trim()) && !storedPasscode;

  const { data: lookedUpPasscode } = useQuery({
    queryKey: ["ygo-passcode", card.name],
    queryFn: async () => {
      const result = await fetchYugiohCardByName(card.name);
      return result?.externalId ?? null;
    },
    enabled: needsLookup,
    staleTime: 24 * 60 * 60 * 1000,
  });

  return resolveYugiohPasscode(card.externalId, card.imageUrl, lookedUpPasscode);
}

export function needsYugiohPasscodeLookup(card: CardPasscodeFields): boolean {
  return card.gameSlug === "yugioh" && !isYugiohPasscodeId(card.externalId, card.imageUrl);
}
