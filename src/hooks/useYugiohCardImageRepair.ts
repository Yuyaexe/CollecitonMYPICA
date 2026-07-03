"use client";

import { useEffect, useRef } from "react";
import { buildYgoImageUrl, pickYgoImageSizeForRarity } from "@/lib/yugioh/urls";
import { resolveStoredBlueprintId } from "@/lib/cardtrader";
import type { DemoCard } from "@/lib/demo/types";
import { useAppData } from "@/hooks/useAppData";

type RepairCardFields = Pick<
  DemoCard,
  "gameSlug" | "externalId" | "imageUrl" | "rarity" | "cardTraderBlueprintId"
>;

function imageNeedsYugiohRepair(
  card: RepairCardFields,
  passcode: string
): boolean {
  if (card.gameSlug !== "yugioh") return false;
  if (!card.imageUrl) return true;
  if (card.imageUrl.includes("ygoprodeck.com")) {
    return !card.imageUrl.includes(`/${passcode}`);
  }
  if (/cardtrader\.com|product-images\.cardtrader/i.test(card.imageUrl)) {
    return false;
  }
  const wrongBlueprint = resolveStoredBlueprintId(card.externalId, card.imageUrl);
  if (wrongBlueprint != null && card.externalId === String(wrongBlueprint)) {
    return true;
  }
  return false;
}

/** Persist corrected YGOPRODeck art when passcode is known but stored imageUrl is wrong. */
export function useYugiohCardImageRepair(
  ownedCardId: string | undefined,
  card: RepairCardFields,
  passcode: string | null
): void {
  const { updateOwnedCard } = useAppData();
  const repairedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!ownedCardId || !passcode || card.gameSlug !== "yugioh") return;
    if (repairedRef.current === ownedCardId) return;
    if (!imageNeedsYugiohRepair(card, passcode)) return;

    const imageUrl = buildYgoImageUrl(passcode, pickYgoImageSizeForRarity(card.rarity));
    if (!imageUrl) return;

    repairedRef.current = ownedCardId;
    updateOwnedCard(ownedCardId, { card: { imageUrl } });
  }, [ownedCardId, card, passcode, updateOwnedCard]);
}
