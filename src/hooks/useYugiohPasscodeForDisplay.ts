"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchYugiohPasscodeForCard,
  passcodeFromYgoImageUrl,
} from "@/lib/yugioh/lookup";
import { isYugiohPasscodeId } from "@/lib/yugioh/passcode";
import type { DemoCard } from "@/lib/demo/types";

type CardPasscodeFields = Pick<
  DemoCard,
  "name" | "gameSlug" | "externalId" | "imageUrl" | "setCode" | "collectorNumber"
>;

/**
 * Returns Konami passcode for Yu-Gi-Oh art.
 * - `undefined` while resolving (do not use stored passcode yet)
 * - `string` when resolved
 * - `null` when resolution failed
 */
export function useYugiohPasscodeForDisplay(
  card: CardPasscodeFields
): string | null | undefined {
  const { data: resolvedPasscode, isFetched } = useQuery({
    queryKey: ["ygo-passcode", card.name, card.setCode, card.collectorNumber],
    queryFn: () =>
      fetchYugiohPasscodeForCard({
        name: card.name,
        setCode: card.setCode,
        collectorNumber: card.collectorNumber,
      }),
    enabled: card.gameSlug === "yugioh" && Boolean(card.name.trim()),
    staleTime: 24 * 60 * 60 * 1000,
  });

  if (card.gameSlug !== "yugioh") return null;
  if (!isFetched) return undefined;

  if (resolvedPasscode && isYugiohPasscodeId(resolvedPasscode, null)) {
    return resolvedPasscode;
  }

  const storedPasscode =
    (isYugiohPasscodeId(card.externalId, card.imageUrl) ? card.externalId : null) ??
    passcodeFromYgoImageUrl(card.imageUrl);

  return storedPasscode && isYugiohPasscodeId(storedPasscode, null) ? storedPasscode : null;
}

export function needsYugiohPasscodeLookup(card: CardPasscodeFields): boolean {
  return card.gameSlug === "yugioh" && !isYugiohPasscodeId(card.externalId, card.imageUrl);
}
