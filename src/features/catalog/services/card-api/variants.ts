import type { CardSearchResult } from "./types";
import {
  buildYgoImageUrl,
  buildYgoProDeckUrl,
  pickYgoImageSizeForRarity,
} from "@/lib/yugioh/urls";

export interface CardPrintVariant {
  key: string;
  setCode: string | null;
  setName: string | null;
  rarity: string | null;
  /** YGOPRODeck secondary reference price (TCGPlayer from API) */
  price: number | null;
  externalId: string | null;
  imageUrl: string | null;
  ygoProDeckUrl: string;
}

type YgoSet = {
  set_name: string;
  set_code: string;
  set_rarity: string;
  set_rarity_code: string;
  set_price: string;
};

function ygoSetsFromResult(result: CardSearchResult): YgoSet[] {
  return (result.metadata?.sets as YgoSet[] | undefined) ?? [];
}

function findPrintForSet(
  relatedPrints: CardSearchResult[],
  setCode: string,
  setRarity: string
): CardSearchResult | undefined {
  return relatedPrints.find((print) => {
    const sets = ygoSetsFromResult(print);
    return sets.some((s) => s.set_code === setCode && s.set_rarity === setRarity);
  });
}

type CardTraderPrint = CardSearchResult;

function cardtraderPrintsFromResult(result: CardSearchResult): CardTraderPrint[] {
  const prints = result.metadata?.cardtraderPrints as CardSearchResult[] | undefined;
  if (prints?.length) return prints;
  if (result.metadata?.catalogSource === "cardtrader") return [result];
  return [];
}

function cardtraderPrintToVariant(print: CardSearchResult): CardPrintVariant {
  return {
    key: `${print.setCode ?? "set"}-${print.externalId}`,
    setCode: print.setCode,
    setName: print.setName,
    rarity: print.rarity,
    price: print.price,
    externalId: print.externalId,
    imageUrl: print.imageUrl,
    ygoProDeckUrl: "#",
  };
}

export function getSearchResultVariants(
  result: CardSearchResult,
  gameSlug: string,
  relatedPrints: CardSearchResult[] = []
): CardPrintVariant[] {
  const cardtraderPrints = cardtraderPrintsFromResult(result);
  if (cardtraderPrints.length > 0) {
    return cardtraderPrints.map(cardtraderPrintToVariant);
  }

  if (gameSlug === "yugioh") {
    const sets = ygoSetsFromResult(result);
    const allPrints = [result, ...relatedPrints.filter((p) => p.externalId !== result.externalId)];

    if (sets.length) {
      return sets.map((s) => {
        const matchedPrint =
          findPrintForSet(allPrints, s.set_code, s.set_rarity) ?? result;
        const externalId = matchedPrint.externalId ?? result.externalId;
        const imageSize = pickYgoImageSizeForRarity(s.set_rarity);

        return {
          key: `${s.set_code}-${s.set_rarity}`,
          setCode: s.set_code,
          setName: s.set_name,
          rarity: s.set_rarity,
          price: s.set_price ? parseFloat(s.set_price) : null,
          externalId,
          imageUrl:
            buildYgoImageUrl(externalId, imageSize) ??
            matchedPrint.imageUrl ??
            result.imageUrl,
          ygoProDeckUrl: buildYgoProDeckUrl(result.name, externalId),
        };
      });
    }
  }

  return [
    {
      key: "default",
      setCode: result.setCode,
      setName: result.setName,
      rarity: result.rarity,
      price: result.price,
      externalId: result.externalId,
      imageUrl: result.imageUrl,
      ygoProDeckUrl:
        gameSlug === "yugioh"
          ? buildYgoProDeckUrl(result.name, result.externalId)
          : "#",
    },
  ];
}

export function findVariantForSelection(
  variants: CardPrintVariant[],
  rarity: string,
  setCode?: string | null,
  setName?: string | null
): CardPrintVariant | undefined {
  if (setCode) {
    const exact = variants.find((v) => v.rarity === rarity && v.setCode === setCode);
    if (exact) return exact;
  }
  if (setName) {
    const bySet = variants.find((v) => v.rarity === rarity && v.setName === setName);
    if (bySet) return bySet;
  }
  return variants.find((v) => v.rarity === rarity);
}

export function applyVariant(
  result: CardSearchResult,
  variant: CardPrintVariant
): CardSearchResult {
  return {
    ...result,
    externalId: variant.externalId ?? result.externalId,
    setCode: variant.setCode,
    setName: variant.setName,
    rarity: variant.rarity,
    price: variant.price,
    imageUrl: variant.imageUrl ?? result.imageUrl,
    collectorNumber: variant.setCode ?? result.collectorNumber,
  };
}
