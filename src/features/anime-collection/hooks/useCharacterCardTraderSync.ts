"use client";

import { useEffect, useRef } from "react";
import { isCardTraderHostedImage } from "@/lib/yugioh/passcode";
import { resolveStoredBlueprintId } from "@/lib/cardtrader";
import { digimonOwnedCardPriceFields } from "@/features/catalog/services/card-api/digimon.utils";
import { fetchCardTraderQuote } from "@/features/market/services/card-trader-quote";
import { cardTraderBlueprintMatchesCard } from "@/lib/cardtrader";
import type { AnimeCharacterCard } from "@/lib/demo/types";
import type { Currency } from "@/types/tcg";

const UPGRADE_DELAY_MS = 200;
const MAX_UPGRADES_PER_MOUNT = 32;

function needsCardTraderImageUpgrade(card: AnimeCharacterCard): boolean {
  return !isCardTraderHostedImage(card.card.imageUrl);
}

/** Slowly upgrades YGOPRODeck/catalog images to CardTrader art without hammering the API. */
export function useCharacterCardTraderSync(
  cards: AnimeCharacterCard[],
  currency: Currency,
  onUpdate: (
    id: string,
    updates: Partial<Omit<AnimeCharacterCard, "card">> & {
      card?: Partial<AnimeCharacterCard["card"]>;
    }
  ) => void
) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    const targets = cards.filter(needsCardTraderImageUpgrade).slice(0, MAX_UPGRADES_PER_MOUNT);
    if (targets.length === 0) return;

    let cancelled = false;

    async function run() {
      for (const entry of targets) {
        if (cancelled) return;

        const blueprintId = resolveStoredBlueprintId(
          entry.card.externalId,
          entry.card.imageUrl,
          entry.card.cardTraderBlueprintId,
          entry.card.gameSlug
        );

        try {
          const quote = await fetchCardTraderQuote(
            {
              gameSlug: entry.card.gameSlug,
              name: entry.card.name,
              setName: entry.card.setName,
              setCode: entry.card.setCode,
              collectorNumber: entry.card.collectorNumber,
              rarity: entry.card.rarity,
              imageUrl: entry.card.imageUrl,
              cardTraderBlueprintId: entry.card.cardTraderBlueprintId,
              blueprintId,
              ...(entry.card.gameSlug === "digimon"
                ? digimonOwnedCardPriceFields(entry.card)
                : {}),
            },
            currency
          );

          if (cancelled || !quote) continue;

          const bpId = quote.blueprintId ? Number(quote.blueprintId) : null;
          const blueprintValid =
            bpId != null &&
            Number.isFinite(bpId) &&
            cardTraderBlueprintMatchesCard(bpId, {
              rarity: entry.card.rarity,
              gameSlug: entry.card.gameSlug,
              imageUrl: entry.card.imageUrl,
              setCode: entry.card.setCode,
            });

          const updates: Partial<AnimeCharacterCard["card"]> = {};
          if (blueprintValid && quote.blueprintId && quote.blueprintId !== entry.card.cardTraderBlueprintId) {
            updates.cardTraderBlueprintId = quote.blueprintId;
          }
          if (quote.imageUrl && isCardTraderHostedImage(quote.imageUrl)) {
            updates.imageUrl = quote.imageUrl;
          }

          if (Object.keys(updates).length > 0) {
            onUpdateRef.current(entry.id, { card: updates });
          }
        } catch {
          // Skip failed upgrades
        }

        await new Promise((resolve) => setTimeout(resolve, UPGRADE_DELAY_MS));
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [cards, currency]);
}
