"use client";

import { useEffect, useRef } from "react";
import { buildYgoImageUrl, pickYgoImageSizeForRarity } from "@/lib/yugioh/urls";
import { passcodeFromYgoImageUrl } from "@/lib/yugioh/lookup";
import { isCardTraderHostedImage, isCardTraderPlaceholderImage } from "@/lib/cardtrader/images";
import { isYugiohPasscodeId } from "@/lib/yugioh/passcode";
import type { DemoOwnedCard } from "@/lib/demo/types";
import { useAppData } from "@/hooks/useAppData";

function needsRepair(
  card: DemoOwnedCard["card"],
  passcode: string
): boolean {
  if (card.gameSlug !== "yugioh") return false;
  if (isCardTraderPlaceholderImage(card.imageUrl)) return true;
  if (isCardTraderHostedImage(card.imageUrl)) return true;
  if (!card.imageUrl) return true;

  const imagePasscode = passcodeFromYgoImageUrl(card.imageUrl);
  if (imagePasscode && imagePasscode !== passcode) return true;

  if (
    isYugiohPasscodeId(card.externalId, card.imageUrl) &&
    card.externalId !== passcode
  ) {
    return true;
  }

  return false;
}

/** Batch-repairs wrong Yu-Gi-Oh images once passcodes are resolved for the collection. */
export function useCollectionYugiohImageRepair(
  cards: DemoOwnedCard[],
  passcodes: Map<string, string | null> | undefined,
  isReady: boolean
): void {
  const { updateOwnedCard } = useAppData();
  const repairedKeys = useRef(new Set<string>());

  useEffect(() => {
    if (!isReady || !passcodes?.size) return;

    for (const item of cards) {
      if (item.card.gameSlug !== "yugioh") continue;

      const passcode = passcodes.get(item.id);
      if (!passcode) continue;

      const repairKey = `${item.id}:${passcode}:${item.card.imageUrl ?? ""}`;
      if (repairedKeys.current.has(repairKey)) continue;
      if (!needsRepair(item.card, passcode)) continue;

      const imageUrl = buildYgoImageUrl(passcode, pickYgoImageSizeForRarity(item.card.rarity));
      if (!imageUrl) continue;

      repairedKeys.current.add(repairKey);

      const cardUpdates: Partial<DemoOwnedCard["card"]> = { imageUrl };
      if (item.card.externalId !== passcode) {
        cardUpdates.externalId = passcode;
      }

      void updateOwnedCard(item.id, { card: cardUpdates });
    }
  }, [cards, passcodes, isReady, updateOwnedCard]);
}
