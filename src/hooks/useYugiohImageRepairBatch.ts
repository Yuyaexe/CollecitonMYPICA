"use client";

import { useEffect, useRef } from "react";
import { buildYgoImageUrl, isYgoCroppedImageUrl, pickYgoImageSizeForRarity } from "@/lib/yugioh/urls";
import { passcodeFromYgoImageUrl } from "@/lib/yugioh/lookup";
import { isCardTraderHostedImage, isCardTraderPlaceholderImage } from "@/lib/cardtrader/images";
import { isYugiohPasscodeId } from "@/lib/yugioh/passcode";
import type { DemoCard } from "@/lib/demo/types";

type RepairCardFields = Pick<
  DemoCard,
  "gameSlug" | "externalId" | "imageUrl" | "rarity" | "cardTraderBlueprintId"
>;

function needsRepair(card: RepairCardFields, passcode: string): boolean {
  if (card.gameSlug !== "yugioh") return false;
  if (isCardTraderPlaceholderImage(card.imageUrl)) return true;
  if (isCardTraderHostedImage(card.imageUrl)) return true;
  if (isYgoCroppedImageUrl(card.imageUrl)) return true;
  if (!card.imageUrl) return true;

  const imagePasscode = passcodeFromYgoImageUrl(card.imageUrl);
  if (imagePasscode && imagePasscode !== passcode) return true;

  if (isYugiohPasscodeId(card.externalId, card.imageUrl) && card.externalId !== passcode) {
    return true;
  }

  return false;
}

export function useYugiohImageRepairBatch(
  items: Array<{ id: string; card: RepairCardFields }>,
  passcodes: Map<string, string | null> | undefined,
  isReady: boolean,
  updateCard: (id: string, cardUpdates: Partial<RepairCardFields>) => void
): void {
  const repairedKeys = useRef(new Set<string>());

  useEffect(() => {
    if (!isReady || !passcodes?.size) return;

    for (const item of items) {
      if (item.card.gameSlug !== "yugioh") continue;

      const passcode = passcodes.get(item.id);
      if (!passcode) continue;

      const repairKey = `${item.id}:${passcode}:${item.card.imageUrl ?? ""}`;
      if (repairedKeys.current.has(repairKey)) continue;
      if (!needsRepair(item.card, passcode)) continue;

      const imageUrl = buildYgoImageUrl(passcode, pickYgoImageSizeForRarity(item.card.rarity));
      if (!imageUrl) continue;

      repairedKeys.current.add(repairKey);

      const cardUpdates: Partial<RepairCardFields> = { imageUrl };
      if (item.card.externalId !== passcode) {
        cardUpdates.externalId = passcode;
      }

      updateCard(item.id, cardUpdates);
    }
  }, [items, passcodes, isReady, updateCard]);
}
