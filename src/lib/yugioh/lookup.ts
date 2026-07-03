import type { CardSearchResult } from "@/features/catalog/services/card-api/types";

export async function fetchYugiohCardByName(name: string): Promise<CardSearchResult | null> {
  const res = await fetch(`/api/cards/search?q=${encodeURIComponent(name)}&game=yugioh`);
  if (!res.ok) return null;
  const json = (await res.json()) as { results?: CardSearchResult[] };
  const results = json.results ?? [];
  const lower = name.toLowerCase();
  return results.find((result) => result.name.toLowerCase() === lower) ?? results[0] ?? null;
}
