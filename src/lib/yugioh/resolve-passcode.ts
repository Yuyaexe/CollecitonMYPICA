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

/** Server-side Yu-Gi-Oh passcode resolution (set number first, then exact name). */
export async function resolveYugiohPasscodeForCard(
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

export function yugiohPasscodeCacheKey(card: YugiohPasscodeInput): string {
  return [
    card.name.trim().toLowerCase(),
    (card.collectorNumber ?? card.setCode ?? "").trim().toUpperCase(),
  ].join("|");
}
