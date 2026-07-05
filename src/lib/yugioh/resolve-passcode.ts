import { yugiohAdapter } from "@/features/catalog/services/card-api/yugioh.adapter";
import {
  yugiohCardNamesMatch,
  yugiohSetNumberRef,
} from "@/lib/yugioh/lookup";

export interface YugiohPasscodeInput {
  name: string;
  setCode?: string | null;
  collectorNumber?: string | null;
}

const passcodeCache = new Map<string, string | null>();

async function resolveYugiohPasscodeUncached(
  card: YugiohPasscodeInput
): Promise<string | null> {
  const setRef = yugiohSetNumberRef(card.setCode, card.collectorNumber);
  if (setRef) {
    const bySet = await yugiohAdapter.getBySetNumber(setRef);
    if (bySet?.externalId) {
      if (!card.name.trim() || yugiohCardNamesMatch(bySet.name, card.name)) {
        return bySet.externalId;
      }
    }
  }

  const trimmed = card.name.trim();
  if (!trimmed) return null;

  const results = await yugiohAdapter.searchByNameOnly(trimmed);
  const match = results.find((result) => yugiohCardNamesMatch(result.name, trimmed));
  return match?.externalId ?? null;
}

/** Server-side Yu-Gi-Oh passcode resolution (set number first, then exact name). */
export async function resolveYugiohPasscodeForCard(
  card: YugiohPasscodeInput
): Promise<string | null> {
  const key = yugiohPasscodeCacheKey(card);
  if (passcodeCache.has(key)) {
    return passcodeCache.get(key) ?? null;
  }

  const result = await resolveYugiohPasscodeUncached(card);
  passcodeCache.set(key, result);
  return result;
}

export function yugiohPasscodeCacheKey(card: YugiohPasscodeInput): string {
  return [
    card.name.trim().toLowerCase(),
    (card.collectorNumber ?? card.setCode ?? "").trim().toUpperCase(),
  ].join("|");
}

/** Resolve many unique cards with bounded concurrency. */
export async function resolveYugiohPasscodesConcurrent(
  cards: YugiohPasscodeInput[],
  concurrency = 8
): Promise<Map<string, string | null>> {
  const resolved = new Map<string, string | null>();
  let index = 0;

  async function worker() {
    while (index < cards.length) {
      const current = cards[index++];
      const key = yugiohPasscodeCacheKey(current);
      resolved.set(key, await resolveYugiohPasscodeForCard(current));
    }
  }

  const workers = Math.min(concurrency, Math.max(cards.length, 1));
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return resolved;
}
