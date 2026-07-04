"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCollectionYugiohImageRepair } from "@/hooks/useCollectionYugiohImageRepair";
import type { DemoOwnedCard } from "@/lib/demo/types";

type PasscodeMap = Map<string, string | null>;

const YugiohPasscodeContext = createContext<{
  map: PasscodeMap;
  isReady: boolean;
} | null>(null);

async function fetchPasscodeBatch(
  cards: DemoOwnedCard[]
): Promise<Record<string, string | null>> {
  const yugiohCards = cards.filter((c) => c.card.gameSlug === "yugioh" && c.card.name.trim());
  if (yugiohCards.length === 0) return {};

  const res = await fetch("/api/cards/yugioh/resolve-batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cards: yugiohCards.map((c) => ({
        id: c.id,
        name: c.card.name,
        setCode: c.card.setCode,
        collectorNumber: c.card.collectorNumber,
      })),
    }),
  });

  if (!res.ok) return {};
  const json = (await res.json()) as { passcodes?: Record<string, string | null> };
  return json.passcodes ?? {};
}

export function YugiohPasscodeProvider({
  cards,
  children,
}: {
  cards: DemoOwnedCard[];
  children: ReactNode;
}) {
  const yugiohIds = cards
    .filter((c) => c.card.gameSlug === "yugioh")
    .map((c) => c.id)
    .sort()
    .join(",");

  const { data, isFetched } = useQuery({
    queryKey: ["ygo-passcode-batch", yugiohIds],
    queryFn: () => fetchPasscodeBatch(cards),
    enabled: yugiohIds.length > 0,
    staleTime: 24 * 60 * 60 * 1000,
  });

  const map = new Map<string, string | null>(Object.entries(data ?? {}));

  return (
    <YugiohPasscodeContext.Provider
      value={{ map, isReady: isFetched || yugiohIds.length === 0 }}
    >
      {children}
    </YugiohPasscodeContext.Provider>
  );
}

export function useYugiohPasscodeContext() {
  return useContext(YugiohPasscodeContext);
}

export function YugiohPasscodeSync({
  cards,
  children,
}: {
  cards: DemoOwnedCard[];
  children: ReactNode;
}) {
  const ctx = useYugiohPasscodeContext();
  useCollectionYugiohImageRepair(cards, ctx?.map, ctx?.isReady ?? false);
  return <>{children}</>;
}

export function resolvePasscodeFromContext(
  ownedCardId: string | undefined,
  context: { map: PasscodeMap; isReady: boolean } | null
): string | null | undefined {
  if (!context) return undefined;
  if (!context.isReady) return undefined;
  if (!ownedCardId) return null;
  return context.map.get(ownedCardId) ?? null;
}
