"use client";

import { useEffect, useRef } from "react";
import { buildYgoImageUrl, isYgoCroppedImageUrl, pickYgoImageSizeForRarity } from "@/lib/yugioh/urls";
import { passcodeFromYgoImageUrl } from "@/lib/yugioh/lookup";
import { isCardTraderHostedImage, isCardTraderPlaceholderImage } from "@/lib/cardtrader/images";
import { isYugiohPasscodeId } from "@/lib/yugioh/passcode";
import type { DemoCard } from "@/lib/demo/types";

/** Survives collection page unmount — avoids re-repairing the same card every visit. */
const repairedKeysGlobal = new Set<string>();

type RepairCardFields = Pick<
  DemoCard,
  "gameSlug" | "externalId" | "imageUrl" | "rarity" | "cardTraderBlueprintId"
>;

export type YugiohImageRepair = { id: string; updates: Partial<RepairCardFields> };

export function needsYugiohImageRepair(card: RepairCardFields, passcode: string): boolean {
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

/** Pure repair payload — keep CardTrader blueprint externalIds intact. */
export function buildYugiohImageRepairUpdates(
  card: RepairCardFields,
  passcode: string
): Partial<RepairCardFields> | null {
  if (!needsYugiohImageRepair(card, passcode)) return null;

  const imageUrl = buildYgoImageUrl(passcode, pickYgoImageSizeForRarity(card.rarity));
  if (!imageUrl) return null;

  const cardUpdates: Partial<RepairCardFields> = { imageUrl };
  // Match single-card repair: only rewrite externalId when it is already a passcode.
  if (
    card.externalId !== passcode &&
    isYugiohPasscodeId(card.externalId, card.imageUrl)
  ) {
    cardUpdates.externalId = passcode;
  }

  return cardUpdates;
}

export function useYugiohImageRepairBatch(
  items: Array<{ id: string; card: RepairCardFields }>,
  passcodes: Map<string, string | null> | undefined,
  isReady: boolean,
  applyRepairs: (repairs: YugiohImageRepair[]) => void
): void {
  const applyRepairsRef = useRef(applyRepairs);
  applyRepairsRef.current = applyRepairs;

  useEffect(() => {
    if (!isReady || !passcodes?.size) return;

    const repairs: YugiohImageRepair[] = [];

    for (const item of items) {
      if (item.card.gameSlug !== "yugioh") continue;

      const passcode = passcodes.get(item.id);
      if (!passcode) continue;

      const repairKey = `${item.id}:${passcode}`;
      if (repairedKeysGlobal.has(repairKey)) continue;

      const cardUpdates = buildYugiohImageRepairUpdates(item.card, passcode);
      if (!cardUpdates) {
        repairedKeysGlobal.add(repairKey);
        continue;
      }

      repairedKeysGlobal.add(repairKey);
      repairs.push({ id: item.id, updates: cardUpdates });
    }

    if (repairs.length === 0) return;
    applyRepairsRef.current(repairs);
  }, [items, passcodes, isReady]);
}
