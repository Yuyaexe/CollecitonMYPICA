"use client";

import { useEffect, useRef } from "react";
import { buildYgoImageUrl, pickYgoImageSizeForRarity } from "@/lib/yugioh/urls";
import { isCardTraderHostedImage, isCardTraderPlaceholderImage } from "@/lib/cardtrader/images";
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
  if (isCardTraderPlaceholderImage(card.imageUrl)) return true;
  if (card.cardTraderBlueprintId && isCardTraderHostedImage(card.imageUrl)) {
    return false;
  }
  if (isCardTraderHostedImage(card.imageUrl)) {
    return false;
  }
  if (!card.imageUrl) return true;
  if (card.imageUrl.includes("ygoprodeck.com")) {
    return !card.imageUrl.includes(`/${passcode}`);
  }
  return false;
}

/** YGOPRODeck art fallback only when CardTrader art is unavailable. */
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
