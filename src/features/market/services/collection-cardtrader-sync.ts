import { cardTraderBlueprintMatchesCard } from "@/lib/cardtrader";
import {
  cardPriceKey,
  ownedCardToPriceInput,
} from "@/features/market/hooks/useCardTraderPrices";
import { fetchCardTraderQuote } from "@/features/market/services/card-trader-quote";
import type { BulkCardTraderQuote } from "@/features/collection/stores/cardtrader-bulk.store";
import type { DemoOwnedCard } from "@/lib/demo/types";
import type { Currency } from "@/types/tcg";

export type CardTraderSyncMode = "links" | "full";

const SYNC_BATCH_SIZE = 4;
const SYNC_BATCH_DELAY_MS = 120;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Unique print variants in collection (no 48-cap). */
export function dedupeOwnedCardsForSync(cards: DemoOwnedCard[]): DemoOwnedCard[] {
  const seen = new Set<string>();
  const list: DemoOwnedCard[] = [];
  for (const item of cards) {
    const key = cardPriceKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    list.push(item);
  }
  return list;
}

function ownedIdsForKey(cards: DemoOwnedCard[], key: string): string[] {
  return cards.filter((c) => cardPriceKey(c) === key).map((c) => c.id);
}

function cardMeta(item: DemoOwnedCard) {
  return {
    rarity: item.card.rarity,
    gameSlug: item.card.gameSlug,
    imageUrl: item.card.imageUrl,
    setCode: item.card.setCode,
  };
}

function blueprintUpdatesFromQuote(
  item: DemoOwnedCard,
  quote: BulkCardTraderQuote
): Partial<DemoOwnedCard["card"]> | null {
  const bpId = quote.blueprintId ? Number(quote.blueprintId) : null;
  const valid =
    bpId != null &&
    Number.isFinite(bpId) &&
    cardTraderBlueprintMatchesCard(bpId, cardMeta(item));

  const updates: Partial<DemoOwnedCard["card"]> = {};

  if (valid && quote.blueprintId !== item.card.cardTraderBlueprintId) {
    updates.cardTraderBlueprintId = quote.blueprintId!;
  } else if (
    !valid &&
    item.card.cardTraderBlueprintId &&
    bpId != null &&
    !cardTraderBlueprintMatchesCard(Number(item.card.cardTraderBlueprintId), cardMeta(item))
  ) {
    updates.cardTraderBlueprintId = null;
  }

  if (quote.imageUrl && quote.imageUrl !== item.card.imageUrl) {
    updates.imageUrl = quote.imageUrl;
  }

  return Object.keys(updates).length > 0 ? updates : null;
}

function toBulkQuote(
  quote: Awaited<ReturnType<typeof fetchCardTraderQuote>>,
  currency: Currency
): BulkCardTraderQuote | null {
  if (!quote?.url) return null;
  return {
    price: quote.price,
    currency,
    url: quote.url,
    blueprintId: quote.blueprintId ?? null,
    imageUrl: quote.imageUrl ?? null,
  };
}

export interface CollectionCardTraderSyncProgress {
  current: number;
  total: number;
  updated: number;
  skipped: number;
}

export interface CollectionCardTraderSyncOptions {
  cards: DemoOwnedCard[];
  currency: Currency;
  mode: CardTraderSyncMode;
  shouldCancel: () => boolean;
  onProgress: (progress: CollectionCardTraderSyncProgress) => void;
  onQuote: (key: string, quote: BulkCardTraderQuote) => void;
  updateOwnedCard: (
    id: string,
    updates: Partial<Omit<DemoOwnedCard, "card">> & { card?: Partial<DemoOwnedCard["card"]> }
  ) => void | Promise<void>;
}

export async function runCollectionCardTraderSync(
  options: CollectionCardTraderSyncOptions
): Promise<{ updated: number; skipped: number }> {
  const { cards, currency, mode, shouldCancel, onProgress, onQuote, updateOwnedCard } = options;
  const targets = dedupeOwnedCardsForSync(cards);
  const total = targets.length;
  let current = 0;
  let updated = 0;
  let skipped = 0;

  const report = () => onProgress({ current, total, updated, skipped });

  report();

  for (let i = 0; i < targets.length; i += SYNC_BATCH_SIZE) {
    if (shouldCancel()) break;

    const batch = targets.slice(i, i + SYNC_BATCH_SIZE);

    await Promise.all(
      batch.map(async (representative) => {
        if (shouldCancel()) return;

        const key = cardPriceKey(representative);
        const input = ownedCardToPriceInput(representative);
        const freshInput = {
          ...input,
          cardTraderBlueprintId: null,
          blueprintId: null,
        };

        try {
          const raw = await fetchCardTraderQuote(freshInput, currency);
          const quote = toBulkQuote(raw, currency);

          if (!quote) {
            skipped += 1;
            return;
          }

          const ids = ownedIdsForKey(cards, key);
          let variantUpdated = false;

          for (const id of ids) {
            const item = cards.find((c) => c.id === id);
            if (!item) continue;
            const cardUpdates = blueprintUpdatesFromQuote(item, quote);
            if (cardUpdates) {
              await updateOwnedCard(id, { card: cardUpdates });
              variantUpdated = true;
            }
          }

          if (variantUpdated) updated += 1;
          if (mode === "full" || quote.blueprintId) {
            onQuote(key, quote);
          }
        } catch {
          skipped += 1;
        }
      })
    );

    current = Math.min(i + batch.length, total);
    report();

    if (i + SYNC_BATCH_SIZE < targets.length && !shouldCancel()) {
      await sleep(SYNC_BATCH_DELAY_MS);
    }
  }

  return { updated, skipped };
}
