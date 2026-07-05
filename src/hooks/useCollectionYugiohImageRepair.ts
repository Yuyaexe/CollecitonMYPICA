"use client";

import { useCallback } from "react";
import type { DemoOwnedCard } from "@/lib/demo/types";
import { useAppData } from "@/hooks/useAppData";
import { useYugiohImageRepairBatch } from "@/hooks/useYugiohImageRepairBatch";

/** Batch-repairs wrong Yu-Gi-Oh images once passcodes are resolved for the collection. */
export function useCollectionYugiohImageRepair(
  cards: DemoOwnedCard[],
  passcodes: Map<string, string | null> | undefined,
  isReady: boolean
): void {
  const { updateOwnedCard } = useAppData();

  const updateCard = useCallback(
    (id: string, cardUpdates: Partial<DemoOwnedCard["card"]>) => {
      void updateOwnedCard(id, { card: cardUpdates });
    },
    [updateOwnedCard]
  );

  useYugiohImageRepairBatch(cards, passcodes, isReady, updateCard);
}
