import type { DemoOwnedCard } from "@/lib/demo/types";
import { exportCollectionCsv } from "@/features/import/services/export-csv";
import { encodeYdke } from "@/features/import/services/ydke-codec";

export type DeckExportFormat = "decklist" | "ydke" | "ydk" | "csv";

function aggregateCards(cards: DemoOwnedCard[]) {
  const map = new Map<string, { card: DemoOwnedCard["card"]; quantity: number }>();

  for (const owned of cards) {
    const key = owned.card.externalId ?? `${owned.card.name}|${owned.card.collectorNumber ?? ""}`;
    const existing = map.get(key);
    if (existing) {
      existing.quantity += owned.quantity;
      continue;
    }
    map.set(key, { card: owned.card, quantity: owned.quantity });
  }

  return Array.from(map.values());
}

function downloadText(content: string, filename: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function formatDigimonDecklist(items: ReturnType<typeof aggregateCards>): string {
  const lines = ["// DeckList", ""];
  for (const { card, quantity } of items) {
    const code = card.collectorNumber ?? card.setCode ?? card.externalId ?? "UNKNOWN";
    lines.push(`${quantity} ${card.name}   ${code}`);
  }
  return lines.join("\n");
}

function formatYugiohTextDecklist(items: ReturnType<typeof aggregateCards>): string {
  const lines = ["// DeckList", ""];
  for (const { card, quantity } of items) {
    lines.push(`${quantity} ${card.name}`);
  }
  return lines.join("\n");
}

function formatYdk(items: ReturnType<typeof aggregateCards>): string | null {
  const main: string[] = [];
  const extra: string[] = [];
  const side: string[] = [];

  for (const { card, quantity } of items) {
    if (!card.externalId || !/^\d+$/.test(card.externalId)) return null;
    for (let i = 0; i < quantity; i++) {
      main.push(card.externalId.padStart(8, "0"));
    }
  }

  return ["#created by DeckVault", "#main", ...main, "#extra", ...extra, "#side", ...side].join(
    "\n"
  );
}

function formatYdke(items: ReturnType<typeof aggregateCards>): string | null {
  const main: number[] = [];
  for (const { card, quantity } of items) {
    if (!card.externalId || !/^\d+$/.test(card.externalId)) return null;
    const passcode = parseInt(card.externalId, 10);
    for (let i = 0; i < quantity; i++) {
      main.push(passcode);
    }
  }

  return encodeYdke({ main, extra: [], side: [] });
}

export function exportCollectionDecklist(
  cards: DemoOwnedCard[],
  collectionName: string,
  format: DeckExportFormat,
  gameSlug?: string
) {
  const slug = gameSlug ?? cards[0]?.card.gameSlug ?? "yugioh";
  const safeName = collectionName.replace(/\s+/g, "_");
  const items = aggregateCards(cards);

  if (format === "csv") {
    exportCollectionCsv(cards, collectionName);
    return;
  }

  if (format === "ydke") {
    const ydke = formatYdke(items);
    if (!ydke) {
      throw new Error("YDKE export requires Yu-Gi-Oh passcodes (external IDs) on all cards.");
    }
    downloadText(ydke, `${safeName}.ydke.txt`);
    return;
  }

  if (format === "ydk") {
    const ydk = formatYdk(items);
    if (!ydk) {
      throw new Error("YDK export requires Yu-Gi-Oh passcodes (external IDs) on all cards.");
    }
    downloadText(ydk, `${safeName}.ydk`);
    return;
  }

  const content =
    slug === "digimon" || slug === "onepiece"
      ? formatDigimonDecklist(items)
      : formatYugiohTextDecklist(items);

  downloadText(content, `${safeName}_decklist.txt`);
}

export function getAvailableExportFormats(
  cards: DemoOwnedCard[],
  gameSlug?: string
): DeckExportFormat[] {
  const slug = gameSlug ?? cards[0]?.card.gameSlug;
  const formats: DeckExportFormat[] = ["decklist", "csv"];

  if (slug === "yugioh") {
    const items = aggregateCards(cards);
    const allPasscodes = items.every(
      ({ card }) => card.externalId && /^\d+$/.test(card.externalId)
    );
    if (allPasscodes && items.length > 0) {
      formats.splice(1, 0, "ydke", "ydk");
    }
  }

  return formats;
}

export const EXPORT_FORMAT_LABELS: Record<DeckExportFormat, string> = {
  decklist: "Deck List (.txt)",
  ydke: "YDKE",
  ydk: "YDK",
  csv: "CSV",
};
