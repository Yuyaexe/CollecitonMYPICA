import { normalizeYugiohCardName } from "@/lib/yugioh/lookup";
import { buildYgoProDeckUrl } from "@/lib/yugioh/urls";

interface YgoSiteCard {
  id: number;
  name: string;
  pretty_url?: string | null;
}

interface YgoSiteSearchResponse {
  cards?: YgoSiteCard[];
}

export async function resolveYgoProDeckCardUrl(
  name: string,
  externalId?: string | null
): Promise<string> {
  const trimmed = name.trim();
  if (!trimmed) return buildYgoProDeckUrl(name);

  try {
    const params = new URLSearchParams({
      name: trimmed,
      num: "50",
      offset: "0",
    });
    const response = await fetch(
      `https://ygoprodeck.com/api/search/cards.php?${params.toString()}`,
      {
        headers: { "User-Agent": "DeckVault/1.0 (ygoprodeck-url)" },
        next: { revalidate: 86400 },
      }
    );
    if (!response.ok) return buildYgoProDeckUrl(trimmed);

    const payload = (await response.json()) as YgoSiteSearchResponse;
    const cards = payload.cards ?? [];
    const normalizedName = normalizeYugiohCardName(trimmed);
    const passcode = externalId && /^\d+$/.test(externalId) ? Number(externalId) : null;
    const match =
      (passcode != null
        ? cards.find(
            (card) =>
              card.id === passcode &&
              normalizeYugiohCardName(card.name) === normalizedName
          )
        : undefined) ??
      cards.find((card) => normalizeYugiohCardName(card.name) === normalizedName);

    return match?.pretty_url
      ? `https://ygoprodeck.com/card/${match.pretty_url}`
      : buildYgoProDeckUrl(trimmed);
  } catch {
    return buildYgoProDeckUrl(trimmed);
  }
}
