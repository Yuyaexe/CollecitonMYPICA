"use client";

import { useCallback, useMemo, type ReactNode } from "react";
import { useYugiohPasscodeContext } from "@/features/collection/context/yugioh-passcode-context";
import { useYugiohImageRepairBatch } from "@/hooks/useYugiohImageRepairBatch";
import type { AnimeCharacterCard } from "@/lib/demo/types";

export function useAnimeYugiohPasscodeSync(
  cards: AnimeCharacterCard[],
  onUpdate: (
    id: string,
    updates: Partial<Omit<AnimeCharacterCard, "card">> & {
      card?: Partial<AnimeCharacterCard["card"]>;
    }
  ) => void
): void {
  const ctx = useYugiohPasscodeContext();

  const items = useMemo(
    () => cards.map((entry) => ({ id: entry.id, card: entry.card })),
    [cards]
  );

  const applyRepairs = useCallback(
    (repairs: Array<{ id: string; updates: Partial<AnimeCharacterCard["card"]> }>) => {
      for (const repair of repairs) {
        onUpdate(repair.id, { card: repair.updates });
      }
    },
    [onUpdate]
  );

  useYugiohImageRepairBatch(items, ctx?.map, ctx?.isReady ?? false, applyRepairs);
}

export function AnimeYugiohPasscodeSync({
  cards,
  onUpdate,
  children,
}: {
  cards: AnimeCharacterCard[];
  onUpdate: (
    id: string,
    updates: Partial<Omit<AnimeCharacterCard, "card">> & {
      card?: Partial<AnimeCharacterCard["card"]>;
    }
  ) => void;
  children: ReactNode;
}) {
  useAnimeYugiohPasscodeSync(cards, onUpdate);
  return <>{children}</>;
}
